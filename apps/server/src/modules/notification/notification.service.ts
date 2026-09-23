import { Injectable, Logger } from '@nestjs/common';

import { SmsService } from './sms.service';
import { WxSubscribeService } from './wx-subscribe.service';
import { NotificationProcessor } from './queue/notification.processor';
import { Channel } from './types/channel.type';
import {
  NotificationResult,
  NotificationType,
} from './types/notification.type';

/**
 * 通知门面服务：业务层唯一对外入口。
 *
 * 内部 API：
 *  - notify(clientId, type, payload, channel='auto')：客户端维度入口
 *  - notifyPhone(phone, type, payload)：仅用短信
 *  - notifyOpenid(openid, type, payload)：仅用微信订阅消息
 *  - notifyAuto(phone?, openid?, type, payload)：自动降级
 *
 * 失败降级策略（遵循 spec 失败处理不变式）：
 *  1. channel='auto'，openid 存在 → 先尝试 wx_subscribe
 *  2. wx 失败（含 access_token 获取失败、用户未订阅） → 回退 sms（若有 phone）
 *  3. sms 失败（凭证未配置之外的真实失败） → 仅记日志，返回 success=false
 *  4. 不向调用方抛错，任何通道异常都被内部吸收
 *
 * 客户端 ID → 联系方式 解析在 M1 暂未接入 Prisma，notify(clientId) 会
 * 直接返回 fallback_reason='contact_resolver_not_implemented'，
 * 业务方在 T7 接入 Prisma 后通过 ClientContactResolver 注入补全。
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly sms: SmsService,
    private readonly wx: WxSubscribeService,
    private readonly processor: NotificationProcessor,
  ) {}

  /**
   * 客户端维度发送入口。
   *
   * M1 阶段：clientId → {phone, openid} 的解析需要 Prisma（T7 落地），
   * 此处返回 not_implemented，不阻塞业务，调用方应改用 notifyPhone/notifyOpenid。
   *
   * 后续 T7：注入 ClientContactResolver，调用方仍用 clientId，service 内部解析。
   */
  async notify(
    clientId: string,
    type: NotificationType,
    _payload: Record<string, unknown>,
    _channel: Channel = 'auto',
  ): Promise<NotificationResult> {
    this.logger.warn(
      `notify(clientId=${clientId}, type=${type}) M1 暂未接入 Prisma 客户端联系方式解析，请改用 notifyPhone/notifyOpenid`,
    );
    return {
      success: false,
      channel_used: 'none',
      fallback_reason: 'contact_resolver_not_implemented',
    };
  }

  /**
   * 仅走短信通道。
   */
  async notifyPhone(
    phone: string,
    type: NotificationType,
    payload: Record<string, unknown>,
  ): Promise<NotificationResult> {
    const outcome = await this.sms.send(phone, type, payload);
    if (!outcome.success) {
      // 仅记日志，不抛错
      this.logger.warn(
        `notifyPhone 短信通道失败 type=${type} reason=${outcome.reason}`,
      );
    }
    return {
      success: outcome.success,
      channel_used: outcome.success ? 'sms' : 'none',
      fallback_reason: outcome.success ? undefined : outcome.reason,
    };
  }

  /**
   * 仅走微信订阅消息通道。
   */
  async notifyOpenid(
    openid: string,
    type: NotificationType,
    payload: Record<string, unknown>,
  ): Promise<NotificationResult> {
    const outcome = await this.wx.send(openid, type, payload);
    if (!outcome.success) {
      this.logger.warn(
        `notifyOpenid 微信通道失败 type=${type} reason=${outcome.reason}`,
      );
    }
    return {
      success: outcome.success,
      channel_used: outcome.success ? 'wx_subscribe' : 'none',
      fallback_reason: outcome.success ? undefined : outcome.reason,
    };
  }

  /**
   * 自动降级通道：openid 存在时优先 wx_subscribe，失败回退 sms。
   *
   * 路径：
   *  - openid 缺失 → 直接走 sms
   *  - openid 存在 → 先 wx，wx 成功即返回
   *  - wx 失败 → 若 phone 存在则回退 sms，否则失败
   *  - sms 也失败 → 仅记日志，返回 success=false
   */
  async notifyAuto(
    type: NotificationType,
    payload: Record<string, unknown>,
    options: { phone?: string; openid?: string },
  ): Promise<NotificationResult> {
    const { phone, openid } = options;

    // 有 openid 时优先微信订阅消息
    if (openid) {
      const wxOutcome = await this.wx.send(openid, type, payload);
      if (wxOutcome.success) {
        return {
          success: true,
          channel_used: 'wx_subscribe',
        };
      }
      this.logger.warn(
        `notifyAuto 微信通道失败，尝试回退短信 type=${type} reason=${wxOutcome.reason}`,
      );
      if (!phone) {
        return {
          success: false,
          channel_used: 'none',
          fallback_reason: `wx_failed_and_no_phone (${wxOutcome.reason ?? 'unknown'})`,
        };
      }
    }

    // 回退短信或唯一走短信
    if (phone) {
      const smsOutcome = await this.sms.send(phone, type, payload);
      if (smsOutcome.success) {
        return {
          success: true,
          channel_used: 'sms',
          // 标记是否经历了降级路径
          fallback_reason: openid ? 'wx_failed_fallback_to_sms' : undefined,
        };
      }
      this.logger.warn(
        `notifyAuto 短信通道也失败 type=${type} reason=${smsOutcome.reason}（仅记日志不抛错）`,
      );
      return {
        success: false,
        channel_used: 'none',
        fallback_reason: `sms_failed (${smsOutcome.reason ?? 'unknown'})`,
      };
    }

    // 既无 phone 也无 openid：无可送达通道
    return {
      success: false,
      channel_used: 'none',
      fallback_reason: 'no_contact_info',
    };
  }

  /**
   * 异步入队：业务调用方不需关心发送结果时使用，
   * 任务在 setImmediate 中执行，失败仅记 warn。
   */
  enqueueAuto(
    type: NotificationType,
    payload: Record<string, unknown>,
    options: { phone?: string; openid?: string },
  ): void {
    this.processor.enqueue({
      source: 'enqueueAuto',
      exec: () =>
        this.notifyAuto(type, payload, options).then((r) => {
          if (!r.success) {
            this.logger.warn(
              `异步通知任务最终失败 type=${type} reason=${r.fallback_reason}`,
            );
          }
        }),
    });
  }
}
