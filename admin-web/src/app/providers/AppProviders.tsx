import type { ReactNode } from 'react';

import { ErrorBoundary } from '@/components/common/ErrorBoundary/ErrorBoundary';
import { Notifier } from '@/components/common/Notifier/Notifier';
import { SessionBootstrap } from '@/features/auth/components/SessionBootstrap';

import { QueryProvider } from './QueryProvider';
import { ThemeProvider } from './ThemeProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <QueryProvider>
          <SessionBootstrap>{children}</SessionBootstrap>
          <Notifier />
        </QueryProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
