import Add from '@mui/icons-material/Add';
import FilterAltOff from '@mui/icons-material/FilterAltOff';
import FilterList from '@mui/icons-material/FilterList';
import NavigateNext from '@mui/icons-material/NavigateNext';
import Refresh from '@mui/icons-material/Refresh';
import Search from '@mui/icons-material/Search';
import Badge from '@mui/material/Badge';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import { Button } from '@/components/common/Button';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { ConfirmDialog } from '@/components/common/Modal';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  leadRoutes,
  PAGINATION,
  ROUTES,
  SEARCH_DEBOUNCE_MS,
  STORAGE_KEYS,
} from '@/utils/constants';
import { formatNumber } from '@/utils/formatters';

import { AssignLeadDialog } from '../components/AssignLeadDialog';
import { LeadBreakdownCard } from '../components/LeadBreakdownCard';
import { EditLeadDialog } from '../components/EditLeadDialog';
import { LeadFiltersPanel } from '../components/LeadFiltersPanel';
import { buildLeadColumns } from '../components/leadColumns';
import { LeadFormDialog } from '../components/LeadFormDialog';
import { LeadStatsCards } from '../components/LeadStatsCards';
import { DEFAULT_LEAD_SORT, PANEL_KEYS, useLeadListParams } from '../hooks/useLeadListParams';
import { useLeadPermissions } from '../hooks/useLeadPermissions';
import { useDeleteLead, useLeads, useLeadStats } from '../hooks/useLeads';
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  type LeadSource,
  type LeadStatus,
  type LeadSummary,
} from '../types/lead.types';
import type { LeadPanelFilters } from '../utils/leadFilters';
import { dayEnd, dayStart, LEAD_SOURCE_LABELS, LEAD_STATUS_META } from '../utils/leadDisplay';

const SEARCH_MAX_LENGTH = 100;

const isStatus = (value: string): value is LeadStatus => LEAD_STATUSES.some((s) => s === value);
const isSource = (value: string): value is LeadSource => LEAD_SOURCES.some((s) => s === value);

