import Add from '@mui/icons-material/Add';
import CompareArrowsOutlined from '@mui/icons-material/CompareArrowsOutlined';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import NavigateNext from '@mui/icons-material/NavigateNext';
import PauseCircleOutline from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutline from '@mui/icons-material/PlayCircleOutline';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Drawer from '@mui/material/Drawer';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { ActiveFilterChips } from '@/components/common/ActiveFilterChips';
import { BulkActionsBar } from '@/components/common/BulkActionsBar';
import { Button } from '@/components/common/Button';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { EmptyState } from '@/components/common/Feedback/EmptyState';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ROUTES, SEARCH_DEBOUNCE_MS, STORAGE_KEYS } from '@/utils/constants';
import { formatNumber } from '@/utils/formatters';

import { buildPlanColumns } from '../components/planColumns';
import { type ActivePlanDialog, PlanDialogs } from '../components/PlanDialogs';
import { PlanFiltersPanel } from '../components/PlanFiltersPanel';
import { PlanStatsCards } from '../components/PlanStatsCards';
import { PlanToolbar } from '../components/PlanToolbar';
import { usePlanExport } from '../hooks/usePlanExport';
import {
  DEFAULT_PLAN_SORT,
  PANEL_KEYS,
  toPlanFilters,
  usePlanListParams,
} from '../hooks/usePlanListParams';
import { usePlanPermissions } from '../hooks/usePlanPermissions';
import { usePlanCounts, useSubscriptionPlans } from '../hooks/useSubscriptionPlans';
import { PLAN_STATUSES, type PlanStatus } from '../types/subscriptionPlan.types';
import { PLAN_STATUS_META } from '../utils/planDisplay';
import { activeFilterChips, type PlanPanelFilters, SORT_OPTIONS } from '../utils/planFilters';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
/** Side-by-side columns stay readable up to four plans. */
const MAX_COMPARE = 4;

const isStatus = (value: string): value is PlanStatus =>
  PLAN_STATUSES.some((status) => status === value);

