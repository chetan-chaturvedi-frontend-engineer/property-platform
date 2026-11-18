import { create } from 'zustand';

import type { AdminUser, SessionStatus } from '@/features/auth/types/auth.types';

interface AuthState {
  /** `unknown` until the startup check with the server's session cookie has finished. */
  status: SessionStatus;
  user: AdminUser | null;
  setSession: (user: AdminUser) => void;
  setUser: (user: AdminUser) => void;
  markAnonymous: () => void;
  clearSession: () => void;
}

const anonymous = { status: 'anonymous', user: null } as const;

/**
 * Who is signed in, as reported by the backend. No tokens: they live in HttpOnly cookies that
 * JavaScript cannot read, so an XSS bug cannot steal the session. Deliberately not persisted.
 */
export const useAuthStore = create<AuthState>()((set) => ({
  status: 'unknown',
  user: null,
  setSession: (user) => set({ status: 'authenticated', user }),
  setUser: (user) => set({ user }),
  markAnonymous: () => set(anonymous),
  clearSession: () => set(anonymous),
}));
