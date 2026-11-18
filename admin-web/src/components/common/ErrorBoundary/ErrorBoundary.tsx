import { Component, type ErrorInfo, type ReactNode } from 'react';

import { reportError } from '@/services/monitoring';

import { ErrorState } from '../Feedback/ErrorState';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback; receives a reset function that re-renders the children. */
  fallback?: (reset: () => void) => ReactNode;
  /** Changing any of these values clears the error (e.g. the current route). */
  resetKeys?: readonly unknown[];
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Keeps a failing component from taking down the whole app. Error boundaries must be class
 * components; this is the only class in the codebase.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error, { source: 'ErrorBoundary', componentStack: info.componentStack });
  }

  override componentDidUpdate(previous: ErrorBoundaryProps): void {
    if (this.state.hasError && haveChanged(previous.resetKeys, this.props.resetKeys)) {
      this.reset();
    }
  }

  reset = (): void => {
    this.setState({ hasError: false });
  };

  override render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }
    if (this.props.fallback) {
      return this.props.fallback(this.reset);
    }
    // Error details stay in the console/monitoring; users get a generic message.
    return (
      <ErrorState
        title="Something went wrong"
        message="This part of the page failed to load. Try again, or reload the page."
        onRetry={this.reset}
      />
    );
  }
}

function haveChanged(previous: readonly unknown[] = [], next: readonly unknown[] = []): boolean {
  return (
    previous.length !== next.length ||
    previous.some((value, index) => !Object.is(value, next[index]))
  );
}
