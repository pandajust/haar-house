import { Navigate, type RouteObject } from 'react-router-dom';

import BasicLayout from '@/layouts/BasicLayout';
import BlankLayout from '@/layouts/BlankLayout';
import NotFound from '@/pages/404';
import Appointments from '@/pages/Appointments';
import Clients from '@/pages/Clients';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import Orders from '@/pages/Orders';
import StaffSchedule from '@/pages/StaffSchedule';

import RequireAuth from './RequireAuth';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: (
      <RequireAuth>
        <BasicLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'clients', element: <Clients /> },
      { path: 'appointments', element: <Appointments /> },
      { path: 'orders', element: <Orders /> },
      { path: 'staff-schedule', element: <StaffSchedule /> },
    ],
  },
  {
    path: '/login',
    element: (
      <BlankLayout>
        <Login />
      </BlankLayout>
    ),
  },
  {
    path: '*',
    element: <NotFound />,
  },
];