import Close from '@mui/icons-material/Close';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import Drawer from '@mui/material/Drawer';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useRef, useState } from 'react';

import { ActiveFilterChips, type FilterChip } from '@/components/common/ActiveFilterChips';
import { Button } from '@/components/common/Button';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { EmptyState } from '@/components/common/Feedback/EmptyState';
import { ListToolbar, type ToolbarSelect } from '@/components/common/ListToolbar';
import { PageHeading } from '@/components/common/PageHeading';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { PERMISSIONS, ROUTES, SEARCH_DEBOUNCE_MS, STORAGE_KEYS } from '@/utils/constants';
import { formatNumber } from '@/utils/formatters';

import {
  type SystemLogPanelFilters,
  SystemLogFiltersPanel,
} from '../components/SystemLogFiltersPanel';
import { buildSystemLogTableColumns } from '../components/systemLogColumns';
import { SystemLogStatsCards } from '../components/SystemLogStatsCards';
import { SystemLogViewDialog } from '../components/SystemLogViewDialog';
import { useSystemLogExport } from '../hooks/useSystemLogExport';
import {
  isDefaultSystemLogSort,
  rangeParams,
  toSystemLogFilters,
  userParams,
  useSystemLogListParams,
} from '../hooks/useSystemLogListParams';
import { useSystemLogCounts, useSystemLogs } from '../hooks/useSystemLogs';
import type { SystemLog } from '../types/systemLog.types';
import {
  DATE_RANGE_OPTIONS,
  DATE_RANGE_PRESETS,
  isIpAddress,
  moduleLabel,
  moduleOptionsWith,
  rangeLabel,
  SYSTEM_LOG_LEVEL_META,
  SYSTEM_LOG_LEVEL_OPTIONS,
} from '../utils/systemLogDisplay';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

