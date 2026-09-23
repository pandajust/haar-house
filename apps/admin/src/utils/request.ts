import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

import { clearTokens, getAccessToken } from './auth';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
const apiPrefix = import.meta.env.VITE_API_PREFIX ?? '/api';

const instance: AxiosInstance = axios.create({
  baseURL: `${baseURL}${apiPrefix}`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

instance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearTokens();
      // 不在拦截器里直接耦合路由，而是通过整页跳转触发 RequireAuth 重新判定
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        const from = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?from=${from}`;
      }
    }
    return Promise.reject(error);
  },
);

export default instance;
