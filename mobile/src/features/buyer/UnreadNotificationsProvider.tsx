import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { notificationService } from '../../services/notificationService';
import { useAuth } from '../auth/AuthProvider';

interface UnreadValue {
  unread: number;
  /** Reloads the count, e.g. after reading notifications. */
  refresh: () => void;
}

const UnreadContext = createContext<UnreadValue | undefined>(undefined);

const REFRESH_MS = 60_000;

/** The bell's unread count: loaded after sign-in, then refreshed when the app returns to the foreground and each minute. */
export function UnreadNotificationsProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(() => {
    if (status !== 'signedIn') {
      setUnread(0);
      return;
    }
    notificationService.unreadCount().then(setUnread).catch(() => undefined);
  }, [status]);

  useEffect(() => {
    refresh();
    if (status !== 'signedIn') {
      return undefined;
    }
    const timer = setInterval(refresh, REFRESH_MS);
    const subscription = AppState.addEventListener('change', state => state === 'active' && refresh());
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [refresh, status]);

  const value = useMemo(() => ({ unread, refresh }), [unread, refresh]);
  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
}

export function useUnreadNotifications(): UnreadValue {
  const context = useContext(UnreadContext);
  if (!context) {
    throw new Error('useUnreadNotifications must be used inside <UnreadNotificationsProvider>');
  }
  return context;
}
