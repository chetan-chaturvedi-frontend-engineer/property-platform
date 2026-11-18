import Chip from '@mui/material/Chip';

import type { DataTableColumn } from '@/components/common/DataTable/DataTable';
import { formatDateTime, humanizeCode } from '@/utils/formatters';

import type { SystemLog, SystemLogLevel } from '../types/systemLog.types';

const LEVEL_COLORS: Record<SystemLogLevel, 'default' | 'success' | 'warning'> = {
  info: 'default',
  success: 'success',
  warning: 'warning',
};

/** Columns shared by the dashboard card and the full activity page. All values render as text. */
export const systemLogColumns: readonly DataTableColumn<SystemLog>[] = [
  { id: 'createdAt', header: 'When', cell: (log) => formatDateTime(log.createdAt), width: 180 },
  { id: 'action', header: 'Action', cell: (log) => log.action },
  { id: 'module', header: 'Module', cell: (log) => humanizeCode(log.module) },
  { id: 'user', header: 'User', cell: (log) => log.user?.fullName ?? 'System' },
  {
    id: 'level',
    header: 'Level',
    cell: (log) => (
      <Chip size="small" label={humanizeCode(log.logLevel)} color={LEVEL_COLORS[log.logLevel]} />
    ),
  },
];
