import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import SettingsSuggestOutlined from '@mui/icons-material/SettingsSuggestOutlined';
import Alert from '@mui/material/Alert';

import { Button } from '@/components/common/Button';
import { StatCard } from '@/components/common/StatCard/StatCard';
import { formatNumber } from '@/utils/formatters';

import type { ContentPageCounts } from '../types/contentPage.types';

interface ContentPageStatsCardsProps {
  counts: ContentPageCounts | undefined;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

/**
 * Overview totals; independent of the list filters. Pages are deleted permanently (no trash), so
 * the fourth card counts system pages instead.
 */
export function ContentPageStatsCards({
  counts,
  isLoading = false,
  error = null,
  onRetry,
}: ContentPageStatsCardsProps) {
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
        Could not load page statistics. {error.message}
      </Alert>
    );
  }

  return (
    <section
      aria-label="Page statistics"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <StatCard
        label="Total pages"
        value={formatNumber(counts?.total ?? 0)}
        icon={<DescriptionOutlined />}
        tone="primary"
        caption="All time"
        isLoading={isLoading}
      />
      <StatCard
        label="Published"
        value={formatNumber(counts?.published ?? 0)}
        icon={<CheckCircleOutline />}
        tone="success"
        caption="Live on website"
        isLoading={isLoading}
      />
      <StatCard
        label="Draft"
        value={formatNumber(counts?.drafts ?? 0)}
        icon={<ScheduleOutlined />}
        tone="warning"
        caption="Not published"
        isLoading={isLoading}
      />
      <StatCard
        label="System pages"
        value={formatNumber(counts?.system ?? 0)}
        icon={<SettingsSuggestOutlined />}
        tone="info"
        caption="Linked from the website and app"
        isLoading={isLoading}
      />
    </section>
  );
}
