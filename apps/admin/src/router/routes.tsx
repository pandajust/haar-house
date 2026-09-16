import { Navigate, type RouteObject } from 'react-router-dom';

import BasicLayout from '@/layouts/BasicLayout';
import BlankLayout from '@/layouts/BlankLayout';
import NotFound from '@/pages/404';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';

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
