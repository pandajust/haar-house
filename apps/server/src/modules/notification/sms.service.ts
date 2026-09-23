import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

import { NotificationType } from './types/notification.type';
import { pickSmsParams, SMS_TEMPLATES } from './templates/sms-templates';

/**
 * 短信发送结果。boolean 表示是否成功送达，不抛错。
 */
export interface SmsSendOutcome {
  success: boolean;
  reason?: string;
}

/**
 * 阿里云短信服务（dysmsapi 2017-05-25）。
 *
 * 设计要点：
 *  - 凭证（ALIYUN_SMS_ACCESS_KEY_ID/SECRET/SIGN_NAME）未配置时走 mock 路径，
 *    返回 fake success 便于 dev/test 跑通流程
 *  - 模板 templateCode 在 SMS_TEMPLATES 中维护，业务方拿到真实模板 ID 后替换
 *  - 任何外部调用失败（网络/签名/阿里云业务码）都捕获并返回 success=false，
 *    上层（NotificationService）只负责记日志、不向调用方抛错
 *  - 实际 OpenAPI 调用使用 Node 内置 fetch（Node 18+），无需引入 axios 依赖
 *
 * 签名实现按阿里云 RPC 风格 HMAC-SHA1 编码，符合官方文档：
 * https://help.aliyun.com/document_detail/101343.html
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  private readonly accessKeyId: string | undefined;
  private readonly accessKeySecret: string | undefined;
  private readonly signName: string | undefined;

  /** 阿里云短信 OpenAPI endpoint */
  private readonly endpoint = 'https://dysmsapi.aliyuncs.com';

  constructor(config: ConfigService) {
    this.accessKeyId = config.get<string>('ALIYUN_SMS_ACCESS_KEY_ID');
    this.accessKeySecret = config.get<string>('ALIYUN_SMS_ACCESS_KEY_SECRET');
    this.signName = config.get<string>('ALIYUN_SMS_SIGN_NAME');
  }

  /**
   * 凭证是否已配置。任一字段为空则视为未配置，走 mock 路径。
   */
  isConfigured(): boolean {
    return !!(this.accessKeyId && this.accessKeySecret && this.signName);
  }

  /**
   * 发送短信。
   *
   * - 凭证未配置 → 返回 fake success（dev/test 模式）
   * - 凭证已配置但调用失败 → 返回 success=false，仅记日志，不抛错
   * - 成功 → 返回 success=true
   *
   * @param phone 接收手机号（11 位）
   * @param type 通知类型，决定使用哪个短信模板
   * @param payload 模板变量数据
   */
  async send(
    phone: string,
    type: NotificationType,
    payload: Record<string, unknown>,
  ): Promise<SmsSendOutcome> {
    if (!this.isConfigured()) {
      // dev/test 模式：凭证缺失，假装成功以不阻塞业务流程
      this.logger.debug(
        `[mock] 短信发送 type=${type} phone=${maskPhone(phone)} payload=${JSON.stringify(payload)}`,
      );
      return { success: true, reason: 'mock_mode' };
    }

    try {
      const outcome = await this.invokeAliyunApi(phone, type, payload);
      if (!outcome.success) {
        this.logger.warn(
          `阿里云短信发送失败 phone=${maskPhone(phone)} type=${type} reason=${outcome.reason}`,
        );
      }
      return outcome;
    } catch (err) {
      // 任何未预期错误都降级为 false，不向调用方抛错
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `阿里云短信发送异常 phone=${maskPhone(phone)} type=${type} err=${msg}`,
      );
      return { success: false, reason: 'send_exception' };
    }
  }

  /**
   * 实际调用阿里云 dysmsapi SendSms 接口。
   *
   * 失败情形（返回 success=false，不抛错）：
   *  - HTTP 请求失败（网络/超时）
   *  - HTTP 状态码非 2xx
   *  - 阿里云返回的 Code 字段非 OK（如 isv.BUSINESS_LIMIT_CONTROL 限流）
   *
   * 抛错情形（仅由 send() 兜底捕获，调用方不可见）：
   *  - 签名阶段未知异常
   */
  private async invokeAliyunApi(
    phone: string,
    type: NotificationType,
    payload: Record<string, unknown>,
  ): Promise<SmsSendOutcome> {
    const template = SMS_TEMPLATES[type];
    const params = pickSmsParams(type, payload);

    const query: Record<string, string> = {
      PhoneNumbers: phone,
      SignName: this.signName as string,
      TemplateCode: template.templateCode,
      TemplateParam: JSON.stringify(params),
      Action: 'SendSms',
      Version: '2017-05-25',
      Format: 'JSON',
      SignatureMethod: 'HMAC-SHA1',
      SignatureVersion: '1.0',
      SignatureNonce: randomUUID(),
      Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      AccessKeyId: this.accessKeyId as string,
      // 回退用 RegionId：杭州
      RegionId: 'cn-hangzhou',
    };

    const signedQuery = this.signRequest(query);
    const url = `${this.endpoint}/?${signedQuery}`;

    // 控制器侧不直接 mock fetch，但 Node 18+ 全局可用
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      return {
        success: false,
        reason: `http_${res.status}`,
      };
    }

    const body = (await res.json()) as { Code?: string; Message?: string };
    if (body.Code !== 'OK') {
      return {
        success: false,
        reason: `aliyun_${body.Code ?? 'unknown'}`,
      };
    }
    return { success: true };
  }

  /**
   * 计算阿里云 RPC 签名：HMAC-SHA1 + base64。
   *
   * 步骤：
   *  1. 对每个 param 的 value 做 RFC3986 percent-encode
   *  2. 按 key 字典序排序后拼成 query string
   *  3. 待签名串 = `GET&${percentEncode('/')}&${percentEncode(query)}`
   *  4. key = `${accessKeySecret}&`
   *  5. signature = base64(hmac-sha1(key, stringToSign))
   *  6. 最终 url 把 Signature 加入 query 一起发送
   */
  private signRequest(params: Record<string, string>): string {
    const enc = (s: string): string =>
      encodeURIComponent(s)
        .replace(/!/g, '%21')
        .replace(/'/g, '%27')
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29')
        .replace(/\*/g, '%2A');

    const sortedKeys = Object.keys(params).sort();
    const canonical = sortedKeys
      .map((k) => `${enc(k)}=${enc(params[k])}`)
      .join('&');

    const stringToSign = `GET&${enc('/')}&${enc(canonical)}`;
    const signingKey = `${this.accessKeySecret as string}&`;

    const hmac = this.createHmacSha1(signingKey, stringToSign);
    const signature = hmac.toString('base64');

    const allQuery = { ...params, Signature: signature };
    return Object.entries(allQuery)
      .map(([k, v]) => `${enc(k)}=${enc(v)}`)
      .join('&');
  }

  /**
   * 使用 node:crypto 实现 HMAC-SHA1，避免直接依赖 crypto 模块顶层 API。
   * 包装一层便于单测 mock。
   */
  private createHmacSha1(key: string, data: string): Buffer {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createHmac } = require('node:crypto') as {
      createHmac: (alg: string, key: string) => {
        update: (data: string) => { digest: () => Buffer };
      };
    };
    return createHmac('sha1', key).update(data).digest();
  }
}

/**
 * 手机号脱敏：保留前 3 位与后 4 位，中间用 **** 替换，便于日志排查不泄漏。
 */
function maskPhone(phone: string): string {
  if (phone.length < 7) return '***';
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}
