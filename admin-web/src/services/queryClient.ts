import { MutationCache, QueryCache, QueryClient, type QueryKey } from '@tanstack/react-query';

import { notify } from '@/store/notificationStore';

import type { ApiError } from './api/apiError';

declare module '@tanstack/react-query' {
  interface Register {
    // Every API call rejects with ApiError (see services/api/interceptors.ts).
    defaultError: ApiError;
    queryMeta: {
      /** Show this toast when the query fails (by default only background refetch failures toast). */
      errorMessage?: string;
    };
    mutationMeta: {
      successMessage?: string;
      /** The component shows the error itself (e.g. inline form errors). */
      suppressGlobalError?: boolean;
      /** Query keys to invalidate after the mutation succeeds. */
      invalidates?: QueryKey[];
    };
  }
}

const MAX_RETRIES = 2;

function isRetryable(error: ApiError): boolean {
  // Network failures, timeouts, 5xx, 408 and 429 may succeed later; other 4xx never will.
  return (
    error.status === null || error.status >= 500 || error.status === 408 || error.status === 429
  );
}

export function createQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        // 401s end the session (interceptors); the redirect to login says enough.
        if (error.isUnauthorized) {
          return;
        }
        if (query.meta?.errorMessage) {
          notify(query.meta.errorMessage, 'error');
        } else if (query.state.data !== undefined) {
          // The screen still shows older data, so tell the user it may be stale.
          notify(`Could not refresh data: ${error.message}`, 'warning');
        }
      },
    }),
    mutationCache: new MutationCache({
      onSuccess: async (_data, _variables, _context, mutation) => {
        const { successMessage, invalidates } = mutation.meta ?? {};
        if (successMessage) {
          notify(successMessage, 'success');
        }
        if (invalidates?.length) {
          await Promise.all(invalidates.map((queryKey) => client.invalidateQueries({ queryKey })));
        }
      },
      onError: (error, _variables, _context, mutation) => {
        if (!mutation.meta?.suppressGlobalError && !error.isUnauthorized) {
          notify(error.message, 'error');
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => isRetryable(error) && failureCount < MAX_RETRIES,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        // Writes are not idempotent in general; never repeat them automatically.
        retry: false,
      },
    },
  });
  return client;
}

export const queryClient = createQueryClient();
