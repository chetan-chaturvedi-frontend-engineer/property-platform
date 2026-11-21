import GppBadOutlined from '@mui/icons-material/GppBadOutlined';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined';
import TodayOutlined from '@mui/icons-material/TodayOutlined';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import Alert from '@mui/material/Alert';

import { Button } from '@/components/common/Button';
import { StatCard } from '@/components/common/StatCard/StatCard';
import { formatNumber } from '@/utils/formatters';

import type { SystemLogCounts } from '../types/systemLog.types';

interface SystemLogStatsCardsProps {
  counts: SystemLogCounts | undefined;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

/**
 * Overview totals; independent of the list filters. The backend has no error level (failures are
 * warnings), so the fourth card counts access denials instead.
 */
export function SystemLogStatsCards({
  counts,
  isLoading = false,
  error = null,
  onRetry,
}: SystemLogStatsCardsProps) {
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
        Could not load log statistics. {error.message}
      </Alert>
    );
  }

  return (
    <section
      aria-label="Log statistics"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <StatCard
        label="Total logs"
        value={formatNumber(counts?.total ?? 0)}
        icon={<HistoryOutlined />}
        tone="primary"
        caption="All recorded activities"
        isLoading={isLoading}
      />
      <StatCard
        label="Today's activities"
        value={formatNumber(counts?.today ?? 0)}
        icon={<TodayOutlined />}
        tone="info"
        caption="Activities recorded today"
        isLoading={isLoading}
      />
      <StatCard
        label="Warning logs"
        value={formatNumber(counts?.warnings ?? 0)}
        icon={<WarningAmberOutlined />}
        tone="warning"
        caption="Failed attempts and risky operations"
        isLoading={isLoading}
      />
      <StatCard
        label="Access denied"
        value={formatNumber(counts?.denied ?? 0)}
        icon={<GppBadOutlined />}
        tone="error"
        caption="Permission and security denials"
        isLoading={isLoading}
      />
    </section>
  );
}
