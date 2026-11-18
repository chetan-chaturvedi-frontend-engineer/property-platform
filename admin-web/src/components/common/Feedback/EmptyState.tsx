import Inbox from '@mui/icons-material/Inbox';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({ title = 'Nothing here yet', message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <Inbox color="disabled" fontSize="large" aria-hidden />
      <Typography variant="subtitle1" component="p" fontWeight={600}>
        {title}
      </Typography>
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
      {action}
    </div>
  );
}
