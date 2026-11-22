import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { BADGE_TONE_CLASSES } from '@/components/common/Badge';
import { ErrorState } from '@/components/common/Feedback/ErrorState';
import { formatDateTime, formatRelativeTime } from '@/utils/formatters';

import type { PropertyActivity } from '../../types/property.types';
import { activityMeta } from '../../utils/propertyActivity';

import { SidebarCard } from './SidebarCard';

interface RecentActivityCardProps {
  items: readonly PropertyActivity[] | undefined;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  /** Link target for an entry's property; plain text when absent. */
  propertyHref?: (activity: PropertyActivity) => string | undefined;
  /** Placeholder rows while loading. */
  skeletonCount?: number;
}

/** Newest property lifecycle events first, each with an icon, the property and the time. */
export function RecentActivityCard({
  items,
  isLoading = false,
  error = null,
  onRetry,
  propertyHref,
  skeletonCount = 5,
}: RecentActivityCardProps) {
  return (
    <SidebarCard title="Recent activity">
      {error && !items ? (
        <ErrorState message={error.message} onRetry={onRetry} />
      ) : isLoading || !items ? (
        <div role="status" aria-label="Loading activity" className="flex flex-col gap-3">
          {Array.from({ length: skeletonCount }, (_, index) => (
            <div key={index} className="flex gap-3">
              <Skeleton variant="circular" width={32} height={32} />
              <div className="flex-1">
                <Skeleton width="70%" />
                <Skeleton width="45%" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" className="py-4 text-center">
          No property activity yet.
        </Typography>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-3.5 p-0">
          {items.map((item) => {
            const meta = activityMeta(item);
            const Icon = meta.icon;
            const href = propertyHref?.(item);
            const name = item.projectName ?? `Property #${item.propertyId}`;
            return (
              <li key={item.id} className="flex gap-3">
                <span
                  aria-hidden
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full ${BADGE_TONE_CLASSES[meta.tone]}`}
                >
                  <Icon sx={{ fontSize: 17 }} />
                </span>
                <div className="min-w-0 flex-1">
                  <Typography variant="body2" fontWeight={600}>
                    {meta.label}
                  </Typography>
                  {href ? (
                    <Link
                      component={RouterLink}
                      to={href}
                      variant="body2"
                      underline="hover"
                      className="block truncate"
                      title={name}
                    >
                      {name}
                    </Link>
                  ) : (
                    <Typography variant="body2" noWrap title={name}>
                      {name}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary" component="p" noWrap>
                    <time dateTime={item.createdAt} title={formatDateTime(item.createdAt)}>
                      {formatRelativeTime(item.createdAt)}
                    </time>
                    {item.actorName && ` · by ${item.actorName}`}
                  </Typography>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </SidebarCard>
  );
}
