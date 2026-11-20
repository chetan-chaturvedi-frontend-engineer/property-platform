import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { ErrorState } from '@/components/common/Feedback/ErrorState';
import { formatDateTime } from '@/utils/formatters';

import type { BannerActivityEntry } from '../types/banner.types';

interface BannerActivityProps {
  entries: readonly BannerActivityEntry[] | undefined;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

const DOT: Record<BannerActivityEntry['logLevel'], string> = {
  success: 'bg-[var(--mui-palette-success-main)]',
  info: 'bg-[var(--mui-palette-info-main)]',
  warning: 'bg-[var(--mui-palette-warning-main)]',
};

/** A banner's audit trail from the system log, newest first. */
export function BannerActivity({
  entries,
  isLoading = false,
  error = null,
  onRetry,
}: BannerActivityProps) {
  if (isLoading && !entries) {
    return (
      <div className="flex flex-col gap-2" aria-busy aria-label="Loading activity">
        <Skeleton variant="rounded" height={36} />
        <Skeleton variant="rounded" height={36} />
      </div>
    );
  }
  if (error && !entries) {
    return <ErrorState message={error.message} onRetry={onRetry} />;
  }
  if (!entries || entries.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No recorded activity yet.
      </Typography>
    );
  }
  return (
    <ol className="flex flex-col gap-3" aria-label="Banner activity">
      {entries.map((entry) => (
        <li key={entry.id} className="flex gap-3">
          <span
            aria-hidden
            className={`mt-1.5 size-2 shrink-0 rounded-full ${DOT[entry.logLevel]}`}
          />
          <div className="min-w-0">
            <Typography variant="body2">{entry.action}</Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDateTime(entry.createdAt)}
              {entry.user ? ` · ${entry.user.fullName}` : ''}
            </Typography>
          </div>
        </li>
      ))}
    </ol>
  );
}
