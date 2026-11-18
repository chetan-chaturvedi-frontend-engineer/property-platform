import { useEffect } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

import { reportError } from '@/services/monitoring';

import { ErrorState } from '../Feedback/ErrorState';

/** Router `errorElement`: errors thrown while loading or rendering a route (e.g. a failed lazy chunk). */
export function RouteErrorPage() {
  const error = useRouteError();

  useEffect(() => {
    if (!isRouteErrorResponse(error)) {
      reportError(error, { source: 'RouteError' });
    }
  }, [error]);

  const chunkFailed =
    error instanceof TypeError &&
    /dynamically imported module|Importing a module/i.test(error.message);
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <ErrorState
        title={chunkFailed ? 'A new version is available' : 'Something went wrong'}
        message={
          chunkFailed
            ? 'The app was updated while this tab was open. Reload to continue.'
            : 'An unexpected error occurred. Reload the page to try again.'
        }
        retryLabel="Reload"
        onRetry={() => window.location.reload()}
      />
    </div>
  );
}
