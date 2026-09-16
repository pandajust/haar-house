import { type ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useUserStore } from '@/store/user';
import { getAccessToken } from '@/utils/auth';

interface RequireAuthProps {
  children: ReactNode;
}

/**
 * 路由守卫：无 token 跳 /login；有 token 异步拉取当前用户信息
 */
export default function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation();
  const token = getAccessToken();
  const fetchMe = useUserStore((state) => state.fetchMe);
  const user = useUserStore((state) => state.user);

  useEffect(() => {
    if (token && !user) {
      // 后端契约：GET /api/v1/auth/me 返回当前用户
      // 失败时 store 内部会清 token；此处忽略 error，下次渲染会跳 /login
      void fetchMe().catch(() => undefined);
    }
  }, [token, user, fetchMe]);

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
