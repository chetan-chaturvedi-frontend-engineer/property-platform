import { apiClient } from '../src/services/api/apiClient';
import { notificationService } from '../src/services/notificationService';

jest.mock('../src/services/api/apiClient', () => ({
  ...jest.requireActual('../src/services/api/apiClient'),
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const api = apiClient as jest.Mocked<typeof apiClient>;

beforeEach(() => jest.resetAllMocks());

describe('notificationService', () => {
  it('maps the list and pulls the property id out of data', async () => {
    api.get.mockResolvedValue({
      content: [
        { id: 3, type: 'property_status_changed', title: 'Your property was rejected', body: 'Green Acres: Blurry photos.', data: { propertyId: 25 }, read: false, createdAt: '2026-11-21T10:00:00Z' },
        { id: 2, type: 'site_visit_booked', title: 'Site visit booked', body: 'b', data: null, read: true, createdAt: '2026-11-20T10:00:00Z' },
      ],
      page: 0, size: 50, totalElements: 2, totalPages: 1,
    });
    const list = await notificationService.list();
    expect(api.get).toHaveBeenCalledWith('/notifications?size=50');
    expect(list[0]).toEqual({ id: 3, kind: 'property_status_changed', title: 'Your property was rejected', body: 'Green Acres: Blurry photos.', read: false, createdAt: '2026-11-21T10:00:00Z', propertyId: 25 });
    expect(list[1]).toMatchObject({ kind: 'site_visit_booked', read: true, propertyId: undefined });
  });

  it('reads the unread count and sends the write calls to the right paths', async () => {
    api.get.mockResolvedValue({ unread: 4 });
    await expect(notificationService.unreadCount()).resolves.toBe(4);
    await notificationService.markRead(7);
    await notificationService.markAllRead();
    await notificationService.remove(7);
    expect(api.patch).toHaveBeenCalledWith('/notifications/7/read');
    expect(api.post).toHaveBeenCalledWith('/notifications/read-all');
    expect(api.delete).toHaveBeenCalledWith('/notifications/7');
  });
});
