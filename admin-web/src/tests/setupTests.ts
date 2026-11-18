import '@testing-library/jest-dom';

import { cleanup, configure } from '@testing-library/react';

import { clearCsrfToken } from '@/services/api/csrf';
import { queryClient } from '@/services/queryClient';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';

import { mockDb } from './mocks/mockDb';
import { server } from './mocks/server';

// findBy*/waitFor resolve as soon as the UI is ready; the ceiling only matters on a busy CI machine.
configure({ asyncUtilTimeout: 5000 });

// jsdom has no matchMedia; MUI's useMediaQuery and color scheme manager need it.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: query.includes('min-width'),
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

// jsdom does not implement scrolling; React Router's ScrollRestoration calls it on navigation.
window.scrollTo = () => undefined;

// Any request without a handler is a test bug, not a silent network call.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  // Unmount first: resetting the stores below must not re-render components still on screen.
  cleanup();
  server.resetHandlers();
  mockDb.reset();
  queryClient.clear();
  clearCsrfToken();
  useAuthStore.setState({ status: 'anonymous', user: null });
  useNotificationStore.setState({ queue: [] });
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterAll(() => server.close());
