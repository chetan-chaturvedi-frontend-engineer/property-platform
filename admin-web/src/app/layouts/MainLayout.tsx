import { Suspense } from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';

import { Loader } from '@/components/common/Loader/Loader';

/** Root of every route: lazy-page fallback and scroll restoration. */
export function MainLayout() {
  return (
    <>
      <Suspense fallback={<Loader fullScreen />}>
        <Outlet />
      </Suspense>
      <ScrollRestoration />
    </>
  );
}
