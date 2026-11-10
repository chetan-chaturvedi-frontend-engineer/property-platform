import { ChatMessage, ChatThread } from '../types';
import { mockChats, mockMessages } from './mockData';

export const chatService = {
  threads: (): Promise<ChatThread[]> => Promise.resolve(mockChats),
  messages: (_threadId: string): Promise<ChatMessage[]> => Promise.resolve(mockMessages),
};
