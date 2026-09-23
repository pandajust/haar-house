import { create } from 'zustand';

import { clearTokens, getAccessToken, setTokens } from '@/utils/auth';
import request from '@/utils/request';

export interface UserInfo {
  id: string;
  username: string;
  role?: string;
  // 兼容后端后续可能扩展的字段
  [key: string]: unknown;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: UserInfo;
}

interface UserState {
  user: UserInfo | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  setUser: (user: UserInfo | null) => void;
}

const DEV_MOCK = import.meta.env.VITE_DEV_MOCK_LOGIN !== 'false' && import.meta.env.DEV === true;

/**
 * 用户状态（zustand）
 * - login：调 POST /api/v1/auth/login，存 token 并写入 user
 * - fetchMe：调 GET /api/v1/auth/me 刷新当前用户信息
 * - logout：清 token + 清 user
 */
export const useUserStore = create<UserState>((set) => ({
  user: null,
  loading: false,
  login: async (username, password) => {
    set({ loading: true });
    try {
      // 调试期 mock：DEV 环境下 admin / admin(或 admin123) 直接返回虚拟 token，绕过后端
      // 联调时走真实请求：request.post<LoginResponse>('/auth/login', { username, password })
      let data: LoginResponse;
      if (
        DEV_MOCK &&
        username === 'admin' &&
        (password === 'admin' || password === 'admin123')
      ) {
        data = {
          access_token: 'mock-access-token-' + Date.now(),
          refresh_token: 'mock-refresh-token-' + Date.now(),
          user: { id: '1', username, role: 'owner' },
        };
      } else {
        const res = await request.post<LoginResponse>('/auth/login', {
          username,
          password,
        });
        data = res.data;
      }
      setTokens(data.access_token, data.refresh_token);
      set({ user: data.user, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },
  logout: () => {
    clearTokens();
    set({ user: null });
  },
  fetchMe: async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const res = await request.get<UserInfo>('/auth/me');
      set({ user: res.data });
    } catch (err) {
      clearTokens();
      set({ user: null });
      throw err;
    }
  },
  setUser: (user) => set({ user }),
}));