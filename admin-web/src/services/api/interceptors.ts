import { type AxiosInstance, isAxiosError } from 'axios';

import type { AdminSessionResponse, AdminUser } from '@/features/auth/types/auth.types';
import { useAuthStore } from '@/store/authStore';
import { notify } from '@/store/notificationStore';

import { queryClient } from '../queryClient';

import { API_ENDPOINTS } from './apiEndpoints';
import { toApiError } from './apiError';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** A 401 is final (e.g. wrong password); do not try to refresh the session. */
    skipAuthRefresh?: boolean;
    /** Set on the single retry after a refresh, so a request is never retried twice. */
    retriedAfterRefresh?: boolean;
  }
}

let refreshInFlight: Promise<AdminUser> | null = null;

/**
 * Asks the backend to rotate the session. The tokens travel only in HttpOnly cookies, which the
 * browser sends and stores itself; the response carries the user. Concurrent callers share one
 * request: the backend treats a second use of the same refresh token as theft and revokes the session.
 */
export function refreshSession(client: AxiosInstance): Promise<AdminUser> {
  refreshInFlight ??= performRefresh(client).finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function performRefresh(client: AxiosInstance): Promise<AdminUser> {
  try {
    const { data } = await client.post<AdminSessionResponse>(API_ENDPOINTS.admin.refresh);
    useAuthStore.getState().setSession(data.user);
    return data.user;
  } catch (error) {
    throw toApiError(error);
  }
}

/** Ends the local session after the server rejected it; protected routes then redirect to login. */
export function expireSession(): void {
  const { status, clearSession } = useAuthStore.getState();
  clearSession();
  queryClient.clear();
  if (status === 'authenticated') {
    notify('Your session has expired. Please sign in again.', 'warning');
  }
}

/**
 * On a 401 from a signed-in user (the access cookie expired), refreshes once and retries the
 * request once. Every error leaves as an ApiError.
 */
export function attachInterceptors(instance: AxiosInstance, refreshClient: AxiosInstance): void {
  instance.interceptors.response.use(undefined, async (error: unknown) => {
    if (!isAxiosError(error) || !error.config) {
      throw toApiError(error);
    }
    const config = error.config;
    const shouldRefresh =
      error.response?.status === 401 &&
      !config.skipAuthRefresh &&
      !config.retriedAfterRefresh &&
      useAuthStore.getState().status === 'authenticated';
    if (!shouldRefresh) {
      throw toApiError(error);
    }

    config.retriedAfterRefresh = true;
    try {
      await refreshSession(refreshClient);
    } catch (refreshError) {
      const apiError = toApiError(refreshError);
      // The server rejected the session. A network failure keeps it, so the user can retry.
      if (apiError.status !== null) {
        expireSession();
        throw toApiError(error);
      }
      throw apiError;
    }
    // The browser now holds the new access cookie; the retry sends it automatically.
    return instance(config);
  });
}
