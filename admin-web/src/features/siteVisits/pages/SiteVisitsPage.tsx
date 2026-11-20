import Add from '@mui/icons-material/Add';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import GroupOutlined from '@mui/icons-material/GroupOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import NavigateNext from '@mui/icons-material/NavigateNext';
import SyncAltOutlined from '@mui/icons-material/SyncAltOutlined';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Drawer from '@mui/material/Drawer';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { Button } from '@/components/common/Button';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { EmptyState } from '@/components/common/Feedback/EmptyState';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ROUTES, SEARCH_DEBOUNCE_MS, STORAGE_KEYS } from '@/utils/constants';
import { formatNumber } from '@/utils/formatters';

import { BulkActionsBar } from '@/components/common/BulkActionsBar';
import { DonutChartCard } from '../components/DonutChartCard';
import { QuickActionsCard, type QuickAction } from '../components/QuickActionsCard';
import { RecentVisitsCard } from '../components/RecentVisitsCard';
import { type ActiveDialog, SiteVisitDialogs } from '../components/SiteVisitDialogs';
import { SiteVisitCalendarView } from '../components/SiteVisitCalendarView';
import { buildSiteVisitColumns } from '../components/siteVisitColumns';
import {
  type SiteVisitPanelFilters,
  SiteVisitFiltersPanel,
} from '../components/SiteVisitFiltersPanel';
import { SiteVisitStatsCards } from '../components/SiteVisitStatsCards';
import { SiteVisitToolbar } from '../components/SiteVisitToolbar';
import { useSiteVisitExport } from '../hooks/useSiteVisitExport';
import {
  DEFAULT_SITE_VISIT_SORT,
  PANEL_KEYS,
  useSiteVisitListParams,
} from '../hooks/useSiteVisitListParams';
import { useSiteVisitPermissions } from '../hooks/useSiteVisitPermissions';
import { useSiteVisits, useSiteVisitStats } from '../hooks/useSiteVisits';
import {
  SITE_VISIT_STATUSES,
  SITE_VISIT_TYPES,
  type SiteVisitStatus,
} from '../types/siteVisit.types';
import {
  propertyNow,
  SITE_VISIT_STATUS_META,
  SITE_VISIT_TYPE_COLORS,
  SITE_VISIT_TYPE_LABELS,
} from '../utils/siteVisitDisplay';

/** Matches the reference design; the API caps pages at 100. */
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const RECENT_COUNT = 5;

const isStatus = (value: string): value is SiteVisitStatus =>
  SITE_VISIT_STATUSES.some((status) => status === value);

