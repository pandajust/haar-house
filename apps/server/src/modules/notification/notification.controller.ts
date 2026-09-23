import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';

import { NotificationService } from './notification.service';
import { NotificationType } from './types/notification.type';

/**
 * 调试端点 body schema。
 *
 * {phone?, openid?, type, payload}
 * - phone / openid 至少一个；两个都给可触发自动降级
 * - type 是 NotificationType 枚举值
 * - payload 是模板变量数据
 *
 * 使用 .refine 强制 phone/openid 至少一个，避免在 service 层兜底。
 */
const notifyTestShape = {
  phone: z.string().min(5).max(20).optional(),
  openid: z.string().min(8).max(64).optional(),
  type: z.nativeEnum(NotificationType),
  payload: z.record(z.string(), z.unknown()),
};

export const notifyTestSchema = z
  .object(notifyTestShape)
  .strict()
  .refine((v) => v.phone || v.openid, {
    message: 'phone 与 openid 至少传一个',
    path: ['phone'],
  });

export type NotifyTestDto = z.infer<typeof notifyTestSchema>;

/**
 * 通知调试端点。
 *
 * 路径：POST /api/notify/test
 *
 * 仅 admin 可调用，M1 阶段 AuthModule 由并行 agent 落地，
 * 暂用注释占位标记 @Roles('admin') 等接入 Guard 后即可生效：
 *   // @Roles('admin')
 *   // @UseGuards(RolesGuard)
 *
 * 行为：
 *  - 同时传入 openid 与 phone → 走 notifyAuto 触发降级链路
 *  - 仅传 phone → 走 notifyPhone（短信）
 *  - 仅传 openid → 走 notifyOpenid（微信订阅消息）
 *  - 都不传 → 400 由 zod schema 拦截（这里补一条 service 层 fallback）
 *
 * 返回 {success, channel_used, fallback_reason?}（被 TransformInterceptor 包装）。
 */
@ApiTags('notification')
@Controller('notify')
export class NotificationController {
  constructor(private readonly notification: NotificationService) {}

  @Post('test')
  @HttpCode(200)
  @ApiOperation({
    summary: '通知调试端点（admin）',
    description:
      '触发一次真实通知发送：phone + openid 同时给则走 auto 降级链路；任一通道失败仅记日志不抛错',
  })
  // TODO(T8 接入 AuthModule 后启用): @Roles('admin')
  // TODO(T8 接入 AuthModule 后启用): @UseGuards(RolesGuard)
  async testNotify(
    @Body(new ZodValidationPipe(notifyTestSchema)) dto: NotifyTestDto,
  ) {
    const { phone, openid, type, payload } = dto;

    if (!phone && !openid) {
      // schema 已强制 phone/openid 至少一个可选，此处仅兜底（防御）
      return {
        success: false,
        channel_used: 'none',
        fallback_reason: 'no_contact_info',
      };
    }

    let result;
    if (phone && openid) {
      result = await this.notification.notifyAuto(type, payload, {
        phone,
        openid,
      });
    } else if (phone) {
      result = await this.notification.notifyPhone(phone, type, payload);
    } else {
      result = await this.notification.notifyOpenid(
        openid as string,
        type,
        payload,
      );
    }

    return result;
  }
}
