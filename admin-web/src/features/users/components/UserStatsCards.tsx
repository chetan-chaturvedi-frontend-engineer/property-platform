import GroupOutlined from '@mui/icons-material/GroupOutlined';
import HowToRegOutlined from '@mui/icons-material/HowToRegOutlined';
import PersonOffOutlined from '@mui/icons-material/PersonOffOutlined';
import PendingActionsOutlined from '@mui/icons-material/PendingActionsOutlined';
import Alert from '@mui/material/Alert';

import { Button } from '@/components/common/Button';
import { StatCard } from '@/components/common/StatCard/StatCard';
import { formatNumber } from '@/utils/formatters';

import { useUserStats } from '../hooks/useUsers';

function shareOf(part: number, total: number): string {
  if (total === 0) {
    return '0% of all users';
  }
  return `${Math.round((part / total) * 1000) / 10}% of all users`;
}

/** Totals from `GET /admin/users/stats`; independent of the list filters below. */
export function UserStatsCards() {
  const { data, isPending, error, refetch } = useUserStats();

  if (error && !data) {
    return (
      <Alert
        severity="error"
        action={
          <Button size="small" variant="text" color="inherit" onClick={() => void refetch()}>
            Retry
          </Button>
        }
      >
        Could not load user statistics. {error.message}
      </Alert>
    );
  }

  const total = data?.total ?? 0;
  const byStatus = data?.byStatus;
  const cards = [
    {
      label: 'Total users',
      value: total,
      icon: <GroupOutlined />,
      tone: 'primary' as const,
      caption: 'All non-deleted accounts',
    },
    {
      label: 'Active users',
      value: byStatus?.active ?? 0,
      icon: <HowToRegOutlined />,
      tone: 'success' as const,
    },
    {
      label: 'Pending users',
      value: byStatus?.pending ?? 0,
      icon: <PendingActionsOutlined />,
      tone: 'warning' as const,
    },
    {
      label: 'Inactive users',
      value: byStatus?.inactive ?? 0,
      icon: <PersonOffOutlined />,
      tone: 'neutral' as const,
    },
  ];

  return (
    <section
      aria-label="User statistics"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {cards.map((card) => (
        <StatCard
          key={card.label}
          label={card.label}
          value={formatNumber(card.value)}
          icon={card.icon}
          tone={card.tone}
          caption={card.caption ?? shareOf(card.value, total)}
          isLoading={isPending}
        />
      ))}
    </section>
  );
}
