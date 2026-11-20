import Add from '@mui/icons-material/Add';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import NavigateNext from '@mui/icons-material/NavigateNext';
import PauseCircleOutline from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutline from '@mui/icons-material/PlayCircleOutline';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Drawer from '@mui/material/Drawer';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import { ActiveFilterChips } from '@/components/common/ActiveFilterChips';
import { BulkActionsBar } from '@/components/common/BulkActionsBar';
import { Button } from '@/components/common/Button';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { EmptyState } from '@/components/common/Feedback/EmptyState';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { bannerRoutes, ROUTES, SEARCH_DEBOUNCE_MS, STORAGE_KEYS } from '@/utils/constants';

import { buildBannerColumns } from '../components/bannerColumns';
import { type ActiveBannerDialog, BannerDialogs } from '../components/BannerDialogs';
import { BannerFiltersPanel } from '../components/BannerFiltersPanel';
import { BannerStatsCards } from '../components/BannerStatsCards';
import { BannerToolbar, type ToolbarSelect } from '../components/BannerToolbar';
import { useBannerCounts, useBanners } from '../hooks/useBanners';
import { useBannerExport } from '../hooks/useBannerExport';
import {
  DEFAULT_BANNER_SORT,
  PANEL_KEYS,
  STATE_FILTERS,
  toBannerFilters,
  useBannerListParams,
} from '../hooks/useBannerListParams';
import { useBannerPermissions } from '../hooks/useBannerPermissions';
import {
  activeBannerChips,
  type BannerPanelFilters,
  STATE_FILTER_LABELS,
} from '../utils/bannerFilters';
import { BANNER_PLACEMENT_OPTIONS, BANNER_TYPE_OPTIONS } from '../utils/bannerOptions';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

const SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'createdAt,asc', label: 'Oldest first' },
  { value: 'updatedAt,desc', label: 'Recently updated' },
  { value: 'title,asc', label: 'Title (A–Z)' },
  { value: 'title,desc', label: 'Title (Z–A)' },
  { value: 'startDate,asc', label: 'Start date (soonest)' },
  { value: 'startDate,desc', label: 'Start date (latest)' },
  { value: 'endDate,asc', label: 'End date (soonest)' },
  { value: 'endDate,desc', label: 'End date (latest)' },
] as const;

