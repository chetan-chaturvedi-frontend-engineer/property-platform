import { QueryClient } from '@tanstack/react-query';
import { render, type RenderOptions, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import {
  createMemoryRouter,
  MemoryRouter,
  type RouteObject,
  RouterProvider,
} from 'react-router-dom';

import { QueryProvider } from '@/app/providers/QueryProvider';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import type { AdminUser } from '@/features/auth/types/auth.types';
import { useAuthStore } from '@/store/authStore';

import { mockDb } from '../mocks/mockDb';

/** A fresh client per test: no retries (failures surface immediately) and no shared cache. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface ProviderOptions {
  queryClient?: QueryClient;
  route?: string;
}

function Providers({
  children,
  queryClient,
  route = '/',
}: ProviderOptions & { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryProvider>
    </ThemeProvider>
  );
}

/** Renders inside the app's theme, React Query and a router; returns a userEvent instance too. */
export function renderWithProviders(
  ui: ReactElement,
  options: ProviderOptions & Omit<RenderOptions, 'wrapper'> = {},
) {
  const { queryClient = createTestQueryClient(), route, ...renderOptions } = options;
  return {
    user: userEvent.setup(),
    queryClient,
    ...render(ui, {
      wrapper: ({ children }) => (
        <Providers queryClient={queryClient} route={route}>
          {children}
        </Providers>
      ),
      ...renderOptions,
    }),
  };
}

/** Renders a route tree (for guards and redirects). */
export function renderRoutes(
  routes: RouteObject[],
  { initialPath = '/', queryClient = createTestQueryClient() } = {},
) {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  return {
    router,
    user: userEvent.setup(),
    ...render(
      <ThemeProvider>
        <QueryProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryProvider>
      </ThemeProvider>,
    ),
  };
}

/** Runs a hook with React Query available. */
export function renderHookWithQuery<TResult>(
  hook: () => TResult,
  queryClient = createTestQueryClient(),
) {
  return {
    queryClient,
    ...renderHook(hook, {
      wrapper: ({ children }) => <QueryProvider client={queryClient}>{children}</QueryProvider>,
    }),
  };
}

/** Signs a mock user in: the mock backend holds their session cookies, the store knows the user. */
export function signInAs(user: AdminUser) {
  const session = mockDb.startSession(user);
  useAuthStore.getState().setSession(user);
  return session;
}
