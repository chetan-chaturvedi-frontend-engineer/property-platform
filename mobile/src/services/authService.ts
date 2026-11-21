import { OtpPurpose, User } from '../types';
import { ApiMessage, ApiTokenResponse, ApiUser, ApiVerificationStatus } from '../types/api';
import { apiClient } from './api/apiClient';
import { getAccessToken } from './api/tokenManager';
import { secureStorage } from './storage/secureStorage';

export interface RegisterInput {
  fullName: string;
  email: string;
  /** E.164, e.g. +919876543210. */
  phone: string;
  password: string;
}

export function toUser(u: ApiUser): User {
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone ?? '',
    verified: u.emailVerified || u.phoneVerified,
  };
}

export const authService = {
  register: (input: RegisterInput) =>
    apiClient.post<ApiVerificationStatus>('/auth/register', { ...input, passwordConfirmation: input.password }, { auth: false }),

  verifyOtp: (identifier: string, otp: string, purpose: OtpPurpose) =>
    apiClient.post<ApiVerificationStatus>('/auth/verify-otp', { identifier, otp, purpose }, { auth: false }),

  resendOtp: (identifier: string, purpose: OtpPurpose) =>
    apiClient.post<ApiMessage>('/auth/resend-otp', { identifier, purpose }, { auth: false }),

  /** Sends a reset code; the response is the same whether or not the account exists. */
  forgotPassword: (identifier: string) =>
    apiClient.post<ApiMessage>('/auth/forgot-password', { identifier }, { auth: false }),

  resetPassword: (identifier: string, otp: string, password: string) =>
    apiClient.post<ApiMessage>(
      '/auth/reset-password',
      { identifier, otp, password, passwordConfirmation: password },
      { auth: false },
    ),

  async signIn(identifier: string, password: string): Promise<User> {
    const tokens = await apiClient.post<ApiTokenResponse>('/auth/login', { identifier, password }, { auth: false });
    await secureStorage.saveSession({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    return toUser(tokens.user);
  },

  /** Changes the display name; email and phone need re-verification and are not editable here. */
  async rename(fullName: string): Promise<User> {
    return toUser(await apiClient.patch<ApiUser>('/users/me', { fullName }));
  },

  /** Replaces the password. The backend ends every session, so the caller signs in again afterwards. */
  async changePassword(currentPassword: string, password: string): Promise<void> {
    await apiClient.post<void>('/users/me/change-password', { currentPassword, password, passwordConfirmation: password });
    await secureStorage.clearSession();
  },

  /** Ends the server session (best effort) and always clears local credentials. */
  async signOut(): Promise<void> {
    try {
      await apiClient.post<ApiMessage>('/auth/logout');
    } catch {
      // Offline or already expired: local sign-out must still succeed.
    }
    await secureStorage.clearSession();
  },

  /** The signed-in user, or null when there is no session (token refresh happens in the client). */
  async currentUser(): Promise<User | null> {
    if (!(await getAccessToken())) {
      return null;
    }
    return toUser(await apiClient.get<ApiUser>('/auth/me'));
  },
};
