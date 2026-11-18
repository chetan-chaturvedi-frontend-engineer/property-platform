import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/utils/constants';

import { usePermissions } from '../hooks/usePermissions';

interface ProtectedRouteProps {
  /** Every permission the user's role must grant to open the child routes. */
  requiredPermissions?: readonly string[];
}

/**
 * Guards child routes: anonymous users go to the login page (and come back afterwards), users whose
 * role lacks a permission see the unauthorized page. This is a UX convenience only; the backend
 * rejects every request the user is not allowed to make.
 */
export function ProtectedRoute({ requiredPermissions = [] }: ProtectedRouteProps) {
  const status = useAuthStore((state) => state.status);
  const { hasAll } = usePermissions();
  const location = useLocation();

  if (status !== 'authenticated') {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }
  if (!hasAll(requiredPermissions)) {
    return <Navigate to={ROUTES.unauthorized} replace />;
  }
  return <Outlet />;
}
