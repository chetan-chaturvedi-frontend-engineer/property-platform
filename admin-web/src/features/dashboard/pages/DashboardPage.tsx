import AdminPanelSettings from '@mui/icons-material/AdminPanelSettings';
import History from '@mui/icons-material/History';
import VerifiedUser from '@mui/icons-material/VerifiedUser';
import Typography from '@mui/material/Typography';

import { PermissionGate } from '@/features/auth/components/PermissionGate';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useAuthStore } from '@/store/authStore';
import { PERMISSIONS } from '@/utils/constants';
import { formatNumber } from '@/utils/formatters';

import { RecentActivityCard } from '../components/RecentActivityCard';
import { StatCard } from '../components/StatCard';
import { useSystemLogs } from '../hooks/useSystemLogs';

const TOTAL_ONLY = { page: 0, size: 1 } as const;

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const { can } = usePermissions();
  const canListLogs = can(PERMISSIONS.systemLogList);
  const logTotal = useSystemLogs(TOTAL_ONLY, { enabled: canListLogs });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Typography variant="h1">
          Welcome back{user ? `, ${user.fullName.split(' ')[0]}` : ''}
        </Typography>
        <Typography color="text.secondary">Here is what is happening on the platform.</Typography>
      </header>

      <section
        aria-label="Summary"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        <StatCard label="Your role" value={user?.role.name ?? '—'} icon={<AdminPanelSettings />} />
        <StatCard
          label="Permissions granted"
          value={formatNumber(user?.permissions.length)}
          icon={<VerifiedUser />}
        />
        {canListLogs && (
          <StatCard
            label="Logged events"
            value={logTotal.isError ? '—' : formatNumber(logTotal.data?.totalElements)}
            icon={<History />}
            isLoading={logTotal.isPending}
          />
        )}
      </section>

      <PermissionGate permissions={[PERMISSIONS.systemLogList]}>
        <RecentActivityCard />
      </PermissionGate>
    </div>
  );
}
