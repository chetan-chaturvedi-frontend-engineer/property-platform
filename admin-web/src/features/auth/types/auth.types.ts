import type { EntityId, IsoDateTime, Nullable } from '@/types/common.types';

export interface AdminRole {
  slug: string;
  name: string;
}

/** `GET /admin/me`: safe profile fields plus the permissions the role grants right now. */
export interface AdminUser {
  id: EntityId;
  fullName: string;
  email: Nullable<string>;
  phone: Nullable<string>;
  role: AdminRole;
  permissions: string[];
}

/**
 * Login and refresh result. The tokens themselves are in HttpOnly cookies set by the backend and are
 * never visible to JavaScript.
 */
export interface AdminSessionResponse {
  /** Access-token (cookie) lifetime in seconds. */
  expiresIn: number;
  refreshTokenExpiresAt: IsoDateTime;
  user: AdminUser;
}

export interface LoginRequest {
  /** Email address or phone number. */
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  passwordConfirmation: string;
}

export interface VerificationStatusResponse {
  message: string;
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
}

export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';
