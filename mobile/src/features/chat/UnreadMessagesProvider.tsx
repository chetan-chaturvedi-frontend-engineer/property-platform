import React, { createContext, useContext, useMemo } from 'react';
import { usePolledCount } from '../../hooks/usePolledCount';
import { chatService } from '../../services/chatService';
import { useAuth } from '../auth/AuthProvider';

interface UnreadValue {
  unread: number;
  refresh: () => void;
}

const UnreadMessagesContext = createContext<UnreadValue | undefined>(undefined);

/** Unread messages across all conversations, for the Chats tab badge; polled a little faster than notifications. */
export function UnreadMessagesProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const { count, refresh } = usePolledCount(chatService.unreadCount, status === 'signedIn', 20_000);
  const value = useMemo(() => ({ unread: count, refresh }), [count, refresh]);
  return <UnreadMessagesContext.Provider value={value}>{children}</UnreadMessagesContext.Provider>;
}

export function useUnreadMessages(): UnreadValue {
  const context = useContext(UnreadMessagesContext);
  if (!context) {
    throw new Error('useUnreadMessages must be used inside <UnreadMessagesProvider>');
  }
  return context;
}
