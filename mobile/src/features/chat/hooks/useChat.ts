import { useState } from 'react';
import { useAsync } from '../../../hooks/useAsync';
import { chatService } from '../../../services/chatService';

export function useChatThreads() {
  return useAsync(() => chatService.threads());
}

export function useChatMessages(threadId: string) {
  const { data } = useAsync(() => chatService.messages(threadId), [threadId]);
  const [sent, setSent] = useState<{ id: string; fromMe: true; text: string; time: string }[]>([]);
  const send = (text: string) => {
    const trimmed = text.trim();
    if (trimmed) {
      setSent(s => [...s, { id: `local-${s.length}`, fromMe: true, text: trimmed, time: 'Now' }]);
    }
  };
  return { messages: [...(data ?? []), ...sent], send };
}
