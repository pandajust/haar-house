import { PageContainer, ProLayout, type MenuDataItem } from '@ant-design/pro-components';
import type { ReactNode } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { menuRoutes } from '@/router';

interface BasicLayoutProps {
  children?: ReactNode;
}

/**
 * 主布局：ProLayout 侧边栏 + 顶栏 + Outlet 渲染子路由
 * 路径切换通过 react-router 的 useNavigate 完成（避免 a 标签整页刷新）
 */
export default function BasicLayout({ children }: BasicLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <ProLayout
      title="理发店管理后台"
      layout="mix"
      fixedHeader
      fixSiderbar
      location={{ pathname: location.pathname }}
      route={{
        path: '/',
        routes: menuRoutes,
      }}
      menuItemRender={(item: MenuDataItem, defaultDom: ReactNode) => {
        if (!item.path || /^https?:\/\//.test(item.path)) {
          return defaultDom;
        }
        return (
          <div
            onClick={() => {
              navigate(item.path as string);
            }}
            style={{ cursor: 'pointer' }}
          >
            {defaultDom}
          </div>
        );
      }}
    >
      {children ?? (
        <PageContainer>
          <Outlet />
        </PageContainer>
      )}
    </ProLayout>
  );
}
