import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onSessionExpired } from '../../services/api/tokenManager';
import { authService } from '../../services/authService';
import { User } from '../../types';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: Status;
  user: User | null;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Replaces the signed-in user, e.g. after a rename. */
  setUser: (user: User) => void;
  /** Drops the session without calling the server, e.g. after the account was deleted or the password changed. */
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Owns the session: restores it on launch and drops it when the refresh token is rejected. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let active = true;
    onSessionExpired(() => {
      setUser(null);
      setStatus('signedOut');
    });
    authService
      .currentUser()
      .then(current => {
        if (active) {
          setUser(current);
          setStatus(current ? 'signedIn' : 'signedOut');
        }
      })
      .catch(() => {
        // Rejected or offline: show signed-out; stored tokens stay so the next launch can retry.
        if (active) {
          setStatus('signedOut');
        }
      });
    return () => {
      active = false;
      onSessionExpired(undefined);
    };
  }, []);

  const signIn = useCallback(async (identifier: string, password: string) => {
    setUser(await authService.signIn(identifier, password));
    setStatus('signedIn');
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setUser(null);
    setStatus('signedOut');
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setStatus('signedOut');
  }, []);

  const value = useMemo(
    () => ({ status, user, signIn, signOut, setUser, clearSession }),
    [status, user, signIn, signOut, clearSession],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}
