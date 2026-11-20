import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import PauseCircleOutline from '@mui/icons-material/PauseCircleOutline';
import PermMediaOutlined from '@mui/icons-material/PermMediaOutlined';
import Alert from '@mui/material/Alert';
import type { ReactNode } from 'react';

import { Button } from '@/components/common/Button';
import { StatCard, type StatCardTone } from '@/components/common/StatCard/StatCard';
import { formatNumber } from '@/utils/formatters';

import type { BannerCounts } from '../types/banner.types';

interface CardDefinition {
  label: string;
  icon: ReactNode;
  tone: StatCardTone;
  value: (counts: BannerCounts) => number;
  caption: (counts: BannerCounts | undefined) => string;
}

const CARDS: readonly CardDefinition[] = [
  {
    label: 'Total banners',
    icon: <PermMediaOutlined />,
    tone: 'primary',
    value: (c) => c.total,
    caption: (c) =>
      c && c.expired > 0 ? `All time · ${formatNumber(c.expired)} expired` : 'All time',
  },
  {
    label: 'Active banners',
    icon: <CheckCircleOutline />,
    tone: 'success',
    value: (c) => c.live,
    caption: () => 'Currently running',
  },
  {
    label: 'Inactive banners',
    icon: <PauseCircleOutline />,
    tone: 'error',
    value: (c) => c.inactive,
    caption: () => 'Not showing',
  },
  {
    label: 'Scheduled banners',
    icon: <CalendarMonthOutlined />,
    tone: 'warning',
    value: (c) => c.scheduled,
    caption: () => 'Upcoming',
  },
];

interface BannerStatsCardsProps {
  counts: BannerCounts | undefined;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

/** Overview totals; independent of the list filters. */
export function BannerStatsCards({
  counts,
  isLoading = false,
  error = null,
  onRetry,
}: BannerStatsCardsProps) {
  if (error && !counts) {
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
        Could not load banner statistics. {error.message}
      </Alert>
    );
  }

  return (
    <section
      aria-label="Banner statistics"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {CARDS.map((card) => (
        <StatCard
          key={card.label}
          label={card.label}
          value={formatNumber(counts ? card.value(counts) : 0)}
          icon={card.icon}
          tone={card.tone}
          caption={card.caption(counts)}
          isLoading={isLoading}
        />
      ))}
    </section>
  );
}
