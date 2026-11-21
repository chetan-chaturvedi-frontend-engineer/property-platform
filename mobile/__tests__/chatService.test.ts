import { apiClient } from '../src/services/api/apiClient';
import { chatService } from '../src/services/chatService';

jest.mock('../src/services/api/apiClient', () => ({
  ...jest.requireActual('../src/services/api/apiClient'),
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

const api = apiClient as jest.Mocked<typeof apiClient>;
const conversation = {
  id: 4, property: { id: 25, projectName: 'Green Acres', slug: 'green-acres' }, otherParty: { id: 9, fullName: 'Olivia Owner' },
  role: 'buyer', lastMessage: null, unread: 0, lastMessageAt: '2026-11-22T09:00:00Z',
};

beforeEach(() => jest.resetAllMocks());

describe('chatService', () => {
  it('lists the inbox', async () => {
    api.get.mockResolvedValue({ content: [conversation], page: 0, size: 100, totalElements: 1, totalPages: 1 });
    const threads = await chatService.threads();
    expect(api.get).toHaveBeenCalledWith('/conversations?size=100');
    expect(threads[0]).toMatchObject({ id: '4', title: 'Green Acres', role: 'buyer' });
  });

  it('starts an enquiry with the property id and the first message', async () => {
    api.post.mockResolvedValue(conversation);
    await expect(chatService.start(25, 'Is it available?')).resolves.toMatchObject({ id: '4', propertyId: 25 });
    expect(api.post).toHaveBeenCalledWith('/conversations', { propertyId: 25, message: 'Is it available?' });
  });

  it('loads messages, polls with the after cursor and sends', async () => {
    api.get.mockResolvedValue([{ id: 5, conversationId: 4, mine: false, body: 'Hi', createdAt: '2026-11-22T09:01:00Z' }]);
    await chatService.messages('4');
    expect(api.get).toHaveBeenLastCalledWith('/conversations/4/messages');
    await expect(chatService.messages('4', 5)).resolves.toHaveLength(1);
    expect(api.get).toHaveBeenLastCalledWith('/conversations/4/messages?after=5');
    api.post.mockResolvedValue({ id: 6, conversationId: 4, mine: true, body: 'Hello', createdAt: '2026-11-22T09:02:00Z' });
    await expect(chatService.send('4', 'Hello')).resolves.toMatchObject({ id: 6, fromMe: true, text: 'Hello' });
    expect(api.post).toHaveBeenLastCalledWith('/conversations/4/messages', { body: 'Hello' });
  });

  it('marks read and reads the unread count', async () => {
    api.get.mockResolvedValue({ unread: 3 });
    await expect(chatService.unreadCount()).resolves.toBe(3);
    await chatService.markRead('4');
    expect(api.post).toHaveBeenCalledWith('/conversations/4/read');
  });
});
