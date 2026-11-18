import { API_ENDPOINTS } from '@/services/api/apiEndpoints';
import { toApiError } from '@/services/api/apiError';
import { authClient, apiClient } from '@/services/api/axiosInstance';
import { refreshSession } from '@/services/api/interceptors';
import { useAuthStore } from '@/store/authStore';
import type { MessageResponse } from '@/types/api.types';

import type {
  AdminSessionResponse,
  AdminUser,
  LoginRequest,
  RegisterRequest,
  VerificationStatusResponse,
} from '../types/auth.types';

export const authService = {
  /** The backend sets the HttpOnly session cookies; the body only carries the user. */
  async login(request: LoginRequest): Promise<AdminSessionResponse> {
    const { data } = await apiClient.post<AdminSessionResponse>(
      API_ENDPOINTS.admin.login,
      request,
      {
        skipAuthRefresh: true,
      },
    );
    return data;
  },

  async register(request: RegisterRequest): Promise<VerificationStatusResponse> {
    const { data } = await apiClient.post<VerificationStatusResponse>(
      API_ENDPOINTS.auth.register,
      request,
      { skipAuthRefresh: true },
    );
    return data;
  },

  async getCurrentUser(): Promise<AdminUser> {
    const { data } = await apiClient.get<AdminUser>(API_ENDPOINTS.admin.me);
    return data;
  },

  /** Revokes the session and deletes the cookies. An expired access cookie is refreshed first. */
  async logout(): Promise<void> {
    await apiClient.post<MessageResponse>(API_ENDPOINTS.admin.logout);
  },

  /**
   * Called once at startup: the session cookies survive reloads, so ask the server who is signed in.
   * If the access cookie has expired but the refresh cookie is still valid, rotate the session.
   */
  async restoreSession(): Promise<void> {
    const store = useAuthStore.getState();
    try {
      const { data } = await apiClient.get<AdminUser>(API_ENDPOINTS.admin.me, {
        skipAuthRefresh: true,
      });
      store.setSession(data);
      return;
    } catch (error) {
      if (toApiError(error).status !== 401) {
        store.markAnonymous();
        return;
      }
    }
    try {
      await refreshSession(authClient);
    } catch {
      useAuthStore.getState().markAnonymous();
    }
  },
};
