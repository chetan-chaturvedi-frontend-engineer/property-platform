import ArticleOutlined from '@mui/icons-material/ArticleOutlined';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import EditNoteOutlined from '@mui/icons-material/EditNoteOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import Alert from '@mui/material/Alert';
import type { ReactNode } from 'react';

import { Button } from '@/components/common/Button';
import { StatCard, type StatCardTone } from '@/components/common/StatCard/StatCard';
import { formatNumber } from '@/utils/formatters';

import type { BlogCounts } from '../types/blog.types';

interface CardDefinition {
  label: string;
  icon: ReactNode;
  tone: StatCardTone;
  value: (counts: BlogCounts) => number;
  caption: string;
}

const CARDS: readonly CardDefinition[] = [
  {
    label: 'Total blogs',
    icon: <ArticleOutlined />,
    tone: 'primary',
    value: (c) => c.total,
    caption: 'All time',
  },
  {
    label: 'Published blogs',
    icon: <CheckCircleOutline />,
    tone: 'success',
    value: (c) => c.live,
    caption: 'Live on website',
  },
  {
    label: 'Draft blogs',
    icon: <EditNoteOutlined />,
    tone: 'neutral',
    value: (c) => c.drafts,
    caption: 'Not published',
  },
  {
    label: 'Scheduled blogs',
    icon: <ScheduleOutlined />,
    tone: 'warning',
    value: (c) => c.scheduled,
    caption: 'Go live automatically',
  },
];

interface BlogStatsCardsProps {
  counts: BlogCounts | undefined;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

/** Overview totals; independent of the list filters. */
export function BlogStatsCards({
  counts,
  isLoading = false,
  error = null,
  onRetry,
}: BlogStatsCardsProps) {
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
        Could not load blog statistics. {error.message}
      </Alert>
    );
  }

  return (
    <section
      aria-label="Blog statistics"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {CARDS.map((card) => (
        <StatCard
          key={card.label}
          label={card.label}
          value={formatNumber(counts ? card.value(counts) : 0)}
          icon={card.icon}
          tone={card.tone}
          caption={card.caption}
          isLoading={isLoading}
        />
      ))}
    </section>
  );
}
