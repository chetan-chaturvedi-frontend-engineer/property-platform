import { type ReactNode, useEffect } from 'react';

import { Loader } from '@/components/common/Loader/Loader';
import { useAuthStore } from '@/store/authStore';

import { authService } from '../services/authService';

/** Resolves the session once at startup before any route decides where the user belongs. */
export function SessionBootstrap({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (useAuthStore.getState().status === 'unknown') {
      void authService.restoreSession();
    }
  }, []);

  if (status === 'unknown') {
    return <Loader fullScreen label="Starting" />;
  }
  return children;
}
