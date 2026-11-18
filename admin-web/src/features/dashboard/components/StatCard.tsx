import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  isLoading?: boolean;
}

export function StatCard({ label, value, icon, isLoading = false }: StatCardProps) {
  return (
    <Paper className="flex items-center gap-4 p-5">
      <div
        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-800 dark:bg-primary-500/15 dark:text-primary-300"
        aria-hidden
      >
        {icon}
      </div>
      <div className="min-w-0">
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5" component="p" noWrap>
          {isLoading ? <Skeleton width={64} /> : value}
        </Typography>
      </div>
    </Paper>
  );
}
