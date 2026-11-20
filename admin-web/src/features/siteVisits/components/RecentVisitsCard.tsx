import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { formatDateTime } from '@/utils/formatters';

import type { SiteVisitSummary } from '../types/siteVisit.types';
import { SITE_VISIT_STATUS_META } from '../utils/siteVisitDisplay';

interface RecentVisitsCardProps {
  title?: string;
  visits: readonly SiteVisitSummary[] | undefined;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onSelect?: (visit: SiteVisitSummary) => void;
}

/** The latest changed visits with their current status: real records, not an activity feed. */
export function RecentVisitsCard({
  title = 'Recently updated',
  visits,
  isLoading = false,
  error = null,
  onRetry,
  onSelect,
}: RecentVisitsCardProps) {
  return (
    <Paper className="p-4" component="section" aria-label={title}>
      <Typography variant="subtitle1" component="h2" fontWeight={700} className="mb-2">
        {title}
      </Typography>
      {isLoading && !visits ? (
        <div className="flex flex-col gap-2" aria-busy>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} variant="text" height={36} />
          ))}
        </div>
      ) : error && !visits ? (
        <Typography variant="body2" color="error">
          Could not load visits.{' '}
          {onRetry && (
            <button type="button" className="cursor-pointer underline" onClick={onRetry}>
              Retry
            </button>
          )}
        </Typography>
      ) : !visits?.length ? (
        <Typography variant="body2" color="text.secondary">
          No site visits yet.
        </Typography>
      ) : (
        <ul className="flex flex-col">
          {visits.map((visit) => {
            const meta = SITE_VISIT_STATUS_META[visit.status];
            const content = (
              <>
                <span
                  aria-hidden
                  className="mt-1.5 size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: `var(--mui-palette-${meta.color}-main)` }}
                />
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm">
                    {visit.visitCode} · {visit.name}
                  </span>
                  <span className="text-muted block text-xs">
                    {meta.label} · {formatDateTime(visit.updatedAt ?? visit.createdAt)}
                  </span>
                </span>
              </>
            );
            return (
              <li key={visit.id}>
                {onSelect ? (
                  <button
                    type="button"
                    onClick={() => onSelect(visit)}
                    className="flex w-full cursor-pointer items-start gap-3 rounded-md px-2 py-1.5 hover:bg-[var(--mui-palette-action-hover)] focus-visible:outline-2 focus-visible:outline-[var(--app-primary-strong)]"
                  >
                    {content}
                  </button>
                ) : (
                  <div className="flex items-start gap-3 px-2 py-1.5">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Paper>
  );
}
