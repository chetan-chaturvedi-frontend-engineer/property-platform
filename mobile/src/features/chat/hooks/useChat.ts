import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAsync } from '../../../hooks/useAsync';
import { ApiError } from '../../../services/api/apiClient';
import { chatService } from '../../../services/chatService';
import { ChatMessage } from '../../../types';
import { useAuth } from '../../auth/AuthProvider';
import { useUnreadMessages } from '../UnreadMessagesProvider';

const POLL_MS = 4000;

/** The inbox; reloads every time the tab or screen comes into focus. */
export function useChatThreads() {
  const { status } = useAuth();
  const signedIn = status === 'signedIn';
  const result = useAsync(() => (signedIn ? chatService.threads() : Promise.resolve([])), [signedIn]);
  const { reload } = result;
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );
  return result;
}

interface ChatTarget {
  /** An existing conversation. */
  conversationId?: string;
  /** "Enquire now" about a property: the conversation is found, or created by the first message. */
  propertyId?: number;
}

/**
 * One conversation: loads the messages, polls for new ones, marks them read, and sends. Without a conversation id
 * it first looks for the caller's existing conversation about the property; the first message creates it otherwise.
 */
export function useChatMessages({ conversationId, propertyId }: ChatTarget) {
  const { refresh: refreshUnread } = useUnreadMessages();
  const [id, setId] = useState(conversationId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const lastId = useRef(0);

  const append = useCallback((incoming: ChatMessage[]) => {
    const fresh = incoming.filter(m => m.id > lastId.current);
    if (fresh.length === 0) {
      return false;
    }
    lastId.current = fresh[fresh.length - 1].id;
    setMessages(current => [...current, ...fresh]);
    return true;
  }, []);

  const markRead = useCallback(
    (conversation: string) => {
      chatService.markRead(conversation).then(refreshUnread).catch(() => undefined);
    },
    [refreshUnread],
  );

  // Find the existing conversation for an "Enquire now" about a property.
  useEffect(() => {
    if (id !== undefined || propertyId === undefined) {
      setReady(id !== undefined ? false : true);
      return undefined;
    }
    let active = true;
    chatService
      .threads()
      .then(threads => {
        const existing = threads.find(t => t.propertyId === propertyId && t.role === 'buyer');
        if (active && existing) {
          setId(existing.id);
        } else if (active) {
          setReady(true);
        }
      })
      .catch(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, [id, propertyId]);

  // Load the history, then poll for newer messages while the screen is open.
  useEffect(() => {
    if (id === undefined) {
      return undefined;
    }
    let active = true;
    lastId.current = 0;
    setMessages([]);
    chatService
      .messages(id)
      .then(loaded => {
        if (!active) {
          return;
        }
        append(loaded);
        setReady(true);
        markRead(id);
      })
      .catch(e => {
        if (active) {
          setError(e instanceof ApiError ? e.message : 'Could not load the conversation.');
          setReady(true);
        }
      });
    const timer = setInterval(() => {
      chatService
        .messages(id, lastId.current)
        .then(newer => {
          if (active && append(newer) && newer.some(m => !m.fromMe)) {
            markRead(id);
          }
        })
        .catch(() => undefined);
    }, POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [id, append, markRead]);

  async function send(text: string): Promise<boolean> {
    const body = text.trim();
    if (!body || sending) {
      return false;
    }
    setSending(true);
    setError(undefined);
    try {
      if (id === undefined && propertyId !== undefined) {
        const thread = await chatService.start(propertyId, body);
        setId(thread.id);
      } else if (id !== undefined) {
        append([await chatService.send(id, body)]);
      }
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send. Check your connection.');
      return false;
    } finally {
      setSending(false);
    }
  }

  return { messages, ready, sending, error, send };
}
