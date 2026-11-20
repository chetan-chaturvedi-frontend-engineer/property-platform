import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import EditNoteOutlined from '@mui/icons-material/EditNoteOutlined';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import PauseCircleOutline from '@mui/icons-material/PauseCircleOutline';
import StarOutlineRounded from '@mui/icons-material/StarOutlineRounded';
import Alert from '@mui/material/Alert';
import type { ReactNode } from 'react';

import { Button } from '@/components/common/Button';
import { StatCard, type StatCardTone } from '@/components/common/StatCard/StatCard';
import { formatNumber } from '@/utils/formatters';

import type { PlanCounts } from '../types/subscriptionPlan.types';

interface CardDefinition {
  label: string;
  icon: ReactNode;
  tone: StatCardTone;
  value: (counts: PlanCounts) => number;
  caption?: string;
}

const CARDS: readonly CardDefinition[] = [
  {
    label: 'Total plans',
    icon: <Inventory2Outlined />,
    tone: 'primary',
    value: (c) => c.total,
    caption: 'All statuses',
  },
  {
    label: 'Active plans',
    icon: <CheckCircleOutline />,
    tone: 'success',
    value: (c) => c.byStatus.active,
  },
  {
    label: 'Draft plans',
    icon: <EditNoteOutlined />,
    tone: 'warning',
    value: (c) => c.byStatus.draft,
  },
  {
    label: 'Inactive plans',
    icon: <PauseCircleOutline />,
    tone: 'error',
    value: (c) => c.byStatus.inactive,
  },
  {
    label: 'Popular plans',
    icon: <StarOutlineRounded />,
    tone: 'info',
    value: (c) => c.popular,
  },
];

function share(value: number, total: number): string {
  return total === 0 ? '0%' : `${Math.round((value / total) * 100)}%`;
}

interface PlanStatsCardsProps {
  counts: PlanCounts | undefined;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

/** Overview totals; independent of the list filters. */
export function PlanStatsCards({
  counts,
  isLoading = false,
  error = null,
  onRetry,
}: PlanStatsCardsProps) {
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
        Could not load plan statistics. {error.message}
      </Alert>
    );
  }

  return (
    <section
      aria-label="Plan statistics"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5"
    >
      {CARDS.map((card) => {
        const value = counts ? card.value(counts) : 0;
        return (
          <StatCard
            key={card.label}
            label={card.label}
            value={formatNumber(value)}
            icon={card.icon}
            tone={card.tone}
            caption={card.caption ?? `${share(value, counts?.total ?? 0)} of all plans`}
            isLoading={isLoading}
          />
        );
      })}
    </section>
  );
}