export function BannersPage() {
  const navigate = useNavigate();
  const permissions = useBannerPermissions();
  const list = useBannerListParams();
  const { update } = list;
  const [storedPageSize, setPageSize] = useLocalStorage<number>(STORAGE_KEYS.bannersPageSize, 10);
  const pageSize = PAGE_SIZE_OPTIONS.find((size) => size === storedPageSize) ?? 10;
  const [panelOpen, setPanelOpen] = useState(false);
  const [dialog, setDialog] = useState<ActiveBannerDialog | null>(null);
  // "Now" for the scheduled/expired filters; fixed per load (and refresh) so the query key is stable.
  const [now, setNow] = useState(() => new Date().toISOString());

  // Typing is local; the value goes to the URL (and the API) once typing pauses.
  const [searchInput, setSearchInput] = useState(list.search);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(searchTimer.current), []);
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => update({ q: value.trim() }), SEARCH_DEBOUNCE_MS);
  };

  const filters = toBannerFilters(list, now);
  const counts = useBannerCounts();
  const { data, isPending, isFetching, error, refetch } = useBanners({
    ...filters,
    page: list.page,
    size: pageSize,
  });
  const exporter = useBannerExport();

  // Selection belongs to one page of one query; changing either starts a fresh selection.
  const selectionKey = JSON.stringify([filters, list.page, pageSize]);
  const [selection, setSelection] = useState<{ key: string; ids: Set<number> }>({
    key: selectionKey,
    ids: new Set(),
  });
  const selectedIds = selection.key === selectionKey ? selection.ids : new Set<number>();
  const selectedBanners = (data?.content ?? []).filter((banner) => selectedIds.has(banner.id));
  const clearSelection = () => setSelection({ key: selectionKey, ids: new Set() });

  // A page past the end (e.g. after deleting the last row of a page) jumps to the last page.
  useEffect(() => {
    if (data && data.totalPages > 0 && list.page >= data.totalPages) {
      update({ page: data.totalPages - 1 }, false);
    }
  }, [data, list.page, update]);

  const { canView, canCreate, canEdit, canDuplicate, canChangeStatus, canDelete } = permissions;
  const columns = useMemo(
    () =>
      buildBannerColumns({
        onView: canView ? (banner) => setDialog({ kind: 'view', id: banner.id }) : undefined,
        onEdit: canEdit ? (banner) => void navigate(bannerRoutes.edit(banner.id)) : undefined,
        onDuplicate: canDuplicate
          ? (banner) => void navigate(bannerRoutes.duplicate(banner.id))
          : undefined,
        onChangeStatus: canChangeStatus
          ? (banner, status) => setDialog({ kind: 'status', banners: [banner], status })
          : undefined,
        onDelete: canDelete
          ? (banner) => setDialog({ kind: 'delete', banners: [banner] })
          : undefined,
      }),
    [canView, canEdit, canDuplicate, canChangeStatus, canDelete, navigate, setDialog],
  );

  const appliedPanel: BannerPanelFilters = {
    linkType: list.linkType ?? '',
    startFrom: list.startFrom,
    startTo: list.startTo,
    endFrom: list.endFrom,
    endTo: list.endTo,
  };
  const chips = activeBannerChips(appliedPanel, (keys) =>
    update(Object.fromEntries(keys.map((key) => [key, undefined]))),
  );
  const hasFilters = Boolean(
    list.search || list.state || list.type || list.placement || chips.length > 0,
  );
  const sortValue = `${list.sort.field},${list.sort.direction}`;
  const sortChanged =
    list.sort.field !== DEFAULT_BANNER_SORT.field ||
    list.sort.direction !== DEFAULT_BANNER_SORT.direction;

  const changeSort = (field: string, direction: 'asc' | 'desc') => {
    const isDefault =
      field === DEFAULT_BANNER_SORT.field && direction === DEFAULT_BANNER_SORT.direction;
    update({ sort: isDefault ? undefined : field, dir: isDefault ? undefined : direction });
  };
  const applyPanel = (next: BannerPanelFilters) => {
    update({
      link: next.linkType,
      sFrom: next.startFrom,
      sTo: next.startTo,
      eFrom: next.endFrom,
      eTo: next.endTo,
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
  const refresh = () => {
    setNow(new Date().toISOString());
    void refetch();
    void counts.refetch();
  };

  const selects: ToolbarSelect[] = [
    {
      id: 'state',
      label: 'Status',
      value: list.state ?? '',
      allLabel: 'All statuses',
      options: STATE_FILTERS.map((value) => ({ value, label: STATE_FILTER_LABELS[value] })),
      onChange: (value) => update({ state: value || undefined }),
    },
    {
      id: 'type',
      label: 'Banner type',
      value: list.type,
      allLabel: 'All types',
      options: BANNER_TYPE_OPTIONS,
      onChange: (value) => update({ type: value || undefined }),
    },
    {
      id: 'placement',
      label: 'Placement',
      value: list.placement,
      allLabel: 'All placements',
      options: BANNER_PLACEMENT_OPTIONS,
      onChange: (value) => update({ placement: value || undefined }),
    },
    {
      id: 'sort',
      label: 'Sort by',
      // A header sort without a preset (e.g. type) is shown as an extra entry.
      value: sortValue,
      options: SORT_OPTIONS.some((option) => option.value === sortValue)
        ? SORT_OPTIONS
        : [...SORT_OPTIONS, { value: sortValue, label: 'Column sort' }],
      onChange: (value) => {
        const [field = '', direction] = value.split(',');
        changeSort(field, direction === 'desc' ? 'desc' : 'asc');
      },
    },
  ];

  const goToCreate = () => void navigate(ROUTES.bannerNew);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Typography variant="h1">Banners</Typography>
          <Breadcrumbs
            aria-label="Breadcrumb"
            separator={<NavigateNext fontSize="small" />}
            className="mt-1"
          >
            <Link component={RouterLink} to={ROUTES.dashboard} underline="hover">
              Dashboard
            </Link>
            <Typography color="text.secondary" aria-current="page">
              Banners
            </Typography>
          </Breadcrumbs>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <Button
            variant="outlined"
            size="large"
            startIcon={<FileDownloadOutlined />}
            loading={exporter.isExporting}
            onClick={() => void exporter.exportMatching(filters)}
          >
            Export CSV
          </Button>
          {canCreate && (
            <Button startIcon={<Add />} size="large" onClick={goToCreate}>
              Add new banner
            </Button>
          )}
        </div>
      </header>

      <BannerStatsCards
        counts={counts.data}
        isLoading={counts.isPending}
        error={counts.error}
        onRetry={() => void counts.refetch()}
      />

      <Paper className="min-w-0 overflow-hidden">
        <BannerToolbar
          search={searchInput}
          onSearchChange={handleSearchChange}
          searchLabel="Search banners"
          searchPlaceholder="Search banner title…"
          selects={selects}
          onOpenFilters={() => setPanelOpen(true)}
          panelFilterCount={chips.length}
          onClear={hasFilters || sortChanged ? clearAll : undefined}
          onRefresh={refresh}
          isRefreshing={isFetching}
        />
        <ActiveFilterChips filters={chips} />
        <BulkActionsBar count={selectedBanners.length} onClear={clearSelection}>
          {canChangeStatus && (
            <>
              <Button
                size="small"
                variant="outlined"
                startIcon={<PlayCircleOutline />}
                onClick={() =>
                  setDialog({ kind: 'status', banners: selectedBanners, status: 'active' })
                }
              >
                Activate
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<PauseCircleOutline />}
                onClick={() =>
                  setDialog({ kind: 'status', banners: selectedBanners, status: 'inactive' })
                }
              >
                Deactivate
              </Button>
            </>
          )}
          <Button
            size="small"
            variant="outlined"
            startIcon={<FileDownloadOutlined />}
            onClick={() => exporter.exportRows(selectedBanners)}
          >
            Export
          </Button>
          {canDelete && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<DeleteOutline />}
              onClick={() => setDialog({ kind: 'delete', banners: selectedBanners })}
            >
              Delete
            </Button>
          )}
        </BulkActionsBar>
        <div className={isFetching && !isPending ? 'opacity-60 transition-opacity' : undefined}>
          <DataTable
            caption="Banners"
            columns={columns}
            rows={data?.content}
            getRowId={(banner) => banner.id}
            isLoading={isPending}
            error={error}
            onRetry={() => void refetch()}
            skeletonRows={4}
            emptyState={
              hasFilters ? (
                <EmptyState
                  title="No matching banners"
                  message="No banners match these filters. Try clearing some of them."
                  action={
                    <Button variant="outlined" onClick={clearAll}>
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  title="No banners yet"
                  message="Banners promote offers and announcements on the app and website."
                  action={
                    canCreate && (
                      <Button startIcon={<Add />} onClick={goToCreate}>
                        Add new banner
                      </Button>
                    )
                  }
                />
              )
            }
            minWidth={1100}
            selection={{
              selected: selectedIds,
              onChange: (ids) => setSelection({ key: selectionKey, ids }),
              rowLabel: (id) =>
                `Select ${data?.content.find((banner) => banner.id === id)?.title ?? id}`,
            }}
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
        <span>
          Banners are displayed on the app and website according to their placement and schedule:
          only active banners whose start date has arrived and whose end date has not passed are
          shown. Changes reach visitors within a minute.
        </span>
      </Paper>

      <Drawer anchor="right" open={panelOpen} onClose={() => setPanelOpen(false)}>
        <div className="w-[min(22rem,100vw)] p-4">
          <BannerFiltersPanel
            // A new key resets the draft whenever the applied filters change elsewhere.
            key={JSON.stringify(appliedPanel)}
            applied={appliedPanel}
            onApply={applyPanel}
            onReset={resetPanel}
          />
        </div>
      </Drawer>

      <BannerDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onEdit={canEdit ? (banner) => void navigate(bannerRoutes.edit(banner.id)) : undefined}
        showActivity={permissions.canViewActivity}
        onDone={clearSelection}
      />
    </div>
  );
}
