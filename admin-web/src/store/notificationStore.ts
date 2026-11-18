import { create } from 'zustand';

export type NotificationSeverity = 'success' | 'info' | 'warning' | 'error';

export interface AppNotification {
  id: number;
  message: string;
  severity: NotificationSeverity;
}

interface NotificationState {
  queue: AppNotification[];
  notify: (message: string, severity?: NotificationSeverity) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useNotificationStore = create<NotificationState>()((set) => ({
  queue: [],
  notify: (message, severity = 'info') =>
    set((state) => {
      // The same message twice in a row (e.g. several failing queries) is shown once.
      if (state.queue.some((item) => item.message === message)) {
        return state;
      }
      return { queue: [...state.queue, { id: nextId++, message, severity }] };
    }),
  dismiss: (id) => set((state) => ({ queue: state.queue.filter((item) => item.id !== id) })),
}));

/** For non-React code (query cache, interceptors). */
export const notify = (message: string, severity?: NotificationSeverity) =>
  useNotificationStore.getState().notify(message, severity);
