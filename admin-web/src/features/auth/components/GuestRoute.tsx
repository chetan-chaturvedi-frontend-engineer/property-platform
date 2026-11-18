import { Navigate, Outlet } from 'react-router-dom';

import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/utils/constants';

/** Login and registration: signed-in users go straight to the dashboard. */
export function GuestRoute() {
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');
  return isAuthenticated ? <Navigate to={ROUTES.dashboard} replace /> : <Outlet />;
}
