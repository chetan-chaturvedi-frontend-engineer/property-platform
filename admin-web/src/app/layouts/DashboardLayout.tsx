import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { ErrorBoundary } from '@/components/common/ErrorBoundary/ErrorBoundary';
import { Loader } from '@/components/common/Loader/Loader';
import { Navbar } from '@/components/navigation/Navbar/Navbar';
import { Sidebar } from '@/components/navigation/Sidebar/Sidebar';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { LAYOUT } from '@/utils/constants';

/** Signed-in shell. A failing page is contained by the boundary; navigation keeps working. */
export function DashboardLayout() {
  const location = useLocation();
  // Keeps the user's permissions in sync with the server while they work.
  useCurrentUser();

  return (
    <div className="flex min-h-dvh bg-canvas">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[2000] focus:rounded focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <Navbar />
      <Sidebar />
      <main
        id="main-content"
        tabIndex={-1}
        className="min-w-0 flex-1 px-4 pb-10 sm:px-6 lg:px-8"
        style={{ paddingTop: LAYOUT.navbarHeight + 24 }}
      >
        <ErrorBoundary resetKeys={[location.pathname]}>
          <Suspense fallback={<Loader />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}
