import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { BADGE_TONE_CLASSES, type BadgeTone } from '@/components/common/Badge';
import { ErrorState } from '@/components/common/Feedback/ErrorState';
import { formatNumber } from '@/utils/formatters';

import type { PropertyStats } from '../../types/property.types';

import { SidebarCard } from './SidebarCard';

interface OverviewRow {
  label: string;
  tone: BadgeTone;
  value: (stats: PropertyStats) => number;
}

const ROWS: readonly OverviewRow[] = [
  { label: 'Approved', tone: 'success', value: (s) => s.byPublicationStatus.approved },
  { label: 'Published', tone: 'secondary', value: (s) => s.byPublicationStatus.published },
  { label: 'Pending review', tone: 'warning', value: (s) => s.byPublicationStatus.pending_review },
  { label: 'Rejected', tone: 'error', value: (s) => s.byPublicationStatus.rejected },
];

interface PropertyOverviewCardProps {
  stats: PropertyStats | undefined;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

/** Totals with each status's share of all properties, and recent submissions. */
export function PropertyOverviewCard({
  stats,
  isLoading = false,
  error = null,
  onRetry,
}: PropertyOverviewCardProps) {
  return (
    <SidebarCard title="Property overview">
      {error && !stats ? (
        <ErrorState message={error.message} onRetry={onRetry} />
      ) : isLoading || !stats ? (
        <div role="status" aria-label="Loading overview" className="flex flex-col gap-3">
          <Skeleton width="40%" height={36} />
          {ROWS.map((row) => (
            <Skeleton key={row.label} height={22} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <Typography variant="h5" component="p" fontWeight={700}>
                {formatNumber(stats.total)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total properties
              </Typography>
            </div>
            <div className="text-right">
              <Typography variant="h6" component="p" fontWeight={700}>
                {formatNumber(stats.submittedLast7Days)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Submitted in 7 days
              </Typography>
            </div>
          </div>
          <dl className="m-0 flex flex-col gap-3">
            {ROWS.map((row) => {
              const value = row.value(stats);
              const share = stats.total > 0 ? (value / stats.total) * 100 : 0;
              return (
                <div key={row.label}>
                  <div className="flex items-center justify-between gap-2">
                    <Typography component="dt" variant="body2">
                      {row.label}
                    </Typography>
                    <Typography component="dd" variant="body2" fontWeight={600} className="m-0">
                      {formatNumber(value)}
                    </Typography>
                  </div>
                  <div
                    aria-hidden
                    className={`mt-1 h-1.5 overflow-hidden rounded-full ${BADGE_TONE_CLASSES[row.tone]}`}
                  >
                    <div
                      className="h-full rounded-full bg-current"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </dl>
        </div>
      )}
    </SidebarCard>
  );
}
