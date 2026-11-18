import { lazy } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';

import { RouteErrorPage } from '@/components/common/ErrorBoundary/RouteErrorPage';
import { GuestRoute } from '@/features/auth/components/GuestRoute';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { PERMISSIONS, ROUTES } from '@/utils/constants';

import { AuthLayout } from './layouts/AuthLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { MainLayout } from './layouts/MainLayout';

// Each page is its own chunk, downloaded on first visit.
const LoginPage = lazy(() =>
  import('@/features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('@/features/auth/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const ActivityLogPage = lazy(() =>
  import('@/features/dashboard/pages/ActivityLogPage').then((m) => ({
    default: m.ActivityLogPage,
  })),
);
const ProfilePage = lazy(() =>
  import('@/features/profile/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const NotFoundPage = lazy(() =>
  import('./pages/StatusPage').then((m) => ({ default: m.NotFoundPage })),
);
const UnauthorizedPage = lazy(() =>
  import('./pages/StatusPage').then((m) => ({ default: m.UnauthorizedPage })),
);

/**
 * Route guards decide what to render; they do not secure data. The backend checks the session and
 * the specific permission on every API call.
 */
export const routes: RouteObject[] = [
  {
    element: <MainLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Navigate to={ROUTES.dashboard} replace /> },

      // Authentication routes: only for signed-out users.
      {
        element: <GuestRoute />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              { path: ROUTES.login, element: <LoginPage /> },
              { path: ROUTES.register, element: <RegisterPage /> },
            ],
          },
        ],
      },

      // Private routes: any signed-in admin-panel user.
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              { path: ROUTES.dashboard, element: <DashboardPage /> },
              { path: ROUTES.profile, element: <ProfilePage /> },
              // Role-based: only roles that grant the permission.
              {
                element: <ProtectedRoute requiredPermissions={[PERMISSIONS.systemLogList]} />,
                children: [{ path: ROUTES.activity, element: <ActivityLogPage /> }],
              },
            ],
          },
        ],
      },

      // Public routes.
      { path: ROUTES.unauthorized, element: <UnauthorizedPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
