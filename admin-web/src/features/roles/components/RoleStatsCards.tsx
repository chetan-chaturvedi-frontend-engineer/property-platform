import GroupOutlined from '@mui/icons-material/GroupOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import PersonOutline from '@mui/icons-material/PersonOutline';
import VerifiedUserOutlined from '@mui/icons-material/VerifiedUserOutlined';
import Alert from '@mui/material/Alert';

import { Button } from '@/components/common/Button';
import { StatCard } from '@/components/common/StatCard/StatCard';
import { formatNumber } from '@/utils/formatters';

import type { RoleStats } from '../types/role.types';

interface RoleStatsCardsProps {
  stats: RoleStats | undefined;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

/** Overview totals; independent of the roles search. */
export function RoleStatsCards({
  stats,
  isLoading = false,
  error = null,
  onRetry,
}: RoleStatsCardsProps) {
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
        Could not load role statistics. {error.message}
      </Alert>
    );
  }

  return (
    <section
      aria-label="Role statistics"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <StatCard
        label="Total Roles"
        value={formatNumber(stats?.totalRoles ?? 0)}
        icon={<GroupOutlined />}
        tone="primary"
        caption={stats ? `${formatNumber(stats.activeRoles)} active` : 'All roles available'}
        isLoading={isLoading}
      />
      <StatCard
        label="Total Permissions"
        value={formatNumber(stats?.totalPermissions ?? 0)}
        icon={<VerifiedUserOutlined />}
        tone="success"
        caption="System permissions"
        isLoading={isLoading}
      />
      <StatCard
        label="Admin Users"
        value={formatNumber(stats?.adminUsers ?? 0)}
        icon={<PersonOutline />}
        tone="warning"
        caption="With admin panel access"
        isLoading={isLoading}
      />
      <StatCard
        label="Default Roles"
        value={formatNumber(stats?.defaultRoles ?? 0)}
        icon={<LockOutlined />}
        tone="error"
        caption="System default roles"
        isLoading={isLoading}
      />
    </section>
  );
}