export function SubscriptionPlansPage() {
  const permissions = usePlanPermissions();
  const list = usePlanListParams();
  const { update } = list;
  const [storedPageSize, setPageSize] = useLocalStorage<number>(
    STORAGE_KEYS.subscriptionPlansPageSize,
    10,
  );
  const pageSize = PAGE_SIZE_OPTIONS.find((size) => size === storedPageSize) ?? 10;
  const [panelOpen, setPanelOpen] = useState(false);
  const [dialog, setDialog] = useState<ActivePlanDialog | null>(null);

  // Typing is local; the value goes to the URL (and the API) once typing pauses.
  const [searchInput, setSearchInput] = useState(list.search);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(searchTimer.current), []);
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => update({ q: value.trim() }), SEARCH_DEBOUNCE_MS);
  };

  const filters = toPlanFilters(list);
  const counts = usePlanCounts();
  const { data, isPending, isFetching, error, refetch } = useSubscriptionPlans({
    ...filters,
    page: list.page,
    size: pageSize,
  });
  const exporter = usePlanExport();

  // Selection belongs to one page of one query; changing either starts a fresh selection.
  const selectionKey = JSON.stringify([filters, list.page, pageSize]);
  const [selection, setSelection] = useState<{ key: string; ids: Set<number> }>({
    key: selectionKey,
    ids: new Set(),
  });
  const selectedIds = selection.key === selectionKey ? selection.ids : new Set<number>();
  const selectedPlans = (data?.content ?? []).filter((plan) => selectedIds.has(plan.id));
  const clearSelection = () => setSelection({ key: selectionKey, ids: new Set() });

  // A page past the end (e.g. an edited URL) jumps to the last page.
  useEffect(() => {
    if (data && data.totalPages > 0 && list.page >= data.totalPages) {
      update({ page: data.totalPages - 1 }, false);
    }
  }, [data, list.page, update]);

  const { canView, canEdit, canCreate, canDuplicate, canChangeStatus } = permissions;
  const columns = useMemo(
    () =>
      buildPlanColumns({
        onView: canView ? (plan) => setDialog({ kind: 'view', id: plan.id }) : undefined,
        onEdit: canEdit ? (plan) => setDialog({ kind: 'edit', id: plan.id }) : undefined,
        onDuplicate: canDuplicate ? (plan) => setDialog({ kind: 'duplicate', plan }) : undefined,
        onChangeStatus: canChangeStatus
          ? (plan, status) => setDialog({ kind: 'status', plans: [plan], status })
          : undefined,
      }),
    [canView, canEdit, canDuplicate, canChangeStatus, setDialog],
  );

  const appliedPanel: PlanPanelFilters = {
    billingInterval: list.billingInterval ?? '',
    popular: list.popular ?? '',
    minPrice: list.minPrice,
    maxPrice: list.maxPrice,
    createdFrom: list.createdFrom,
    createdTo: list.createdTo,
  };
  const chips = activeFilterChips(appliedPanel, (keys) =>
    update(Object.fromEntries(keys.map((key) => [key, undefined]))),
  );
  const hasFilters = Boolean(list.search || list.status || chips.length > 0);
  const sortChanged =
    list.sort.field !== DEFAULT_PLAN_SORT.field ||
    list.sort.direction !== DEFAULT_PLAN_SORT.direction;

  const applyPanel = (next: PlanPanelFilters) => {
    update({
      interval: next.billingInterval,
      popular: next.popular,
      min: next.minPrice,
      max: next.maxPrice,
      from: next.createdFrom,
      to: next.createdTo,
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
  const changeSort = (field: string, direction: 'asc' | 'desc') => {
    const isDefault =
      field === DEFAULT_PLAN_SORT.field && direction === DEFAULT_PLAN_SORT.direction;
    update({ sort: isDefault ? undefined : field, dir: isDefault ? undefined : direction });
  };

  const compareCount = selectedPlans.length;
  const canCompare = compareCount >= 2 && compareCount <= MAX_COMPARE;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Typography variant="h1">Packages &amp; plans</Typography>
          <Breadcrumbs
            aria-label="Breadcrumb"
            separator={<NavigateNext fontSize="small" />}
            className="mt-1"
          >
            <Link component={RouterLink} to={ROUTES.dashboard} underline="hover">
              Dashboard
            </Link>
            <Typography color="text.secondary" aria-current="page">
              Packages &amp; plans
            </Typography>
          </Breadcrumbs>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <Button
            variant="outlined"
            size="large"
            startIcon={<FileDownloadOutlined />}
            loading={exporter.isExporting}
            onClick={() => void exporter.start(filters)}
          >
            Export CSV
          </Button>
          {canCreate && (
            <Button startIcon={<Add />} size="large" onClick={() => setDialog({ kind: 'create' })}>
              Add new plan
            </Button>
          )}
        </div>
      </header>

      <PlanStatsCards
        counts={counts.data}
        isLoading={counts.isPending}
        error={counts.error}
        onRetry={() => void counts.refetch()}
      />

      <Paper className="min-w-0 overflow-hidden">
        <div className="border-b px-4 pt-2">
          <Tabs
            value={list.status ?? 'all'}
            onChange={(_, value: string) => update({ status: isStatus(value) ? value : undefined })}
            variant="scrollable"
            allowScrollButtonsMobile
            aria-label="Filter plans by status"
            textColor="inherit"
            sx={{
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 52 },
              '& .Mui-selected': { color: 'var(--app-primary-strong)' },
              '& .MuiTabs-indicator': { backgroundColor: 'var(--app-primary-strong)', height: 3 },
            }}
          >
            <Tab
              value="all"
              label={counts.data ? `All plans (${formatNumber(counts.data.total)})` : 'All plans'}
            />
            {PLAN_STATUSES.map((status) => {
              const count = counts.data?.byStatus[status];
              const label = PLAN_STATUS_META[status].label;
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
        <PlanToolbar
          search={searchInput}
          onSearchChange={handleSearchChange}
          searchLabel="Search plans"
          searchPlaceholder="Search by plan name or slug…"
          sort={`${list.sort.field},${list.sort.direction}`}
          sortOptions={SORT_OPTIONS}
          onSortChange={changeSort}
          onOpenFilters={() => setPanelOpen(true)}
          panelFilterCount={chips.length}
          onClear={hasFilters || sortChanged ? clearAll : undefined}
          onRefresh={() => {
            void refetch();
            void counts.refetch();
          }}
          isRefreshing={isFetching}
        />
        <ActiveFilterChips filters={chips} />
        <BulkActionsBar count={selectedPlans.length} onClear={clearSelection}>
          <Tooltip
            title={canCompare ? '' : `Select 2 to ${MAX_COMPARE} plans to compare`}
            disableHoverListener={canCompare}
          >
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<CompareArrowsOutlined />}
                disabled={!canCompare}
                onClick={() => setDialog({ kind: 'compare', plans: selectedPlans })}
              >
                Compare
              </Button>
            </span>
          </Tooltip>
          {canChangeStatus && (
            <>
              <Button
                size="small"
                variant="outlined"
                startIcon={<PlayCircleOutline />}
                onClick={() =>
                  setDialog({ kind: 'status', plans: selectedPlans, status: 'active' })
                }
              >
                Activate
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<PauseCircleOutline />}
                onClick={() =>
                  setDialog({ kind: 'status', plans: selectedPlans, status: 'inactive' })
                }
              >
                Deactivate
              </Button>
            </>
          )}
        </BulkActionsBar>
        <div className={isFetching && !isPending ? 'opacity-60 transition-opacity' : undefined}>
          <DataTable
            caption="Subscription plans"
            columns={columns}
            rows={data?.content}
            getRowId={(plan) => plan.id}
            isLoading={isPending}
            error={error}
            onRetry={() => void refetch()}
            emptyState={
              hasFilters ? (
                <EmptyState
                  title="No matching plans"
                  message="No plans match these filters. Try clearing some of them."
                  action={
                    <Button variant="outlined" onClick={clearAll}>
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  title="No plans yet"
                  message="Create the packages users can subscribe to."
                  action={
                    canCreate && (
                      <Button startIcon={<Add />} onClick={() => setDialog({ kind: 'create' })}>
                        Add new plan
                      </Button>
                    )
                  }
                />
              )
            }
            minWidth={1180}
            selection={{
              selected: selectedIds,
              onChange: (ids) => setSelection({ key: selectionKey, ids }),
              rowLabel: (id) =>
                `Select ${data?.content.find((plan) => plan.id === id)?.title ?? id}`,
            }}
            sort={{
              field: list.sort.field,
              direction: list.sort.direction,
              onChange: changeSort,
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
      </Paper>

      <Paper
        variant="outlined"
        className="flex items-start gap-2 p-4 text-sm"
        sx={{ bgcolor: 'rgba(var(--mui-palette-primary-mainChannel) / 0.06)' }}
      >
        <InfoOutlined fontSize="small" color="primary" aria-hidden />
        <span>
          <strong>Tip:</strong> only active plans are offered to users. Plans are never deleted:
          deactivate a plan to retire it. Subscribers keep the price and limits they signed up with,
          even when you edit or deactivate their plan.
        </span>
      </Paper>

      <Drawer anchor="right" open={panelOpen} onClose={() => setPanelOpen(false)}>
        <div className="w-[min(22rem,100vw)] p-4">
          <PlanFiltersPanel
            // A new key resets the draft whenever the applied filters change elsewhere.
            key={JSON.stringify(appliedPanel)}
            applied={appliedPanel}
            onApply={applyPanel}
            onReset={resetPanel}
          />
        </div>
      </Drawer>

      <PlanDialogs
        dialog={dialog}
        onChange={setDialog}
        canEdit={canEdit}
        onBulkDone={clearSelection}
      />
    </div>
  );
}
