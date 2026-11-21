import { ChatMessage, ChatThread } from '../types';
import { ApiChatMessage, ApiConversation, ApiPage } from '../types/api';
import { apiClient } from './api/apiClient';
import { toMessage, toThread } from './mappers/chatMapper';

const PAGE_SIZE = 100;

/** Enquiry chat between a buyer and a property owner; the app polls for new messages. */
export const chatService = {
  async threads(): Promise<ChatThread[]> {
    const page = await apiClient.get<ApiPage<ApiConversation>>(`/conversations?size=${PAGE_SIZE}`);
    return page.content.map(toThread);
  },

  /** "Enquire now": starts (or reuses) the caller's conversation about a property and sends the first message. */
  async start(propertyId: number, message: string): Promise<ChatThread> {
    return toThread(await apiClient.post<ApiConversation>('/conversations', { propertyId, message }));
  },

  /** The newest messages, or only those after `afterId` when polling. Oldest first. */
  async messages(conversationId: string, afterId?: number): Promise<ChatMessage[]> {
    const query = afterId === undefined ? '' : `?after=${afterId}`;
    return (await apiClient.get<ApiChatMessage[]>(`/conversations/${conversationId}/messages${query}`)).map(toMessage);
  },

  async send(conversationId: string, body: string): Promise<ChatMessage> {
    return toMessage(await apiClient.post<ApiChatMessage>(`/conversations/${conversationId}/messages`, { body }));
  },

  markRead: (conversationId: string) => apiClient.post<void>(`/conversations/${conversationId}/read`),

  async unreadCount(): Promise<number> {
    return (await apiClient.get<{ unread: number }>('/conversations/unread-count')).unread;
  },
};