export function SiteVisitsPage() {
  const permissions = useSiteVisitPermissions();
  const list = useSiteVisitListParams();
  const { update } = list;
  const [storedPageSize, setPageSize] = useLocalStorage<number>(
    STORAGE_KEYS.siteVisitsPageSize,
    10,
  );
  const pageSize = PAGE_SIZE_OPTIONS.find((size) => size === storedPageSize) ?? 10;
  // The panel sits beside the table on wide screens and in a drawer elsewhere.
  const panelInline = useMediaQuery((theme) => theme.breakpoints.up('xl'));
  const [panelOpen, setPanelOpen] = useState(false);
  const [dialog, setDialog] = useState<ActiveDialog | null>(null);
  const today = propertyNow().date;

  // Typing is local; the value goes to the URL (and the API) once typing pauses.
  const [searchInput, setSearchInput] = useState(list.search);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(searchTimer.current), []);
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => update({ q: value.trim() }), SEARCH_DEBOUNCE_MS);
  };

  const sharedFilters = {
    search: list.search || undefined,
    status: list.status,
    visitType: list.visitType,
    interest: list.interest,
    propertyId: list.property?.id,
    assignId: list.agent?.id,
  };
  const dateRangeIsValid =
    !list.visitDateFrom || !list.visitDateTo || list.visitDateFrom <= list.visitDateTo;
  const listFilters = {
    ...sharedFilters,
    visitDateFrom: dateRangeIsValid ? list.visitDateFrom || undefined : undefined,
    visitDateTo: dateRangeIsValid ? list.visitDateTo || undefined : undefined,
    sort: `${list.sort.field},${list.sort.direction}`,
  };

  const stats = useSiteVisitStats();
  const { data, isPending, isFetching, error, refetch } = useSiteVisits(
    { ...listFilters, page: list.page, size: pageSize },
    { enabled: list.view === 'list' },
  );
  const recent = useSiteVisits({ page: 0, size: RECENT_COUNT, sort: 'updatedAt,desc' });
  const exporter = useSiteVisitExport();

  // Selection belongs to one page of one query; changing either starts a fresh selection.
  const selectionKey = JSON.stringify([listFilters, list.page, pageSize]);
  const [selection, setSelection] = useState<{ key: string; ids: Set<number> }>({
    key: selectionKey,
    ids: new Set(),
  });
  const selectedIds = selection.key === selectionKey ? selection.ids : new Set<number>();
  const selectedVisits = (data?.content ?? []).filter((visit) => selectedIds.has(visit.id));
  const clearSelection = () => setSelection({ key: selectionKey, ids: new Set() });

  // A page past the end (e.g. after deletions elsewhere or an edited URL) jumps to the last page.
  useEffect(() => {
    if (data && data.totalPages > 0 && list.page >= data.totalPages) {
      update({ page: data.totalPages - 1 }, false);
    }
  }, [data, list.page, update]);

  const { canView, canEdit, canDelete, canChangeStatus, canAssign, canSubmitReport } = permissions;
  const columns = useMemo(
    () =>
      buildSiteVisitColumns({
        onView: canView ? (visit) => setDialog({ kind: 'view', id: visit.id }) : undefined,
        onEdit: canEdit ? (visit) => setDialog({ kind: 'edit', id: visit.id }) : undefined,
        onReschedule: canEdit ? (visit) => setDialog({ kind: 'reschedule', visit }) : undefined,
        onChangeStatus: canChangeStatus
          ? (visit) => setDialog({ kind: 'status', visits: [visit] })
          : undefined,
        onAssign: canAssign ? (visit) => setDialog({ kind: 'assign', visit }) : undefined,
        onReport: canSubmitReport
          ? (visit) => setDialog({ kind: 'report', id: visit.id })
          : undefined,
        onDelete: canDelete ? (visit) => setDialog({ kind: 'delete', visits: [visit] }) : undefined,
      }),
    [canView, canEdit, canChangeStatus, canAssign, canSubmitReport, canDelete, setDialog],
  );
  const bulkEnabled = canChangeStatus || canDelete;

  const appliedPanel: SiteVisitPanelFilters = {
    property: list.property,
    agent: list.agent,
    visitType: list.visitType ?? '',
    interest: list.interest ?? '',
  };
  const panelFilterCount = Object.values(appliedPanel).filter(
    (value) => value !== '' && value !== null,
  ).length;
  const hasFilters = Boolean(
    list.search || list.status || list.visitDateFrom || list.visitDateTo || panelFilterCount > 0,
  );
  const sortChanged =
    list.sort.field !== DEFAULT_SITE_VISIT_SORT.field ||
    list.sort.direction !== DEFAULT_SITE_VISIT_SORT.direction;

  const applyPanel = (filters: SiteVisitPanelFilters) => {
    update({
      property: filters.property?.id,
      propertyName: filters.property?.label,
      agent: filters.agent?.id,
      agentName: filters.agent?.label,
      type: filters.visitType,
      interest: filters.interest,
    });
    setPanelOpen(false);
  };
  const resetPanel = () => {
    update(Object.fromEntries(PANEL_KEYS.map((key) => [key, undefined])));
    setPanelOpen(false);
  };
  const clearAll = () => {
    clearTimeout(searchTimer.current);
    setSearchInput('');
    list.clear();
  };
  const refreshAll = () => {
    void refetch();
    void stats.refetch();
    void recent.refetch();
  };

  const quickActions: QuickAction[] = [
    ...(permissions.canCreate
      ? [
          {
            key: 'schedule',
            label: 'Schedule visit',
            icon: <EventAvailableOutlined fontSize="small" />,
            onClick: () => setDialog({ kind: 'create' }),
          },
        ]
      : []),
    {
      key: 'calendar',
      label: list.view === 'calendar' ? 'View list' : 'View calendar',
      icon: <CalendarMonthOutlined fontSize="small" />,
      onClick: () => update({ view: list.view === 'calendar' ? undefined : 'calendar' }),
    },
    ...(permissions.canManageAgents
      ? [
          {
            key: 'agents',
            label: 'Manage agents',
            icon: <GroupOutlined fontSize="small" />,
            to: ROUTES.users,
          },
        ]
      : []),
  ];

  const panel = (
    <SiteVisitFiltersPanel
      // A new key resets the draft whenever the applied filters change elsewhere.
      key={JSON.stringify(appliedPanel)}
      applied={appliedPanel}
      onApply={applyPanel}
      onReset={resetPanel}
      showProperty={permissions.canPickProperties}
      showAgent={permissions.canPickUsers}
    />
  );
  const total = stats.data?.total ?? 0;
  const calendarMonth = list.month || today.slice(0, 7);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Typography variant="h1">Site visits</Typography>
          <Breadcrumbs
            aria-label="Breadcrumb"
            separator={<NavigateNext fontSize="small" />}
            className="mt-1"
          >
            <Link component={RouterLink} to={ROUTES.dashboard} underline="hover">
              Dashboard
            </Link>
            <Typography color="text.secondary" aria-current="page">
              Site visits
            </Typography>
          </Breadcrumbs>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <Button
            variant="outlined"
            size="large"
            startIcon={<FileDownloadOutlined />}
            loading={exporter.isExporting}
            onClick={() => void exporter.start(listFilters)}
          >
            {exporter.progress && exporter.progress.total > 0
              ? `Exporting ${exporter.progress.loaded}/${exporter.progress.total}`
              : 'Export'}
          </Button>
          {exporter.isExporting && (
            <Button variant="text" size="large" onClick={exporter.cancel}>
              Cancel export
            </Button>
          )}
          {permissions.canCreate && (
            <Button startIcon={<Add />} size="large" onClick={() => setDialog({ kind: 'create' })}>
              Schedule visit
            </Button>
          )}
        </div>
      </header>

      <SiteVisitStatsCards
        stats={stats.data}
        isLoading={stats.isPending}
        error={stats.error}
        onRetry={() => void stats.refetch()}
      />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Paper className="min-w-0 overflow-hidden">
          <div className="border-b px-4 pt-2">
            <Tabs
              value={list.status ?? 'all'}
              onChange={(_, value: string) =>
                update({ status: isStatus(value) ? value : undefined })
              }
              variant="scrollable"
              allowScrollButtonsMobile
              aria-label="Filter site visits by status"
              textColor="inherit"
              sx={{
                '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 52 },
                '& .Mui-selected': { color: 'var(--app-primary-strong)' },
                '& .MuiTabs-indicator': { backgroundColor: 'var(--app-primary-strong)', height: 3 },
              }}
            >
              <Tab
                value="all"
                label={stats.data ? `All visits (${formatNumber(total)})` : 'All visits'}
              />
              {SITE_VISIT_STATUSES.map((status) => {
                const count = stats.data?.byStatus[status];
                const label = SITE_VISIT_STATUS_META[status].label;
                return (
                  <Tab
                    key={status}
                    value={status}
                    label={count === undefined ? label : `${label} (${formatNumber(count)})`}
                  />
                );
              })}
            </Tabs>
          </div>
          <SiteVisitToolbar
            view={list.view}
            onViewChange={(view) => update({ view: view === 'list' ? undefined : view })}
            search={searchInput}
            onSearchChange={handleSearchChange}
            dateFrom={list.visitDateFrom}
            dateTo={list.visitDateTo}
            onDateChange={(from, to) => update({ from, to })}
            onOpenFilters={panelInline ? undefined : () => setPanelOpen(true)}
            panelFilterCount={panelFilterCount}
            onClear={hasFilters || sortChanged ? clearAll : undefined}
            onRefresh={refreshAll}
            isRefreshing={isFetching}
          />
          {list.view === 'calendar' ? (
            <SiteVisitCalendarView
              month={calendarMonth}
              today={today}
              filters={sharedFilters}
              onMonthChange={(month) =>
                update({ month: month === today.slice(0, 7) ? undefined : month })
              }
              onSelectVisit={
                canView ? (visit) => setDialog({ kind: 'view', id: visit.id }) : undefined
              }
              onSelectDay={(date) => update({ view: undefined, from: date, to: date })}
            />
          ) : (
            <>
              {bulkEnabled && (
                <BulkActionsBar count={selectedVisits.length} onClear={clearSelection}>
                  {canChangeStatus && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<SyncAltOutlined />}
                      onClick={() => setDialog({ kind: 'status', visits: selectedVisits })}
                    >
                      Change status
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteOutline />}
                      onClick={() => setDialog({ kind: 'delete', visits: selectedVisits })}
                    >
                      Delete
                    </Button>
                  )}
                </BulkActionsBar>
              )}
              <div
                className={isFetching && !isPending ? 'opacity-60 transition-opacity' : undefined}
              >
                <DataTable
                  caption="Site visits"
                  columns={columns}
                  rows={data?.content}
                  getRowId={(visit) => visit.id}
                  isLoading={isPending}
                  error={error}
                  onRetry={() => void refetch()}
                  emptyState={
                    hasFilters ? (
                      <EmptyState
                        title="No matching visits"
                        message="No site visits match these filters. Try clearing some of them."
                        action={
                          <Button variant="outlined" onClick={clearAll}>
                            Clear filters
                          </Button>
                        }
                      />
                    ) : (
                      <EmptyState
                        title="No site visits yet"
                        message="Scheduled visits will appear here."
                        action={
                          permissions.canCreate && (
                            <Button
                              startIcon={<Add />}
                              onClick={() => setDialog({ kind: 'create' })}
                            >
                              Schedule visit
                            </Button>
                          )
                        }
                      />
                    )
                  }
                  minWidth={1120}
                  selection={
                    bulkEnabled
                      ? {
                          selected: selectedIds,
                          onChange: (ids) => setSelection({ key: selectionKey, ids }),
                          rowLabel: (id) =>
                            `Select ${data?.content.find((visit) => visit.id === id)?.visitCode ?? id}`,
                        }
                      : undefined
                  }
                  sort={{
                    field: list.sort.field,
                    direction: list.sort.direction,
                    onChange: (field, direction) => {
                      const isDefault =
                        field === DEFAULT_SITE_VISIT_SORT.field &&
                        direction === DEFAULT_SITE_VISIT_SORT.direction;
                      update({
                        sort: isDefault ? undefined : field,
                        dir: isDefault ? undefined : direction,
                      });
                    },
                  }}
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
            </>
          )}
        </Paper>

        <aside className="flex flex-col gap-6" aria-label="Site visit insights and filters">
          <DonutChartCard
            title="Visits by status"
            total={total}
            isLoading={stats.isPending}
            items={SITE_VISIT_STATUSES.map((status) => ({
              key: status,
              label: SITE_VISIT_STATUS_META[status].label,
              color: SITE_VISIT_STATUS_META[status].color,
              count: stats.data?.byStatus[status] ?? 0,
            }))}
            selectedKey={list.status}
            onSelect={(key) =>
              update({ status: isStatus(key) && key !== list.status ? key : undefined })
            }
          />
          <DonutChartCard
            title="Visits by type"
            total={total}
            isLoading={stats.isPending}
            items={SITE_VISIT_TYPES.map((type) => ({
              key: type,
              label: SITE_VISIT_TYPE_LABELS[type],
              color: SITE_VISIT_TYPE_COLORS[type],
              count: stats.data?.byVisitType[type] ?? 0,
            }))}
            selectedKey={list.visitType}
            onSelect={(key) =>
              update({
                type: SITE_VISIT_TYPES.find((type) => type === key && key !== list.visitType),
              })
            }
          />
          {panelInline && <Paper className="p-4">{panel}</Paper>}
          <QuickActionsCard actions={quickActions} />
          <RecentVisitsCard
            visits={recent.data?.content}
            isLoading={recent.isPending}
            error={recent.error}
            onRetry={() => void recent.refetch()}
            onSelect={canView ? (visit) => setDialog({ kind: 'view', id: visit.id }) : undefined}
          />
        </aside>
      </div>

      <Paper
        variant="outlined"
        className="flex items-start gap-2 p-4 text-sm"
        sx={{ bgcolor: 'rgba(var(--mui-palette-primary-mainChannel) / 0.06)' }}
      >
        <InfoOutlined fontSize="small" color="primary" aria-hidden />
        <span>
          <strong>Tip:</strong> visit dates and times are local to the property. Moving an upcoming
          visit marks it rescheduled; completed, cancelled and no-show visits are final.
        </span>
      </Paper>

      {!panelInline && (
        <Drawer anchor="right" open={panelOpen} onClose={() => setPanelOpen(false)}>
          <div className="w-[min(22rem,100vw)] p-4">{panel}</div>
        </Drawer>
      )}

      <SiteVisitDialogs
        dialog={dialog}
        onChange={setDialog}
        canEdit={canEdit}
        onBulkDone={clearSelection}
        onDeleted={(count) => {
          // Removing every row on a later page would leave an empty page behind.
          if (list.page > 0 && data && count >= data.content.length) {
            update({ page: list.page - 1 }, false);
          }
        }}
      />
    </div>
  );
}
