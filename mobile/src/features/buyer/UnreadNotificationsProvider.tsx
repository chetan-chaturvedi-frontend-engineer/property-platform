import React, { createContext, useContext, useMemo } from 'react';
import { usePolledCount } from '../../hooks/usePolledCount';
import { notificationService } from '../../services/notificationService';
import { useAuth } from '../auth/AuthProvider';

interface UnreadValue {
  unread: number;
  /** Reloads the count, e.g. after reading notifications. */
  refresh: () => void;
}

const UnreadContext = createContext<UnreadValue | undefined>(undefined);

/** The bell's unread count, kept fresh while the user is signed in. */
export function UnreadNotificationsProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const { count, refresh } = usePolledCount(notificationService.unreadCount, status === 'signedIn');
  const value = useMemo(() => ({ unread: count, refresh }), [count, refresh]);
  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
}

export function useUnreadNotifications(): UnreadValue {
  const context = useContext(UnreadContext);
  if (!context) {
    throw new Error('useUnreadNotifications must be used inside <UnreadNotificationsProvider>');
  }
  return context;
}
