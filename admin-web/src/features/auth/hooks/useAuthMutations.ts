import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/store/authStore';

import { authService } from '../services/authService';
import type { LoginRequest, RegisterRequest } from '../types/auth.types';

import { authKeys } from './authKeys';

export function useLogin() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);
  return useMutation({
    mutationFn: (request: LoginRequest) => authService.login(request),
    meta: { suppressGlobalError: true },
    onSuccess: (session) => {
      // Nothing cached from a previous session may leak into this one.
      queryClient.clear();
      setSession(session.user);
      queryClient.setQueryData(authKeys.currentUser(), session.user);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (request: RegisterRequest) => authService.register(request),
    meta: { suppressGlobalError: true },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((state) => state.clearSession);
  return useMutation({
    mutationFn: () => authService.logout(),
    meta: { suppressGlobalError: true, successMessage: 'You have been signed out.' },
    // Sign out locally even if the server call fails (e.g. the session had already expired).
    onSettled: () => {
      clearSession();
      queryClient.clear();
    },
  });
}
