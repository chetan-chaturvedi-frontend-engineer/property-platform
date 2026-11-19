import Add from '@mui/icons-material/Add';
import FilterAltOff from '@mui/icons-material/FilterAltOff';
import NavigateNext from '@mui/icons-material/NavigateNext';
import Search from '@mui/icons-material/Search';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/common/Button';
import { DataTable, type SortDirection } from '@/components/common/DataTable/DataTable';
import { ConfirmDialog } from '@/components/common/Modal';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useDebounce } from '@/hooks/useDebounce';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  PAGINATION,
  PERMISSIONS,
  propertyRoutes,
  ROUTES,
  SEARCH_DEBOUNCE_MS,
  STORAGE_KEYS,
} from '@/utils/constants';
import { formatNumber } from '@/utils/formatters';

import { buildPropertyColumns } from '../components/propertyColumns';
import { PropertyStatsCards } from '../components/PropertyStatsCards';
import { WorkflowActionDialog } from '../components/WorkflowActionDialog';
import {
  useDeleteProperty,
  useProperties,
  usePropertyStats,
  useRestoreProperty,
} from '../hooks/useProperties';
import {
  PROJECT_STATUSES,
  PROPERTY_TYPES,
  type PropertySortField,
  type PropertySummary,
  type PublicationAction,
  type PublicationStatus,
} from '../types/property.types';
import {
  availableActions,
  PROJECT_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
} from '../utils/propertyDisplay';

type StatusTab = 'all' | 'deleted' | Exclude<PublicationStatus, 'archived' | 'suspended'>;

const STATUS_TABS: Array<{ value: StatusTab; label: string }> = [
  { value: 'all', label: 'All properties' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'draft', label: 'Drafts' },
  { value: 'deleted', label: 'Deleted' },
];

const SORT_FIELDS: readonly PropertySortField[] = [
  'updatedAt',
  'createdAt',
  'projectName',
  'city',
  'publishedAt',
];
const DEFAULT_SORT: { field: PropertySortField; direction: SortDirection } = {
  field: 'updatedAt',
  direction: 'desc',
};
const SEARCH_MAX_LENGTH = 100;
const PLACE_MAX_LENGTH = 100;

/** Start / end of a local calendar day as an ISO instant (the API filters on instants). */
function dayStart(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}
function dayEnd(date: string): string {
  return new Date(`${date}T23:59:59.999`).toISOString();
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((candidate) => candidate === value);
}

/**
 * Filters, sorting and paging live in the URL, so they survive a visit to a property and the back
 * button, and a filtered view can be shared.
 */
