/**
 * Token 存取工具（localStorage 持久化）
 * 仅处理 token 字符串，业务侧通过 store/user.ts 调用
 */

const ACCESS_TOKEN_KEY = 'hair_admin_access_token';
const REFRESH_TOKEN_KEY = 'hair_admin_refresh_token';

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setTokens(accessToken: string, refreshToken?: string): void {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  } catch {
    // localStorage 不可用时静默失败，store 层会重新走登录流程
  }
}

export function clearTokens(): void {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // ignore
  }
}
