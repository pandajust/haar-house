import Taro from '@tarojs/taro';

import { useUserStore } from '@/store/user';

import { ensureLogin, refreshAccessToken } from './auth';

const BASE_URL = 'http://localhost:3000';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestOptions {
  url: string;
  method?: HttpMethod;
  data?: Record<string, unknown> | unknown;
  header?: Record<string, string>;
  /** 内部重试标记，避免 401 刷新后无限递归 */
  retry?: boolean;
  /** 是否跳过自动 token 注入（如登录接口本身） */
  skipAuth?: boolean;
}

/**
 * 全局请求封装：
 *  - 自动注入 Authorization: Bearer <token>
 *  - 401 时静默刷新（refresh 失败则回退 wx.login → /auth/wx-login）并重试一次
 *  - 网络异常、非 2xx 统一抛错
 */
export async function request<T = unknown>(options: RequestOptions): Promise<T> {
  const { url, method = 'GET', data, header = {}, retry = false, skipAuth = false } = options;

  const finalHeader: Record<string, string> = {
    'Content-Type': 'application/json',
    ...header,
  };

  if (!skipAuth) {
    let accessToken = useUserStore.getState().accessToken;
    if (!accessToken) {
      await ensureLogin();
      accessToken = useUserStore.getState().accessToken;
    }
    if (accessToken) {
      finalHeader.Authorization = `Bearer ${accessToken}`;
    }
  }

  let res;
  try {
    res = await Taro.request({
      url: url.startsWith('http') ? url : `${BASE_URL}${url}`,
      method,
      data,
      header: finalHeader,
    });
  } catch (err) {
    throw new Error(`网络请求失败: ${(err as Error).message}`);
  }

  // 401 → 静默刷新并重试一次
  if (res.statusCode === 401 && !retry && !skipAuth) {
    await refreshAccessToken();
    return request<T>({ ...options, retry: true });
  }

  if (res.statusCode < 200 || res.statusCode >= 300) {
    const msg = typeof res.data === 'string' ? res.data : JSON.stringify(res.data ?? {});
    throw new Error(`请求失败 [${res.statusCode}]: ${msg}`);
  }

  return res.data as T;
}