/** `/system-logs`: read-only audit trail with overview counts, filters and log details. */
export function SystemLogsPage() {
  const { can } = usePermissions();
  const canView = can(PERMISSIONS.systemLogView);
  const canListUsers = can(PERMISSIONS.userList);
  const list = useSystemLogListParams();
  const { update, changeSort } = list;
  const [storedPageSize, setPageSize] = useLocalStorage<number>(
    STORAGE_KEYS.systemLogsPageSize,
    10,
  );
  const pageSize = PAGE_SIZE_OPTIONS.find((size) => size === storedPageSize) ?? 10;
  const [panelOpen, setPanelOpen] = useState(false);
  const [viewLog, setViewLog] = useState<SystemLog | null>(null);
  const exporter = useSystemLogExport();

  // Typing is local; the value goes to the URL (and the API) once typing pauses.
  const [searchInput, setSearchInput] = useState(list.search);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(searchTimer.current), []);
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => update({ q: value.trim() }), SEARCH_DEBOUNCE_MS);
  };

  const filters = toSystemLogFilters(list);
  const counts = useSystemLogCounts();
  const { data, isPending, isFetching, error, refetch } = useSystemLogs({
    ...filters,
    page: list.page,
    size: pageSize,
  });

  // A page past the end (e.g. a shared link to page 40 of a shorter list) jumps to the last page.
  useEffect(() => {
    if (data && data.totalPages > 0 && list.page >= data.totalPages) {
      update({ page: data.totalPages - 1 }, false);
    }
  }, [data, list.page, update]);

  const columns = useMemo(
    () => buildSystemLogTableColumns({ onView: canView ? setViewLog : undefined }),
    [canView],
  );

  const moduleOptions = moduleOptionsWith(list.module);
  const customRangeLabel = list.range.preset === 'custom' ? rangeLabel(list.range) : undefined;
  const selects: ToolbarSelect[] = [
    {
      id: 'range',
      label: 'Date range',
      value: list.range.preset ?? '',
      allLabel: 'Any time',
      options: customRangeLabel
        ? [...DATE_RANGE_OPTIONS, { value: 'custom', label: customRangeLabel }]
        : DATE_RANGE_OPTIONS,
      onChange: (value) => {
        // Re-picking the applied custom range keeps its dates.
        if (value === 'custom') return;
        update(rangeParams({ preset: DATE_RANGE_PRESETS.find((preset) => preset === value) }));
      },
    },
    {
      id: 'module',
      label: 'Module',
      value: list.module ?? '',
      allLabel: 'All modules',
      options: moduleOptions,
      onChange: (value) => update({ module: value || undefined }),
    },
    {
      id: 'level',
      label: 'Log level',
      value: list.logLevel ?? '',
      allLabel: 'All levels',
      options: SYSTEM_LOG_LEVEL_OPTIONS,
      onChange: (value) => update({ level: value || undefined }),
    },
  ];

  const search = list.search.trim();
  const chips: FilterChip[] = [];
  if (search) {
    chips.push({
      key: 'q',
      label: isIpAddress(search) ? `IP address: ${search}` : `Action contains: ${search}`,
      onRemove: () => {
        setSearchInput('');
        update({ q: undefined });
      },
    });
  }
  if (list.range.preset) {
    chips.push({
      key: 'range',
      label: `Date: ${rangeLabel(list.range) ?? 'Custom range'}`,
      onRemove: () => update(rangeParams({})),
    });
  }
  if (list.module) {
    chips.push({
      key: 'module',
      label: `Module: ${moduleLabel(list.module)}`,
      onRemove: () => update({ module: undefined }),
    });
  }
  if (list.logLevel) {
    chips.push({
      key: 'level',
      label: `Level: ${SYSTEM_LOG_LEVEL_META[list.logLevel].label}`,
      onRemove: () => update({ level: undefined }),
    });
  }
  if (list.user) {
    chips.push({
      key: 'user',
      label: `User: ${list.user.label}`,
      onRemove: () => update(userParams(null)),
    });
  }
  if (list.referenceId) {
    chips.push({
      key: 'ref',
      label: `Reference ID: ${list.referenceId}`,
      onRemove: () => update({ ref: undefined }),
    });
  }
  const hasFilters = chips.length > 0;
  const panelFilterCount =
    (list.user ? 1 : 0) + (list.referenceId ? 1 : 0) + (isDefaultSystemLogSort(list.sort) ? 0 : 1);

  const appliedPanel: SystemLogPanelFilters = {
    module: list.module ?? '',
    logLevel: list.logLevel ?? '',
    user: list.user,
    range: list.range,
    referenceId: list.referenceId ? String(list.referenceId) : '',
    sort: `${list.sort.field},${list.sort.direction}`,
  };
  const applyPanel = (next: SystemLogPanelFilters) => {
    const [field = 'createdAt', direction = 'desc'] = next.sort.split(',');
    const isDefault = isDefaultSystemLogSort({
      field: field === 'id' ? 'id' : 'createdAt',
      direction: direction === 'asc' ? 'asc' : 'desc',
    });
    update({
      module: next.module || undefined,
      level: next.logLevel || undefined,
      ref: next.referenceId || undefined,
      ...userParams(next.user),
      ...rangeParams(next.range),
      sort: isDefault ? undefined : field,
      dir: isDefault ? undefined : direction,
    });
    setPanelOpen(false);
  };
  const clearAll = () => {
    clearTimeout(searchTimer.current);
    setSearchInput('');
    list.clear();
  };
  const resetPanel = () => {
    update({
      module: undefined,
      level: undefined,
      ref: undefined,
      sort: undefined,
      dir: undefined,
      ...userParams(null),
      ...rangeParams({}),
    });
    setPanelOpen(false);
  };
  const refresh = () => {
    void refetch();
    void counts.refetch();
  };
  const showUserActivity = (user: { id: number; fullName: string }) => {
    setViewLog(null);
    update(userParams({ id: user.id, label: user.fullName }));
  };

  const exportProgress = exporter.progress;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeading
          title="System Logs"
          crumbs={[{ label: 'Dashboard', to: ROUTES.dashboard }, { label: 'System Logs' }]}
        />
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {exporter.isExporting && (
            <Button variant="text" startIcon={<Close />} onClick={exporter.cancel}>
              Cancel export
            </Button>
          )}
          <Button
            variant="outlined"
            size="large"
            startIcon={<FileDownloadOutlined />}
            loading={exporter.isExporting}
            onClick={() => void exporter.start(filters)}
          >
            {exportProgress && exportProgress.total > 0
              ? `Exporting ${formatNumber(exportProgress.loaded)} of ${formatNumber(exportProgress.total)}`
              : 'Export logs'}
          </Button>
        </div>
      </header>

      <SystemLogStatsCards
        counts={counts.data}
        isLoading={counts.isPending}
        error={counts.error}
        onRetry={() => void counts.refetch()}
      />

      <Paper className="min-w-0 overflow-hidden">
        <ListToolbar
          search={searchInput}
          onSearchChange={handleSearchChange}
          searchLabel="Search system logs by action or IP address"
          searchPlaceholder="Search system logs…"
          selects={selects}
          onOpenFilters={() => setPanelOpen(true)}
          panelFilterCount={panelFilterCount}
          onClear={hasFilters || !isDefaultSystemLogSort(list.sort) ? clearAll : undefined}
          onRefresh={refresh}
          refreshLabel="Refresh system logs"
          isRefreshing={isFetching}
        />
        <ActiveFilterChips filters={chips} />
        <div className={isFetching && !isPending ? 'opacity-60 transition-opacity' : undefined}>
          <DataTable
            caption="System logs"
            columns={columns}
            rows={data?.content}
            getRowId={(log) => log.id}
            isLoading={isPending}
            error={error}
            onRetry={() => void refetch()}
            skeletonRows={8}
            emptyState={
              hasFilters ? (
                <EmptyState
                  title="No matching logs"
                  message="No logs match this search or these filters. Try clearing some of them."
                  action={
                    <Button variant="outlined" onClick={clearAll}>
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  title="No logs yet"
                  message="Sign-ins, changes made in the dashboard and denied requests appear here as they happen."
                />
              )
            }
            minWidth={1080}
            sort={{ field: list.sort.field, direction: list.sort.direction, onChange: changeSort }}
            pagination={{
              variant: 'numbered',
              page: list.page,
              pageSize,
              totalElements: data?.totalElements ?? 0,
              pageSizeOptions: PAGE_SIZE_OPTIONS,
              onPageChange: (page) => update({ page }, false),
              onPageSizeChange: (size) => {
                setPageSize(size);
                update({ page: undefined });
              },
            }}
          />
        </div>
      </Paper>

      <Paper
        variant="outlined"
        className="flex items-start gap-2 p-4 text-sm"
        sx={{ bgcolor: 'rgba(var(--mui-palette-primary-mainChannel) / 0.06)' }}
      >
        <InfoOutlined fontSize="small" color="primary" aria-hidden />
        <Typography variant="body2" component="span">
          System logs are append-only: no one can edit or delete an entry, and there is no retention
          or archive policy yet, so the full history is kept. Times are shown in your time zone;
          search matches the action text, or an exact IP address.
        </Typography>
      </Paper>

      <Drawer anchor="right" open={panelOpen} onClose={() => setPanelOpen(false)}>
        <div className="w-[min(22rem,100vw)] p-4">
          <SystemLogFiltersPanel
            // A new key resets the draft whenever the applied filters change elsewhere.
            key={JSON.stringify(appliedPanel)}
            applied={appliedPanel}
            onApply={applyPanel}
            onReset={resetPanel}
            moduleOptions={moduleOptions}
            showUser={canListUsers}
          />
        </div>
      </Drawer>

      <SystemLogViewDialog
        log={viewLog}
        onClose={() => setViewLog(null)}
        onShowUserActivity={showUserActivity}
      />
    </div>
  );
}
