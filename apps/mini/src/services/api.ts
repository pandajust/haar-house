import type { ClientInfo } from '@/store/user';
import { request } from '@/utils/request';

/**
 * 后端 API 契约定义。
 * 后端默认地址 http://localhost:3000，开发期 project.config.json 关闭域名校验。
 */

export interface WxLoginRequest {
  code: string;
}

export interface WxLoginResponse {
  access_token: string;
  refresh_token: string;
  client: ClientInfo;
}

export interface ClientProfile extends ClientInfo {
  phone?: string;
  gender?: 'male' | 'female' | 'unknown';
}

/**
 * 微信登录：POST /api/v1/auth/wx-login
 * body: { code: string }
 * 返回: { access_token, refresh_token, client: { id, name, avatar } }
 *
 * 注意：登录接口本身不携带 Authorization（skipAuth=true），
 * 否则会因为无 token 触发 ensureLogin → 死循环。
 */
export function wxLoginApi(payload: WxLoginRequest): Promise<WxLoginResponse> {
  return request<WxLoginResponse>({
    url: '/api/v1/auth/wx-login',
    method: 'POST',
    data: payload,
    skipAuth: true,
  });
}

/**
 * 获取当前登录用户：GET /api/v1/auth/me
 */
export function getMe(): Promise<ClientProfile> {
  return request<ClientProfile>({
    url: '/api/v1/auth/me',
    method: 'GET',
  });
}
