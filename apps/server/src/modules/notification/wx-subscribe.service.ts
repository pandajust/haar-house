import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { buildWxData, WX_TEMPLATES } from './templates/wx-templates';
import { NotificationType } from './types/notification.type';

/**
 * 微信订阅消息发送结果。boolean 表示是否成功，不抛错。
 */
export interface WxSendOutcome {
  success: boolean;
  reason?: string;
}

/**
 * 缓存的微信 access_token。
 *
 * 微信 access_token 有效期 2h（7200s），刷新频次有上限，必须缓存复用。
 * expired=true 表示已过期或尚未获取。
 */
interface WxTokenCache {
  token: string;
  expiresAt: number; // epoch ms
}

/**
 * 微信小程序订阅消息服务。
 *
 * 设计要点：
 *  - 凭证（WX_APPID/WX_SECRET）未配置时走 mock 路径，返回 fake success
 *  - access_token 用内存缓存，2h 过期；并发请求命中同一缓存
 *  - 任何调用失败（access_token 获取失败 / 用户未订阅 / 网络异常）都返回
 *    success=false，由上层（NotificationService）决定是否回退短信
 *  - 使用 Node 18+ 内置 fetch，不引入额外依赖
 *
 * 接口参考：
 *  - gettoken: https://developers.weixin.qq.com/miniprogram/dev/OpenApiDocs/
 *              cgi-bin/gettoken.html
 *  - sendSubscribeMsg: ... OpenApiDocs/cgi-bin/message/subscribe/send.html
 */
@Injectable()
export class WxSubscribeService {
  private readonly logger = new Logger(WxSubscribeService.name);

  private readonly appid: string | undefined;
  private readonly secret: string | undefined;

  /** access_token 缓存；进程内 Map，重启即失效（M1 不接 Redis） */
  private tokenCache: WxTokenCache | null = null;

  /** 提前 5 分钟过期，避免边界期请求失败 */
  private readonly tokenSkewMs = 5 * 60 * 1000;

  private readonly tokenEndpoint = 'https://api.weixin.qq.com/cgi-bin/token';
  private readonly sendEndpoint = 'https://api.weixin.qq.com/cgi-bin/message/subscribe/send';

  constructor(config: ConfigService) {
    this.appid = config.get<string>('WX_APPID');
    this.secret = config.get<string>('WX_SECRET');
  }

  /**
   * 凭证是否已配置。
   */
  isConfigured(): boolean {
    return !!(this.appid && this.secret);
  }

  /**
   * 发送订阅消息。
   *
   * - 凭证未配置 → fake success（dev/test 模式）
   * - access_token 获取失败 → success=false，reason='token_fetch_failed'
   * - 微信 sendSubscribeMsg 失败（errcode!=0，如用户未订阅）→ success=false
   * - 任何异常都降级为 false，不抛错
   */
  async send(
    openid: string,
    type: NotificationType,
    payload: Record<string, unknown>,
  ): Promise<WxSendOutcome> {
    if (!this.isConfigured()) {
      this.logger.debug(
        `[mock] 微信订阅消息发送 type=${type} openid=${maskOpenid(openid)} payload=${JSON.stringify(payload)}`,
      );
      return { success: true, reason: 'mock_mode' };
    }

    try {
      const token = await this.getAccessToken();
      if (!token) {
        // access_token 获取失败：上层会回退短信
        return { success: false, reason: 'token_fetch_failed' };
      }

      const outcome = await this.invokeSendApi(token, openid, type, payload);
      if (!outcome.success) {
        this.logger.warn(
          `微信订阅消息发送失败 openid=${maskOpenid(openid)} type=${type} reason=${outcome.reason}`,
        );
      }
      return outcome;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `微信订阅消息发送异常 openid=${maskOpenid(openid)} type=${type} err=${msg}`,
      );
      return { success: false, reason: 'send_exception' };
    }
  }

  /**
   * 获取 access_token（带缓存）。
   *
   * 缓存命中且未过期 → 直接返回
   * 缓存过期或不存在 → 调用微信 cgi-bin/token 获取并缓存
   * 获取失败 → 返回 null（记 warn，不抛错）
   */
  async getAccessToken(): Promise<string | null> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt - this.tokenSkewMs > now) {
      return this.tokenCache.token;
    }

    try {
      const url = `${this.tokenEndpoint}?grant_type=client_credential&appid=${this.appid}&secret=${this.secret}`;
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) {
        this.logger.warn(`access_token http 失败 status=${res.status}`);
        return null;
      }
      const body = (await res.json()) as {
        access_token?: string;
        expires_in?: number;
        errcode?: number;
        errmsg?: string;
      };

      if (!body.access_token || body.errcode) {
        this.logger.warn(
          `access_token 业务失败 errcode=${body.errcode} errmsg=${body.errmsg}`,
        );
        return null;
      }

      const expiresInMs = (body.expires_in ?? 7200) * 1000;
      this.tokenCache = {
        token: body.access_token,
        expiresAt: now + expiresInMs,
      };
      return this.tokenCache.token;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`access_token 获取异常 err=${msg}`);
      return null;
    }
  }

  /**
   * 实际调用 sendSubscribeMsg。
   */
  private async invokeSendApi(
    token: string,
    openid: string,
    type: NotificationType,
    payload: Record<string, unknown>,
  ): Promise<WxSendOutcome> {
    const template = WX_TEMPLATES[type];
    const data = buildWxData(type, payload);

    const url = `${this.sendEndpoint}?access_token=${token}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        touser: openid,
        template_id: template.templateId,
        data,
        // 小程序页面跳转；空字符串表示不跳转
        page: 'pages/index/index',
        miniprogram_state: 'formal',
        lang: 'zh_CN',
      }),
    });

    if (!res.ok) {
      return { success: false, reason: `http_${res.status}` };
    }

    const body = (await res.json()) as { errcode?: number; errmsg?: string };
    // errcode=0 表示成功；其它如 43101（用户未订阅）也归为失败
    if (body.errcode !== 0) {
      return {
        success: false,
        reason: `wx_errcode_${body.errcode ?? 'unknown'}`,
      };
    }
    return { success: true };
  }

  /**
   * 测试用：强制清除 access_token 缓存。
   * 生产环境仅在 access_token 失效（如 errcode=40001）时调用。
   */
  invalidateToken(): void {
    this.tokenCache = null;
  }
}

/**
 * openid 脱敏：保留前 6 位与后 4 位，避免日志泄露完整 openid。
 */
function maskOpenid(openid: string): string {
  if (openid.length < 10) return '***';
  return `${openid.slice(0, 6)}***${openid.slice(-4)}`;
}
