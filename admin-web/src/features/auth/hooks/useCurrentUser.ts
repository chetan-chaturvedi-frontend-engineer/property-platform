import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuthStore } from '@/store/authStore';

import { authService } from '../services/authService';

import { authKeys } from './authKeys';

/**
 * The signed-in user from `GET /admin/me`. Permissions can change on the server at any time, so the
 * profile is refetched regularly and the session's copy kept in sync.
 */
export function useCurrentUser() {
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');
  const setUser = useAuthStore((state) => state.setUser);

  const query = useQuery({
    queryKey: authKeys.currentUser(),
    queryFn: () => authService.getCurrentUser(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (query.data) {
      setUser(query.data);
    }
  }, [query.data, setUser]);

  return query;
}
