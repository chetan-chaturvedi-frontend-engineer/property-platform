import Add from '@mui/icons-material/Add';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import PublishOutlined from '@mui/icons-material/PublishOutlined';
import UnpublishedOutlined from '@mui/icons-material/UnpublishedOutlined';
import Drawer from '@mui/material/Drawer';
import Paper from '@mui/material/Paper';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { BulkActionsBar } from '@/components/common/BulkActionsBar';
import { Button } from '@/components/common/Button';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { EmptyState } from '@/components/common/Feedback/EmptyState';
import { FiltersPanel } from '@/components/common/FiltersPanel';
import { ListToolbar, type ToolbarSelect } from '@/components/common/ListToolbar';
import { PageHeading } from '@/components/common/PageHeading';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { contentPageRoutes, ROUTES, SEARCH_DEBOUNCE_MS, STORAGE_KEYS } from '@/utils/constants';

import { buildContentPageColumns } from '../components/contentPageColumns';
import { type ActiveContentPageDialog, ContentPageDialogs } from '../components/ContentPageDialogs';
import { ContentPageStatsCards } from '../components/ContentPageStatsCards';
import { ContentPageViewDialog } from '../components/ContentPageViewDialog';
import {
  DEFAULT_CONTENT_PAGE_SORT,
  isDefaultContentPageSort,
  toContentPageFilters,
  useContentPageListParams,
} from '../hooks/useContentPageListParams';
import { useContentPagePermissions } from '../hooks/useContentPagePermissions';
import { useContentPageCounts, useContentPages } from '../hooks/useContentPages';
import {
  CONTENT_PAGE_STATUS_OPTIONS,
  CONTENT_PAGE_TYPE_OPTIONS,
} from '../utils/contentPageDisplay';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

const SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'createdAt,asc', label: 'Oldest first' },
  { value: 'updatedAt,desc', label: 'Recently updated' },
  { value: 'heading,asc', label: 'Title (A–Z)' },
  { value: 'heading,desc', label: 'Title (Z–A)' },
  { value: 'slug,asc', label: 'Slug (A–Z)' },
] as const;

