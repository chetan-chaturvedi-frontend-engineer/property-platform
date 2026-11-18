/**
 * Global client state only (session, UI, notifications). Server data belongs to React Query and
 * form values to React Hook Form; do not copy either into a store.
 */
export { useAuthStore } from './authStore';
export { useUiStore } from './uiStore';
export { notify, useNotificationStore } from './notificationStore';
export type { AppNotification, NotificationSeverity } from './notificationStore';
