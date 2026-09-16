import { create } from 'zustand';

export interface ClientInfo {
  id: string;
  name: string;
  avatar?: string;
}

interface UserState {
  accessToken: string | null;
  refreshToken: string | null;
  client: ClientInfo | null;
  setAuth: (payload: { accessToken: string; refreshToken: string }) => void;
  setClient: (client: ClientInfo) => void;
  clear: () => void;
}

/**
 * 全局登录态 store（zustand，小程序 + H5 通用）。
 * 通过 useUserStore.getState() 在请求拦截层读写 token，
 * 通过 useUserStore(s => s.client) 在组件层订阅用户信息。
 */
export const useUserStore = create<UserState>((set) => ({
  accessToken: null,
  refreshToken: null,
  client: null,
  setAuth: (payload) =>
    set({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
    }),
  setClient: (client) => set({ client }),
  clear: () => set({ accessToken: null, refreshToken: null, client: null }),
}));
