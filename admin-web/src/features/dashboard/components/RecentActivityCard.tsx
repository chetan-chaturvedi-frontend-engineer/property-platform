import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { DataTable } from '@/components/common/DataTable/DataTable';
import { ROUTES } from '@/utils/constants';

import { useSystemLogs } from '../hooks/useSystemLogs';

import { systemLogColumns } from './systemLogColumns';

const RECENT_FILTERS = { page: 0, size: 5, sort: 'createdAt,desc' } as const;

export function RecentActivityCard() {
  const { data, isPending, error, refetch } = useSystemLogs(RECENT_FILTERS);

  return (
    <Paper className="overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <Typography variant="h6" component="h2">
          Recent activity
        </Typography>
        <Link component={RouterLink} to={ROUTES.activity} underline="hover" variant="body2">
          View all
        </Link>
      </div>
      <DataTable
        caption="Five most recent system log entries"
        columns={systemLogColumns}
        rows={data?.content}
        getRowId={(log) => log.id}
        isLoading={isPending}
        error={error}
        onRetry={() => void refetch()}
        emptyMessage="No activity has been recorded yet."
      />
    </Paper>
  );
}