export function LeadsPage() {
  const navigate = useNavigate();
  const permissions = useLeadPermissions();
  const list = useLeadListParams();
  const { update } = list;
  const [pageSize, setPageSize] = useLocalStorage<number>(
    STORAGE_KEYS.leadsPageSize,
    PAGINATION.defaultPageSize,
  );
  // The panel sits beside the table on wide screens and in a drawer elsewhere.
  const panelInline = useMediaQuery((theme) => theme.breakpoints.up('xl'));
  const [panelOpen, setPanelOpen] = useState(false);

  // Typing is local; the value goes to the URL (and the API) once typing pauses. A pending write is
  // cancelled when the filters are cleared, so it cannot bring the old search back.
  const [searchInput, setSearchInput] = useState(list.search);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(searchTimer.current), []);
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => update({ q: value.trim() }), SEARCH_DEBOUNCE_MS);
  };

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<LeadSummary | null>(null);
  const [assigning, setAssigning] = useState<LeadSummary | null>(null);
  const [deleting, setDeleting] = useState<LeadSummary | null>(null);

  const stats = useLeadStats();
  const { data, isPending, isFetching, error, refetch } = useLeads({
    page: list.page,
    size: Math.min(pageSize, PAGINATION.maxPageSize),
    sort: `${list.sort.field},${list.sort.direction}`,
    search: list.search || undefined,
    status: list.status,
    source: list.source,
    priority: list.priority,
    purpose: list.purpose,
    propertyType: list.propertyType,
    assignedTo: list.assignee?.id,
    preferredLocation: list.preferredLocation || undefined,
    createdFrom: list.createdFrom ? dayStart(list.createdFrom) : undefined,
    createdTo: list.createdTo ? dayEnd(list.createdTo) : undefined,
  });
  const deleteLead = useDeleteLead();

  // A page past the end (e.g. after deletions elsewhere or an edited URL) jumps to the last page.
  useEffect(() => {
    if (data && data.totalPages > 0 && list.page >= data.totalPages) {
      update({ page: data.totalPages - 1 }, false);
    }
  }, [data, list.page, update]);

  const { canView, canEdit, canDelete, canEditSome, canDeleteSome, canAssign } = permissions;
  const columns = useMemo(
    () =>
      buildLeadColumns({
        onView: canView ? (lead) => void navigate(leadRoutes.detail(lead.id)) : undefined,
        // Editing loads the full lead first, which needs the view permission.
        onEdit: canView && canEditSome ? setEditing : undefined,
        onAssign: canAssign ? setAssigning : undefined,
        onDelete: canDeleteSome ? setDeleting : undefined,
        canEdit,
        canDelete,
      }),
    [canView, canEditSome, canAssign, canDeleteSome, canEdit, canDelete, navigate],
  );

  const appliedPanel: LeadPanelFilters = {
    source: list.source ?? '',
    priority: list.priority ?? '',
    purpose: list.purpose ?? '',
    propertyType: list.propertyType ?? '',
    assignee: list.assignee,
    preferredLocation: list.preferredLocation,
    createdFrom: list.createdFrom,
    createdTo: list.createdTo,
  };
  const panelFilterCount = Object.values(appliedPanel).filter(
    (value) => value !== '' && value !== null,
  ).length;
  const hasFilters = Boolean(list.search || list.status || panelFilterCount > 0);
  const sortChanged =
    list.sort.field !== DEFAULT_LEAD_SORT.field ||
    list.sort.direction !== DEFAULT_LEAD_SORT.direction;

  const applyPanel = (filters: LeadPanelFilters) => {
    update({
      source: filters.source,
      priority: filters.priority,
      purpose: filters.purpose,
      type: filters.propertyType,
      assignee: filters.assignee?.id,
      assigneeName: filters.assignee?.fullName,
      location: filters.preferredLocation,
      from: filters.createdFrom,
      to: filters.createdTo,
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

  const confirmDelete = () => {
    if (!deleting || deleteLead.isPending) return;
    deleteLead.mutate(deleting.id, {
      onSuccess: () => {
        // Removing the only row on a later page would leave an empty page behind.
        if (list.page > 0 && data?.content.length === 1) {
          update({ page: list.page - 1 }, false);
        }
        setDeleting(null);
      },
    });
  };

  const panel = (
    <LeadFiltersPanel
      // A new key resets the draft whenever the applied filters change elsewhere.
      key={JSON.stringify(appliedPanel)}
      applied={appliedPanel}
      onApply={applyPanel}
      onReset={resetPanel}
      showAssignee={permissions.canFilterByAssignee}
    />
  );
  const total = stats.data?.total ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Typography variant="h1">Leads management</Typography>
          <Breadcrumbs
            aria-label="Breadcrumb"
            separator={<NavigateNext fontSize="small" />}
            className="mt-1"
          >
            <Link component={RouterLink} to={ROUTES.dashboard} underline="hover">
              Dashboard
            </Link>
            <Typography color="text.secondary" aria-current="page">
              Leads
            </Typography>
          </Breadcrumbs>
        </div>
        {permissions.canCreate && (
          <Button
            startIcon={<Add />}
            size="large"
            onClick={() => setCreating(true)}
            className="self-start sm:self-auto"
          >
            Add new lead
          </Button>
        )}
      </header>

      <LeadStatsCards
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
              aria-label="Filter leads by status"
              textColor="inherit"
              sx={{
                '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 52 },
                '& .Mui-selected': { color: 'var(--app-primary-strong)' },
                '& .MuiTabs-indicator': { backgroundColor: 'var(--app-primary-strong)', height: 3 },
              }}
            >
              <Tab
                value="all"
                label={stats.data ? `All leads (${formatNumber(total)})` : 'All leads'}
              />
              {LEAD_STATUSES.map((status) => {
                const count = stats.data?.byStatus[status];
                const label = LEAD_STATUS_META[status].label;
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
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center">
            <TextField
              size="small"
              type="search"
              placeholder="Search by name, email or phone…"
              value={searchInput}
              onChange={(event) => handleSearchChange(event.target.value)}
              className="sm:min-w-72 sm:flex-1 lg:max-w-md"
              slotProps={{
                htmlInput: { maxLength: SEARCH_MAX_LENGTH, 'aria-label': 'Search leads' },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              {!panelInline && (
                <Button
                  variant="outlined"
                  startIcon={
                    <Badge badgeContent={panelFilterCount} color="primary">
                      <FilterList />
                    </Badge>
                  }
                  onClick={() => setPanelOpen(true)}
                >
                  Filters
                </Button>
              )}
              {(hasFilters || sortChanged) && (
                <Button variant="text" startIcon={<FilterAltOff />} onClick={clearAll}>
                  Clear filters
                </Button>
              )}
              <Tooltip title="Refresh">
                <span>
                  <IconButton
                    aria-label="Refresh leads"
                    onClick={() => {
                      void refetch();
                      void stats.refetch();
                    }}
                    disabled={isFetching}
                  >
                    <Refresh />
                  </IconButton>
                </span>
              </Tooltip>
            </div>
          </div>
          <div className={isFetching && !isPending ? 'opacity-60 transition-opacity' : undefined}>
            <DataTable
              caption="Leads"
              columns={columns}
              rows={data?.content}
              getRowId={(lead) => lead.id}
              isLoading={isPending}
              error={error}
              onRetry={() => void refetch()}
              emptyMessage={
                hasFilters
                  ? 'No leads match these filters. Try clearing some of them.'
                  : 'No leads have been added yet.'
              }
              minWidth={1280}
              sort={{
                field: list.sort.field,
                direction: list.sort.direction,
                onChange: (field, direction) => {
                  const isDefault =
                    field === DEFAULT_LEAD_SORT.field && direction === DEFAULT_LEAD_SORT.direction;
                  update({
                    sort: isDefault ? undefined : field,
                    dir: isDefault ? undefined : direction,
                  });
                },
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

        <aside className="flex flex-col gap-6" aria-label="Lead insights and filters">
          <LeadBreakdownCard
            title="Leads by status"
            total={total}
            isLoading={stats.isPending}
            items={LEAD_STATUSES.map((status) => ({
              key: status,
              label: LEAD_STATUS_META[status].label,
              color: LEAD_STATUS_META[status].color,
              count: stats.data?.byStatus[status] ?? 0,
            }))}
            selectedKey={list.status}
            onSelect={(key) =>
              update({ status: isStatus(key) && key !== list.status ? key : undefined })
            }
          />
          <LeadBreakdownCard
            title="Leads by source"
            total={total}
            isLoading={stats.isPending}
            items={LEAD_SOURCES.map((source) => ({
              key: source,
              label: LEAD_SOURCE_LABELS[source],
              color: 'secondary',
              count: stats.data?.bySource[source] ?? 0,
            }))}
            selectedKey={list.source}
            onSelect={(key) =>
              update({ source: isSource(key) && key !== list.source ? key : undefined })
            }
          />
          {panelInline && <Paper className="p-4">{panel}</Paper>}
        </aside>
      </div>

      {!panelInline && (
        <Drawer anchor="right" open={panelOpen} onClose={() => setPanelOpen(false)}>
          <div className="w-[min(22rem,100vw)] p-4">{panel}</div>
        </Drawer>
      )}

      {creating && <LeadFormDialog open onClose={() => setCreating(false)} />}

      {editing && <EditLeadDialog leadId={editing.id} onClose={() => setEditing(null)} />}

      {assigning && <AssignLeadDialog lead={assigning} onClose={() => setAssigning(null)} />}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete lead?"
        description={
          deleting && (
            <Typography component="span">
              <strong>{deleting.leadName}</strong> (LID-{deleting.id}, {deleting.phone}) will be
              removed from every list. Its schedules and interactions are kept with it.
            </Typography>
          )
        }
        confirmLabel="Delete lead"
        destructive
        loading={deleteLead.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
