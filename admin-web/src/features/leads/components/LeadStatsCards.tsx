import FiberNewOutlined from '@mui/icons-material/FiberNewOutlined';
import HighlightOffOutlined from '@mui/icons-material/HighlightOffOutlined';
import PendingActionsOutlined from '@mui/icons-material/PendingActionsOutlined';
import SupportAgentOutlined from '@mui/icons-material/SupportAgentOutlined';
import TaskAltOutlined from '@mui/icons-material/TaskAltOutlined';
import Alert from '@mui/material/Alert';
import type { ReactNode } from 'react';

import { Button } from '@/components/common/Button';
import { StatCard, type StatCardTone } from '@/components/common/StatCard/StatCard';
import { formatNumber } from '@/utils/formatters';

import type { LeadStats } from '../types/lead.types';
import { formatShare, IN_PROGRESS_STATUSES } from '../utils/leadDisplay';

interface CardDefinition {
  label: string;
  icon: ReactNode;
  tone: StatCardTone;
  value: (stats: LeadStats) => number;
}

const CARDS: readonly CardDefinition[] = [
  { label: 'Total leads', icon: <SupportAgentOutlined />, tone: 'primary', value: (s) => s.total },
  { label: 'New leads', icon: <FiberNewOutlined />, tone: 'info', value: (s) => s.byStatus.new },
  {
    label: 'In progress',
    icon: <PendingActionsOutlined />,
    tone: 'warning',
    value: (s) => IN_PROGRESS_STATUSES.reduce((sum, status) => sum + s.byStatus[status], 0),
  },
  {
    label: 'Converted',
    icon: <TaskAltOutlined />,
    tone: 'success',
    value: (s) => s.byStatus.converted,
  },
  {
    label: 'Lost leads',
    icon: <HighlightOffOutlined />,
    tone: 'error',
    value: (s) => s.byStatus.lost,
  },
];

interface LeadStatsCardsProps {
  stats: LeadStats | undefined;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

/** Totals from `GET /admin/leads/stats`; independent of the list filters. */
export function LeadStatsCards({
  stats,
  isLoading = false,
  error = null,
  onRetry,
}: LeadStatsCardsProps) {
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
        Could not load lead statistics. {error.message}
      </Alert>
    );
  }

  return (
    <section
      aria-label="Lead statistics"
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
            caption={
              card.label === 'Total leads'
                ? 'All statuses'
                : `${formatShare(value, stats?.total ?? 0)} of all leads`
            }
            isLoading={isLoading}
          />
        );
      })}
    </section>
  );
}
