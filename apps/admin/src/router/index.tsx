import {
  CalendarOutlined,
  DashboardOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
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
  {
    path: '/clients',
    name: '客户管理',
    icon: <TeamOutlined />,
  },
  {
    path: '/appointments',
    name: '预约管理',
    icon: <CalendarOutlined />,
  },
  {
    path: '/orders',
    name: '收银开单',
    icon: <ShoppingCartOutlined />,
  },
  {
    path: '/staff-schedule',
    name: '员工排班',
    icon: <UserOutlined />,
  },
];