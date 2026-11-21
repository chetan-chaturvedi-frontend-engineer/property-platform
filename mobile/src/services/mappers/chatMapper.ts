import { ChatMessage, ChatThread } from '../../types';
import { ApiChatMessage, ApiConversation } from '../../types/api';

/** The buyer sees the property they asked about; the seller sees who is asking. */
export function toThread(c: ApiConversation): ChatThread {
  const property = c.property.projectName ?? 'Property';
  const person = c.otherParty.fullName ?? 'User';
  const last = c.lastMessage;
  return {
    id: String(c.id),
    propertyId: c.property.id,
    role: c.role,
    title: c.role === 'buyer' ? property : person,
    subtitle: c.role === 'buyer' ? person : property,
    lastMessage: last ? `${last.mine ? 'You: ' : ''}${last.body}` : '',
    time: c.lastMessageAt,
    unread: c.unread,
  };
}

export function toMessage(m: ApiChatMessage): ChatMessage {
  return { id: m.id, fromMe: m.mine, text: m.body, createdAt: m.createdAt };
}
