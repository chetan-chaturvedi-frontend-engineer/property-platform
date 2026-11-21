import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import Typography from '@mui/material/Typography';

import { Button } from '@/components/common/Button';
import type { DataTableColumn } from '@/components/common/DataTable/DataTable';
import { formatDateTime } from '@/utils/formatters';

import type { SystemLog } from '../types/systemLog.types';
import { actorLabel, formatLogId, moduleLabel } from '../utils/systemLogDisplay';

import { SystemLogActor } from './SystemLogActor';
import { SystemLogLevelChip } from './SystemLogLevelChip';

/** Compact columns of the dashboard's recent activity card. All values render as text. */
export const systemLogColumns: readonly DataTableColumn<SystemLog>[] = [
  { id: 'createdAt', header: 'When', cell: (log) => formatDateTime(log.createdAt), width: 180 },
  { id: 'action', header: 'Action', cell: (log) => log.action },
  { id: 'module', header: 'Module', cell: (log) => moduleLabel(log.module) },
  { id: 'user', header: 'User', cell: (log) => actorLabel(log).name },
  { id: 'level', header: 'Level', cell: (log) => <SystemLogLevelChip level={log.logLevel} /> },
];

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const timeFormatter = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });

interface SystemLogTableHandlers {
  /** Opens the details; omitted without `SYSTEM_LOG_VIEW`. */
  onView?: (log: SystemLog) => void;
}

/** Columns of the System Logs page. Only `id` and `createdAt` are sortable on the backend. */
export function buildSystemLogTableColumns({
  onView,
}: SystemLogTableHandlers): DataTableColumn<SystemLog>[] {
  const columns: DataTableColumn<SystemLog>[] = [
    {
      id: 'id',
      header: 'ID',
      sortField: 'id',
      width: 120,
      cell: (log) => (
        <Typography variant="body2" fontWeight={600} noWrap>
          {formatLogId(log.id)}
        </Typography>
      ),
    },
    { id: 'user', header: 'User', cell: (log) => <SystemLogActor log={log} /> },
    {
      id: 'module',
      header: 'Module',
      cell: (log) => (
        <Typography variant="body2" noWrap>
          {moduleLabel(log.module)}
        </Typography>
      ),
    },
    {
      id: 'action',
      header: 'Action',
      cell: (log) => (
        <div className="max-w-80 min-w-48">
          <Typography variant="body2" className="line-clamp-2 break-words" title={log.action}>
            {log.action}
          </Typography>
          {log.referenceType && (
            <Typography variant="caption" color="text.secondary" noWrap component="p">
              {log.referenceType}
              {log.referenceId !== null && ` #${log.referenceId}`}
            </Typography>
          )}
        </div>
      ),
    },
    {
      id: 'level',
      header: 'Log level',
      cell: (log) => <SystemLogLevelChip level={log.logLevel} />,
    },
    {
      id: 'ipAddress',
      header: 'IP address',
      cell: (log) => (
        <Typography variant="body2" noWrap className="font-mono text-[0.8rem]">
          {log.ipAddress ?? '—'}
        </Typography>
      ),
    },
    {
      id: 'createdAt',
      header: 'Date & time',
      sortField: 'createdAt',
      width: 150,
      cell: (log) => {
        const date = new Date(log.createdAt);
        return (
          <time dateTime={log.createdAt} className="block whitespace-nowrap">
            <Typography variant="body2" component="span" className="block">
              {dateFormatter.format(date)}
            </Typography>
            <Typography variant="caption" color="text.secondary" component="span">
              {timeFormatter.format(date)}
            </Typography>
          </time>
        );
      },
    },
  ];
  if (onView) {
    columns.push({
      id: 'details',
      header: 'Details',
      align: 'center',
      cell: (log) => (
        <Button
          size="small"
          variant="outlined"
          startIcon={<VisibilityOutlined fontSize="small" />}
          onClick={() => onView(log)}
          aria-label={`View details of ${formatLogId(log.id)}`}
        >
          View
        </Button>
      ),
    });
  }
  return columns;
}
