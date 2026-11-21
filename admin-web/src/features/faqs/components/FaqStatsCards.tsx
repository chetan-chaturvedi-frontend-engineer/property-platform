import CategoryOutlined from '@mui/icons-material/CategoryOutlined';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import ForumOutlined from '@mui/icons-material/ForumOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import Alert from '@mui/material/Alert';

import { Button } from '@/components/common/Button';
import { StatCard } from '@/components/common/StatCard/StatCard';
import { formatNumber } from '@/utils/formatters';

import type { FaqCounts } from '../types/faq.types';

interface FaqStatsCardsProps {
  counts: FaqCounts | undefined;
  /** Number of configured categories; undefined while loading or unavailable. */
  categoryCount: number | undefined;
  isLoading?: boolean;
  isCategoriesLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

/** Overview totals; independent of the list filters. */
export function FaqStatsCards({
  counts,
  categoryCount,
  isLoading = false,
  isCategoriesLoading = false,
  error = null,
  onRetry,
}: FaqStatsCardsProps) {
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
        Could not load FAQ statistics. {error.message}
      </Alert>
    );
  }

  return (
    <section
      aria-label="FAQ statistics"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <StatCard
        label="Total FAQs"
        value={formatNumber(counts?.total ?? 0)}
        icon={<ForumOutlined />}
        tone="primary"
        caption="All FAQs"
        isLoading={isLoading}
      />
      <StatCard
        label="Published FAQs"
        value={formatNumber(counts?.published ?? 0)}
        icon={<CheckCircleOutline />}
        tone="success"
        caption="Live on website"
        isLoading={isLoading}
      />
      <StatCard
        label="Draft FAQs"
        value={formatNumber(counts?.drafts ?? 0)}
        icon={<ScheduleOutlined />}
        tone="warning"
        caption="Not published"
        isLoading={isLoading}
      />
      <StatCard
        label="Categories"
        value={categoryCount === undefined ? '—' : formatNumber(categoryCount)}
        icon={<CategoryOutlined />}
        tone="info"
        caption="Configured on the server"
        isLoading={isCategoriesLoading}
      />
    </section>
  );
}