/** `/pages`: content page overview, filters and the paginated list. */
export function ContentPagesPage() {
  const navigate = useNavigate();
  const permissions = useContentPagePermissions();
  const list = useContentPageListParams();
  const { update, changeSort } = list;
  const [storedPageSize, setPageSize] = useLocalStorage<number>(
    STORAGE_KEYS.contentPagesPageSize,
    10,
  );
  const pageSize = PAGE_SIZE_OPTIONS.find((size) => size === storedPageSize) ?? 10;
  const [panelOpen, setPanelOpen] = useState(false);
  const [dialog, setDialog] = useState<ActiveContentPageDialog | null>(null);
  const [viewId, setViewId] = useState<number | null>(null);

  // Typing is local; the value goes to the URL (and the API) once typing pauses.
  const [searchInput, setSearchInput] = useState(list.search);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(searchTimer.current), []);
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => update({ q: value.trim() }), SEARCH_DEBOUNCE_MS);
  };

  const filters = toContentPageFilters(list);
  const counts = useContentPageCounts();
  const { data, isPending, isFetching, error, refetch } = useContentPages({
    ...filters,
    page: list.page,
    size: pageSize,
  });

  // Selection belongs to one page of one query; changing either starts a fresh selection.
  const selectionKey = JSON.stringify([filters, list.page, pageSize]);
  const [selection, setSelection] = useState<{ key: string; ids: Set<number> }>({
    key: selectionKey,
    ids: new Set(),
  });
  const selectedIds = selection.key === selectionKey ? selection.ids : new Set<number>();
  const selectedPages = (data?.content ?? []).filter((page) => selectedIds.has(page.id));
  const clearSelection = () => setSelection({ key: selectionKey, ids: new Set() });

  // A page past the end (e.g. after deleting the last row of a page) jumps to the last page.
  useEffect(() => {
    if (data && data.totalPages > 0 && list.page >= data.totalPages) {
      update({ page: data.totalPages - 1 }, false);
    }
  }, [data, list.page, update]);

  const { canView, canCreate, canEdit, canChangeStatus, canDelete } = permissions;
  const goToEdit = (id: number) => void navigate(contentPageRoutes.edit(id));
  const goToCreate = () => void navigate(ROUTES.pageNew);
  const columns = useMemo(
    () =>
      buildContentPageColumns({
        onView: canView ? (page) => setViewId(page.id) : undefined,
        onEdit: canEdit ? (page) => void navigate(contentPageRoutes.edit(page.id)) : undefined,
        onChangeStatus: canChangeStatus
          ? (page, status) => setDialog({ kind: 'status', pages: [page], status })
          : undefined,
        onDelete: canDelete ? (page) => setDialog({ kind: 'delete', pages: [page] }) : undefined,
      }),
    [canView, canEdit, canChangeStatus, canDelete, navigate, setDialog, setViewId],
  );

  const hasFilters = Boolean(list.search || list.status || list.type);
  const sortValue = `${list.sort.field},${list.sort.direction}`;
  const sortOptions = SORT_OPTIONS.some((option) => option.value === sortValue)
    ? SORT_OPTIONS
    : [...SORT_OPTIONS, { value: sortValue, label: 'Column sort' }];

  const selects: ToolbarSelect[] = [
    {
      id: 'status',
      label: 'Status',
      value: list.status ?? '',
      allLabel: 'All statuses',
      options: CONTENT_PAGE_STATUS_OPTIONS,
      onChange: (value) => update({ status: value || undefined }),
    },
    {
      id: 'type',
      label: 'Type',
      value: list.type ?? '',
      allLabel: 'All types',
      options: CONTENT_PAGE_TYPE_OPTIONS,
      onChange: (value) => update({ type: value || undefined }),
    },
  ];

  const appliedPanel = { status: list.status ?? '', type: list.type ?? '', sort: sortValue };
  const applyPanel = (next: typeof appliedPanel) => {
    // The URL parser validates every part; the default order is not stored.
    const [field = DEFAULT_CONTENT_PAGE_SORT.field, direction = 'desc'] = next.sort.split(',');
    const isDefault =
      field === DEFAULT_CONTENT_PAGE_SORT.field &&
      direction === DEFAULT_CONTENT_PAGE_SORT.direction;
    update({
      status: next.status || undefined,
      type: next.type || undefined,
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
    update({ status: undefined, type: undefined, sort: undefined, dir: undefined });
    setPanelOpen(false);
  };
  const refresh = () => {
    void refetch();
    void counts.refetch();
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeading
          title="Pages"
          crumbs={[{ label: 'Dashboard', to: ROUTES.dashboard }, { label: 'Pages' }]}
        />
        {canCreate && (
          <Button
            startIcon={<Add />}
            size="large"
            onClick={goToCreate}
            className="self-start sm:self-auto"
          >
            Add new page
          </Button>
        )}
      </header>

      <ContentPageStatsCards
        counts={counts.data}
        isLoading={counts.isPending}
        error={counts.error}
        onRetry={() => void counts.refetch()}
      />

      <Paper className="min-w-0 overflow-hidden">
        <ListToolbar
          search={searchInput}
          onSearchChange={handleSearchChange}
          searchLabel="Search pages"
          searchPlaceholder="Search pages…"
          selects={selects}
          onOpenFilters={() => setPanelOpen(true)}
          panelFilterCount={isDefaultContentPageSort(list.sort) ? 0 : 1}
          onClear={hasFilters || !isDefaultContentPageSort(list.sort) ? clearAll : undefined}
          onRefresh={refresh}
          refreshLabel="Refresh pages"
          isRefreshing={isFetching}
        />
        <BulkActionsBar count={selectedPages.length} onClear={clearSelection}>
          {canChangeStatus && (
            <>
              <Button
                size="small"
                variant="outlined"
                startIcon={<PublishOutlined />}
                onClick={() =>
                  setDialog({ kind: 'status', pages: selectedPages, status: 'publish' })
                }
              >
                Publish
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<UnpublishedOutlined />}
                onClick={() => setDialog({ kind: 'status', pages: selectedPages, status: 'draft' })}
              >
                Unpublish
              </Button>
            </>
          )}
          {canDelete && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<DeleteOutline />}
              onClick={() => setDialog({ kind: 'delete', pages: selectedPages })}
            >
              Delete
            </Button>
          )}
        </BulkActionsBar>
        <div className={isFetching && !isPending ? 'opacity-60 transition-opacity' : undefined}>
          <DataTable
            caption="Pages"
            columns={columns}
            rows={data?.content}
            getRowId={(page) => page.id}
            isLoading={isPending}
            error={error}
            onRetry={() => void refetch()}
            skeletonRows={6}
            emptyState={
              hasFilters ? (
                <EmptyState
                  title="No matching pages"
                  message="No pages match this search or these filters. Try clearing some of them."
                  action={
                    <Button variant="outlined" onClick={clearAll}>
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  title="No pages yet"
                  message="Pages hold content such as About us, Terms and conditions or the Privacy policy."
                  action={
                    canCreate && (
                      <Button startIcon={<Add />} onClick={goToCreate}>
                        Add new page
                      </Button>
                    )
                  }
                />
              )
            }
            minWidth={900}
            selection={
              canChangeStatus || canDelete
                ? {
                    selected: selectedIds,
                    onChange: (ids) => setSelection({ key: selectionKey, ids }),
                    rowLabel: (id) =>
                      `Select ${data?.content.find((page) => page.id === id)?.heading ?? id}`,
                  }
                : undefined
            }
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
          Published pages are public at /pages/&lt;slug&gt; on the website and app within a minute.
          System pages are linked from the website and app, so unpublish or delete them with care.
          Deleting a page is permanent; there is no trash.
        </span>
      </Paper>

      <Drawer anchor="right" open={panelOpen} onClose={() => setPanelOpen(false)}>
        <div className="w-[min(22rem,100vw)] p-4">
          <FiltersPanel
            // A new key resets the draft whenever the applied filters change elsewhere.
            key={JSON.stringify(appliedPanel)}
            label="Page filters"
            fields={[
              {
                id: 'status',
                label: 'Status',
                options: CONTENT_PAGE_STATUS_OPTIONS,
                allLabel: 'All statuses',
              },
              {
                id: 'type',
                label: 'Type',
                options: CONTENT_PAGE_TYPE_OPTIONS,
                allLabel: 'All types',
              },
              { id: 'sort', label: 'Sort by', options: sortOptions },
            ]}
            applied={appliedPanel}
            onApply={applyPanel}
            onReset={resetPanel}
          />
        </div>
      </Drawer>

      <ContentPageViewDialog
        id={viewId}
        onClose={() => setViewId(null)}
        onEdit={canEdit ? goToEdit : undefined}
      />
      <ContentPageDialogs dialog={dialog} onClose={() => setDialog(null)} onDone={clearSelection} />
    </div>
  );
}
