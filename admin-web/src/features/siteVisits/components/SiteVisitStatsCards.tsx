import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import EventBusyOutlined from '@mui/icons-material/EventBusyOutlined';
import HighlightOffOutlined from '@mui/icons-material/HighlightOffOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import TaskAltOutlined from '@mui/icons-material/TaskAltOutlined';
import Alert from '@mui/material/Alert';
import type { ReactNode } from 'react';

import { Button } from '@/components/common/Button';
import { StatCard, type StatCardTone } from '@/components/common/StatCard/StatCard';
import { formatNumber } from '@/utils/formatters';

import { type SiteVisitStats, UPCOMING_STATUSES } from '../types/siteVisit.types';
import { formatShare } from '../utils/siteVisitDisplay';

interface CardDefinition {
  label: string;
  icon: ReactNode;
  tone: StatCardTone;
  value: (stats: SiteVisitStats) => number;
  caption?: string;
}

const CARDS: readonly CardDefinition[] = [
  {
    label: 'Total visits',
    icon: <CalendarMonthOutlined />,
    tone: 'primary',
    value: (s) => s.total,
    caption: 'All statuses',
  },
  {
    label: 'Upcoming visits',
    icon: <ScheduleOutlined />,
    tone: 'info',
    value: (s) => UPCOMING_STATUSES.reduce((sum, status) => sum + s.byStatus[status], 0),
  },
  {
    label: 'Completed visits',
    icon: <TaskAltOutlined />,
    tone: 'success',
    value: (s) => s.byStatus.completed,
  },
  {
    label: 'Cancelled visits',
    icon: <HighlightOffOutlined />,
    tone: 'error',
    value: (s) => s.byStatus.cancelled,
  },
  {
    label: 'No show',
    icon: <EventBusyOutlined />,
    tone: 'warning',
    value: (s) => s.byStatus.no_show,
  },
];

interface SiteVisitStatsCardsProps {
  stats: SiteVisitStats | undefined;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

/** Totals from `GET /admin/site-visits/stats`; independent of the list filters. */
export function SiteVisitStatsCards({
  stats,
  isLoading = false,
  error = null,
  onRetry,
}: SiteVisitStatsCardsProps) {
  if (error && !stats) {
    return (
      <Alert
        severity="error"
        action={
          onRetry && (
            <Button size="small" variant="text" color="inherit" onClick={onRetry}>
              Retry
            </Button>
          )
        }
      >
        Could not load site visit statistics. {error.message}
      </Alert>
    );
  }

  return (
    <section
      aria-label="Site visit statistics"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5"
    >
      {CARDS.map((card) => {
        const value = stats ? card.value(stats) : 0;
        return (
          <StatCard
            key={card.label}
            label={card.label}
            value={formatNumber(value)}
            icon={card.icon}
            tone={card.tone}
            caption={card.caption ?? `${formatShare(value, stats?.total ?? 0)} of all visits`}
            isLoading={isLoading}
          />
        );
      })}
    </section>
  );
}
