import { env } from '@/config/env';

export interface ErrorContext {
  /** Where the error was caught, e.g. "ErrorBoundary" or "RouteError". */
  source: string;
  componentStack?: string | null;
}

/**
 * The single place that reports unexpected client errors. Connect an error-tracking service (e.g.
 * Sentry's captureException) here; callers do not change. Never include tokens or form values.
 */
export function reportError(error: unknown, context: ErrorContext): void {
  console.error(
    `[${env.appEnv}] Unhandled error in ${context.source}`,
    error,
    context.componentStack ?? '',
  );
}
