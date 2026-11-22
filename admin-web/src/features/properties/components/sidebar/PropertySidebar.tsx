import { propertyRoutes } from '@/utils/constants';

import { usePropertyActivity, usePropertyStats } from '../../hooks/useProperties';

import { PropertyOverviewCard } from './PropertyOverviewCard';
import { type QuickAction, QuickActionsCard } from './QuickActionsCard';
import { RecentActivityCard } from './RecentActivityCard';

const ACTIVITY_SIZE = 8;

interface PropertySidebarProps {
  quickActions: readonly QuickAction[];
  /** Entries link to the property's details page when the viewer may open it. */
  canViewProperties?: boolean;
  className?: string;
}

/**
 * Overview, recent activity and quick actions. A column beside the list on wide screens; on narrower ones
 * the cards sit side by side below it (the parent places it).
 */
export function PropertySidebar({
  quickActions,
  canViewProperties = false,
  className = '',
}: PropertySidebarProps) {
  const stats = usePropertyStats();
  const activity = usePropertyActivity(ACTIVITY_SIZE);

  return (
    <aside
      aria-label="Property insights"
      className={`block content-start gap-4 md:grid-cols-2 xl:grid-cols-3 min-[1800px]:grid-cols-1 ${className}`}
    >
      <PropertyOverviewCard
        stats={stats.data}
        isLoading={stats.isPending}
        error={stats.error}
        onRetry={() => void stats.refetch()}
      />
      <RecentActivityCard
        items={activity.data?.content}
        isLoading={activity.isPending}
        error={activity.error}
        onRetry={() => void activity.refetch()}
        skeletonCount={ACTIVITY_SIZE}
        propertyHref={
          canViewProperties
            ? (item) => (item.projectName ? propertyRoutes.detail(item.propertyId) : undefined)
            : undefined
        }
      />
      {quickActions.length > 0 && <QuickActionsCard actions={quickActions} />}
    </aside>
  );
}
