import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import logoUrl from '@/assets/icons/logo.svg';
import { Loader } from '@/components/common/Loader/Loader';
import { ThemeToggle } from '@/components/navigation/Navbar/ThemeToggle';
import { env } from '@/config/env';

/** Centered card for login and registration. */
export function AuthLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <div className="flex justify-end p-3">
        <ThemeToggle />
      </div>
      <main className="flex flex-1 items-start justify-center px-4 pb-12 sm:items-center">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-center gap-2">
            <img src={logoUrl} alt="" width={36} height={36} decoding="async" />
            <Typography variant="h5" component="p">
              {env.appName}
            </Typography>
          </div>
          <Paper className="p-6 sm:p-8">
            <Suspense fallback={<Loader />}>
              <Outlet />
            </Suspense>
          </Paper>
        </div>
      </main>
    </div>
  );
}
