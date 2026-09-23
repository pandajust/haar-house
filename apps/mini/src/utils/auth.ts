import Taro from '@tarojs/taro';

import { wxLoginApi } from '@/services/api';
import { useUserStore } from '@/store/user';

const BASE_URL = 'http://localhost:3000';

let loginPromise: Promise<string | null> | null = null;

/**
 * 调用 wx.login 获取 code（仅在小程序端可用；H5 端抛错以便上层降级）。
 */
export async function wxLogin(): Promise<string> {
  const res = await Taro.login();
  if (!res.code) {
    throw new Error('wx.login 未返回 code');
  }
  return res.code;
}

/**
 * 静默刷新 token：当后端 refresh 接口可用时走 refresh；
 * 失败或无 refresh_token 时回退到完整的 wx.login → /auth/wx-login 流程。
 */
export async function refreshAccessToken(): Promise<string | null> {
  const store = useUserStore.getState();
  const refreshToken = store.refreshToken;

  if (refreshToken) {
    try {
      const res = await Taro.request({
        url: `${BASE_URL}/api/auth/refresh`,
        method: 'POST',
        data: { refresh_token: refreshToken },
        header: { 'Content-Type': 'application/json' },
      });
      if (
        res.statusCode === 200 &&
        res.data &&
        typeof res.data === 'object' &&
        (res.data as { access_token?: string }).access_token
      ) {
        const data = res.data as {
          access_token: string;
          refresh_token?: string;
        };
        store.setAuth({
          accessToken: data.access_token,
          refreshToken: data.refresh_token ?? refreshToken,
        });
        return data.access_token;
      }
    } catch (err) {
      console.warn('[auth] refresh failed, fallback to wx.login', err);
    }
  }

  // 回退：完整 wx.login 流程
  return ensureLogin();
}

/**
 * 确保已登录：无 accessToken 时自动调用 wx.login + 后端 /auth/wx-login 换 JWT。
 * 并发调用会被合并为同一次 promise。
 */
export async function ensureLogin(): Promise<string | null> {
  const store = useUserStore.getState();
  if (store.accessToken) {
    return store.accessToken;
  }

  if (loginPromise) {
    return loginPromise;
  }

  loginPromise = (async () => {
    try {
      const code = await wxLogin();
      const res = await wxLoginApi({ code });
      useUserStore.getState().setAuth({
        accessToken: res.access_token,
        refreshToken: res.refresh_token,
      });
      if (res.client) {
        useUserStore.getState().setClient(res.client);
      }
      return res.access_token;
    } catch (err) {
      console.error('[ensureLogin] failed', err);
      return null;
    } finally {
      loginPromise = null;
    }
  })();

  return loginPromise;
}
