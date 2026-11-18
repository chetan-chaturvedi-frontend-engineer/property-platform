import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { DataTable } from '@/components/common/DataTable/DataTable';
import { useDebounce } from '@/hooks/useDebounce';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { PAGINATION, SEARCH_DEBOUNCE_MS, STORAGE_KEYS } from '@/utils/constants';

import { systemLogColumns } from '../components/systemLogColumns';
import { useSystemLogs } from '../hooks/useSystemLogs';
import type { SystemLogLevel } from '../types/systemLog.types';

const LEVELS: Array<{ value: SystemLogLevel | ''; label: string }> = [
  { value: '', label: 'All levels' },
  { value: 'info', label: 'Info' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
];

/** Same rule as the backend's `module` filter. */
const MODULE_PATTERN = /^[a-z0-9_]{0,50}$/;

export function ActivityLogPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useLocalStorage<number>(
    STORAGE_KEYS.activityPageSize,
    PAGINATION.defaultPageSize,
  );
  const [moduleInput, setModuleInput] = useState('');
  const [logLevel, setLogLevel] = useState<SystemLogLevel | ''>('');
  const module = useDebounce(moduleInput.trim().toLowerCase(), SEARCH_DEBOUNCE_MS);
  const moduleIsValid = MODULE_PATTERN.test(module);

  const { data, isPending, isFetching, error, refetch } = useSystemLogs(
    {
      page,
      size: Math.min(pageSize, PAGINATION.maxPageSize),
      sort: 'createdAt,desc',
      module: moduleIsValid ? module : undefined,
      logLevel: logLevel || undefined,
    },
    { enabled: moduleIsValid },
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Typography variant="h1">Activity log</Typography>
        <Typography color="text.secondary">
          Every write and permission denial recorded by the platform.
        </Typography>
      </header>

      <Paper className="overflow-hidden">
        <div className="flex flex-col gap-3 p-4 sm:flex-row">
          <TextField
            label="Module"
            placeholder="e.g. faqs"
            value={moduleInput}
            onChange={(event) => {
              setModuleInput(event.target.value);
              setPage(0);
            }}
            error={!moduleIsValid}
            helperText={moduleIsValid ? ' ' : 'Lowercase letters, digits and underscores only'}
            slotProps={{ htmlInput: { maxLength: 50 } }}
            className="sm:max-w-xs"
          />
          <TextField
            select
            label="Level"
            value={logLevel}
            onChange={(event) => {
              setLogLevel(event.target.value as SystemLogLevel | '');
              setPage(0);
            }}
            helperText=" "
            className="sm:max-w-48"
          >
            {LEVELS.map((level) => (
              <MenuItem key={level.value} value={level.value}>
                {level.label}
              </MenuItem>
            ))}
          </TextField>
        </div>
        <div className={isFetching && !isPending ? 'opacity-60 transition-opacity' : undefined}>
          <DataTable
            caption="System log entries"
            columns={systemLogColumns}
            rows={data?.content}
            getRowId={(log) => log.id}
            isLoading={isPending && moduleIsValid}
            error={error}
            onRetry={() => void refetch()}
            emptyMessage="No log entries match these filters."
            pagination={{
              page,
              pageSize,
              totalElements: data?.totalElements ?? 0,
              pageSizeOptions: PAGINATION.pageSizeOptions,
              onPageChange: setPage,
              onPageSizeChange: (size) => {
                setPageSize(size);
                setPage(0);
              },
            }}
          />
        </div>
      </Paper>
    </div>
  );
}
