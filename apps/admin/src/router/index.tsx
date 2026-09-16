import { DashboardOutlined } from '@ant-design/icons';
import type { MenuDataItem } from '@ant-design/pro-components';

export { default as RequireAuth } from './RequireAuth';
export { routes } from './routes';

/**
 * 侧边栏菜单元数据（与 routes.tsx 中的路径保持一致）
 * BasicLayout 读取此配置渲染 ProLayout 菜单
 */
export const menuRoutes: MenuDataItem[] = [
  {
    path: '/dashboard',
    name: '工作台',
    icon: <DashboardOutlined />,
  },
];