function useListParams() {
  const [params, setParams] = useSearchParams();
  const tab =
    oneOf(
      params.get('tab'),
      STATUS_TABS.map((t) => t.value),
    ) ?? 'all';
  const sortField = oneOf(params.get('sort'), SORT_FIELDS) ?? DEFAULT_SORT.field;
  const sortDirection =
    oneOf(params.get('dir'), ['asc', 'desc'] as const) ?? DEFAULT_SORT.direction;
  const page = Math.max(0, Number.parseInt(params.get('page') ?? '0', 10) || 0);
  const state = {
    tab,
    search: params.get('q') ?? '',
    propertyType: oneOf(params.get('type'), PROPERTY_TYPES),
    projectStatus: oneOf(params.get('construction'), PROJECT_STATUSES),
    city: params.get('city') ?? '',
    state: params.get('state') ?? '',
    createdFrom: params.get('from') ?? '',
    createdTo: params.get('to') ?? '',
    sort: { field: sortField, direction: sortDirection },
    page,
  };

  /** Updates the given keys; any filter change returns to the first page. */
  const update = useCallback(
    (changes: Record<string, string | number | undefined>, resetPage = true) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(changes)) {
            if (value === undefined || value === '' || value === 0) {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          }
          if (resetPage && !('page' in changes)) {
            next.delete('page');
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return { ...state, update, clear: () => setParams({}, { replace: true }) };
}

export function PropertiesPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canView = can(PERMISSIONS.propertyViewAny);
  const canCreate = can(PERMISSIONS.propertyCreate) && canView;
  const canEdit = can(PERMISSIONS.propertyUpdateAny) && canView;
  const canDelete = can(PERMISSIONS.propertyDeleteAny) && canView;
  const canRestore = can(PERMISSIONS.propertyRestoreAny);

  const list = useListParams();
  const [pageSize, setPageSize] = useLocalStorage<number>(
    STORAGE_KEYS.propertiesPageSize,
    PAGINATION.defaultPageSize,
  );
  // Typing is local; the debounced value goes to the URL and the API.
  const [searchInput, setSearchInput] = useState(list.search);
  const [cityInput, setCityInput] = useState(list.city);
  const [stateInput, setStateInput] = useState(list.state);
  const search = useDebounce(searchInput.trim(), SEARCH_DEBOUNCE_MS);
  const city = useDebounce(cityInput.trim(), SEARCH_DEBOUNCE_MS);
  const state = useDebounce(stateInput.trim(), SEARCH_DEBOUNCE_MS);
  const { update } = list;
  useEffect(() => {
    if (search !== list.search || city !== list.city || state !== list.state) {
      update({ q: search, city, state });
    }
    // Only the debounced inputs drive this; the URL values are compared, not watched.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, city, state]);

  const [deleting, setDeleting] = useState<PropertySummary | null>(null);
  const [workflow, setWorkflow] = useState<{
    property: PropertySummary;
    action: PublicationAction;
  } | null>(null);

  const dateRangeIsValid =
    !list.createdFrom || !list.createdTo || list.createdFrom <= list.createdTo;
  const stats = usePropertyStats();
  const { data, isPending, isFetching, error, refetch } = useProperties(
    {
      page: list.page,
      size: Math.min(pageSize, PAGINATION.maxPageSize),
      sort: `${list.sort.field},${list.sort.direction}`,
      search: list.search || undefined,
      publicationStatus: list.tab === 'all' || list.tab === 'deleted' ? undefined : list.tab,
      deleted: list.tab === 'deleted' ? 'only' : undefined,
      propertyType: list.propertyType,
      projectStatus: list.projectStatus,
      city: list.city || undefined,
      state: list.state || undefined,
      createdFrom: list.createdFrom ? dayStart(list.createdFrom) : undefined,
      createdTo: list.createdTo ? dayEnd(list.createdTo) : undefined,
    },
    { enabled: dateRangeIsValid },
  );
  const deleteProperty = useDeleteProperty();
  const restoreProperty = useRestoreProperty();

  // A page past the end (e.g. after deletions elsewhere or an edited URL) jumps to the last page.
  useEffect(() => {
    if (data && data.totalPages > 0 && list.page >= data.totalPages) {
      update({ page: data.totalPages - 1 }, false);
    }
  }, [data, list.page, update]);

  const columns = useMemo(
    () =>
      buildPropertyColumns({
        onView: canView ? (p) => void navigate(propertyRoutes.detail(p.id)) : undefined,
        onEdit: canEdit
          ? (p) =>
              void navigate(
                propertyRoutes.edit(
                  p.id,
                  p.publicationStatus === 'draft' ? p.wizardStep : undefined,
                ),
              )
          : undefined,
        onDelete: canDelete ? setDeleting : undefined,
        onRestore: canRestore ? (p) => restoreProperty.mutate(p.id) : undefined,
        onAction: canView ? (property, action) => setWorkflow({ property, action }) : undefined,
        availableActions: (p) => availableActions(p.publicationStatus, can),
      }),
    // `can` changes identity with the permission set, which the flags above already track.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canView, canEdit, canDelete, canRestore, navigate],
  );

  const tabCount = (tab: StatusTab): number | undefined => {
    if (!stats.data) return undefined;
    if (tab === 'all') return stats.data.total;
    if (tab === 'deleted') return stats.data.deleted;
    return stats.data.byPublicationStatus[tab];
  };

  const visibleTabs = STATUS_TABS.filter((tab) => tab.value !== 'deleted' || canRestore);
  const hasFilters = Boolean(
    list.search ||
    list.propertyType ||
    list.projectStatus ||
    list.city ||
    list.state ||
    list.createdFrom ||
    list.createdTo ||
    list.tab !== 'all',
  );
  const sortChanged =
    list.sort.field !== DEFAULT_SORT.field || list.sort.direction !== DEFAULT_SORT.direction;

  const resetFilters = () => {
    setSearchInput('');
    setCityInput('');
    setStateInput('');
    list.clear();
  };

  const confirmDelete = () => {
    if (!deleting || deleteProperty.isPending) {
      return;
    }
    deleteProperty.mutate(
      { id: deleting.id, version: deleting.version },
      {
        onSuccess: () => {
          if (list.page > 0 && data?.content.length === 1) {
            update({ page: list.page - 1 }, false);
          }
          setDeleting(null);
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Typography variant="h1">Properties</Typography>
          <Breadcrumbs
            aria-label="Breadcrumb"
            separator={<NavigateNext fontSize="small" />}
            className="mt-1"
          >
            <Link component={RouterLink} to={ROUTES.dashboard} underline="hover">
              Dashboard
            </Link>
            <Typography color="text.secondary" aria-current="page">
              Properties
            </Typography>
          </Breadcrumbs>
        </div>
        {canCreate && (
          <Button
            startIcon={<Add />}
            size="large"
            onClick={() => void navigate(ROUTES.propertyNew)}
            className="self-start sm:self-auto"
          >
            Add property
          </Button>
        )}
      </header>

      <PropertyStatsCards />

      <Paper className="overflow-hidden">
        <div className="border-b px-4 pt-2">
          <Tabs
            value={list.tab}
            onChange={(_, value: StatusTab) => update({ tab: value === 'all' ? undefined : value })}
            variant="scrollable"
            allowScrollButtonsMobile
            aria-label="Filter properties by status"
            textColor="inherit"
            sx={{
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 52 },
              '& .Mui-selected': { color: 'var(--app-primary-strong)' },
              '& .MuiTabs-indicator': { backgroundColor: 'var(--app-primary-strong)', height: 3 },
            }}
          >
            {visibleTabs.map((tab) => {
              const count = tabCount(tab.value);
              return (
                <Tab
                  key={tab.value}
                  value={tab.value}
                  label={count === undefined ? tab.label : `${tab.label} (${formatNumber(count)})`}
                />
              );
            })}
          </Tabs>
        </div>
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[2fr_repeat(6,1fr)_auto]">
          <TextField
            size="small"
            type="search"
            placeholder="Search by name, builder or slug…"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="sm:col-span-2 lg:col-span-2 xl:col-span-1"
            slotProps={{
              htmlInput: { maxLength: SEARCH_MAX_LENGTH, 'aria-label': 'Search properties' },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            select
            size="small"
            label="Type"
            value={list.propertyType ?? ''}
            onChange={(event) => update({ type: event.target.value })}
          >
            <MenuItem value="">All types</MenuItem>
            {PROPERTY_TYPES.map((type) => (
              <MenuItem key={type} value={type}>
                {PROPERTY_TYPE_LABELS[type]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Construction"
            value={list.projectStatus ?? ''}
            onChange={(event) => update({ construction: event.target.value })}
          >
            <MenuItem value="">Any stage</MenuItem>
            {PROJECT_STATUSES.map((status) => (
              <MenuItem key={status} value={status}>
                {PROJECT_STATUS_LABELS[status]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="City"
            value={cityInput}
            onChange={(event) => setCityInput(event.target.value)}
            helperText="Exact name"
            slotProps={{ htmlInput: { maxLength: PLACE_MAX_LENGTH } }}
          />
          <TextField
            size="small"
            label="State"
            value={stateInput}
            onChange={(event) => setStateInput(event.target.value)}
            helperText="Exact name"
            slotProps={{ htmlInput: { maxLength: PLACE_MAX_LENGTH } }}
          />
          <TextField
            size="small"
            type="date"
            label="Created from"
            value={list.createdFrom}
            onChange={(event) => update({ from: event.target.value })}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            size="small"
            type="date"
            label="Created to"
            value={list.createdTo}
            onChange={(event) => update({ to: event.target.value })}
            error={!dateRangeIsValid}
            helperText={dateRangeIsValid ? undefined : 'Must not be before the start date'}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          {(hasFilters || sortChanged) && (
            <Button variant="text" startIcon={<FilterAltOff />} onClick={resetFilters}>
              Clear filters
            </Button>
          )}
        </div>
        <div className={isFetching && !isPending ? 'opacity-60 transition-opacity' : undefined}>
          <DataTable
            caption="Properties"
            columns={columns}
            rows={data?.content}
            getRowId={(p) => p.id}
            isLoading={isPending && dateRangeIsValid}
            error={error}
            onRetry={() => void refetch()}
            emptyMessage={
              hasFilters
                ? 'No properties match these filters.'
                : 'No properties have been added yet.'
            }
            minWidth={1180}
            sort={{
              field: list.sort.field,
              direction: list.sort.direction,
              onChange: (field, direction) =>
                update({
                  sort:
                    field === DEFAULT_SORT.field && direction === DEFAULT_SORT.direction
                      ? undefined
                      : field,
                  dir:
                    field === DEFAULT_SORT.field && direction === DEFAULT_SORT.direction
                      ? undefined
                      : direction,
                }),
            }}
            pagination={{
              page: list.page,
              pageSize,
              totalElements: data?.totalElements ?? 0,
              pageSizeOptions: PAGINATION.pageSizeOptions,
              onPageChange: (page) => update({ page }, false),
              onPageSizeChange: (size) => {
                setPageSize(size);
                update({ page: undefined });
              },
            }}
          />
        </div>
      </Paper>

      {workflow && (
        <WorkflowActionDialog
          target={workflow.property}
          action={workflow.action}
          onClose={() => setWorkflow(null)}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete property?"
        description={
          deleting && (
            <Typography component="span">
              <strong>{deleting.projectName}</strong> (ID {deleting.id}) will be removed from every
              list and from the public site. Its units, media and history are kept
              {canRestore ? ', and it can be restored from the Deleted tab.' : '.'}
            </Typography>
          )
        }
        confirmLabel="Delete property"
        destructive
        loading={deleteProperty.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
