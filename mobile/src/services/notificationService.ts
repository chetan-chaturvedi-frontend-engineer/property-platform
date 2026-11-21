import { AppNotification } from '../types';
import { ApiNotification, ApiPage } from '../types/api';
import { apiClient } from './api/apiClient';

const PAGE_SIZE = 50;

function toNotification(n: ApiNotification): AppNotification {
  return { id: n.id, kind: n.type, title: n.title, body: n.body, read: n.read, createdAt: n.createdAt, propertyId: n.data?.propertyId };
}

/** The signed-in user's in-app notifications, created by the server from bookings and review decisions. */
export const notificationService = {
  async list(): Promise<AppNotification[]> {
    const page = await apiClient.get<ApiPage<ApiNotification>>(`/notifications?size=${PAGE_SIZE}`);
    return page.content.map(toNotification);
  },

  async unreadCount(): Promise<number> {
    return (await apiClient.get<{ unread: number }>('/notifications/unread-count')).unread;
  },

  markRead: (id: number) => apiClient.patch<ApiNotification>(`/notifications/${id}/read`),
  markAllRead: () => apiClient.post<void>('/notifications/read-all'),
  remove: (id: number) => apiClient.delete<void>(`/notifications/${id}`),
};
