import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { queryClient as defaultClient } from '@/services/queryClient';

interface QueryProviderProps {
  children: ReactNode;
  /** Tests pass their own client so cached data never leaks between tests. */
  client?: QueryClient;
}

export function QueryProvider({ children, client = defaultClient }: QueryProviderProps) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
