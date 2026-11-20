import Add from '@mui/icons-material/Add';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import PublishOutlined from '@mui/icons-material/PublishOutlined';
import UnpublishedOutlined from '@mui/icons-material/UnpublishedOutlined';
import Drawer from '@mui/material/Drawer';
import Paper from '@mui/material/Paper';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ActiveFilterChips } from '@/components/common/ActiveFilterChips';
import { BulkActionsBar } from '@/components/common/BulkActionsBar';
import { Button } from '@/components/common/Button';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { EmptyState } from '@/components/common/Feedback/EmptyState';
import { ListToolbar, type ToolbarSelect } from '@/components/common/ListToolbar';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { blogRoutes, ROUTES, SEARCH_DEBOUNCE_MS, STORAGE_KEYS } from '@/utils/constants';

import { buildBlogColumns } from '../components/blogColumns';
import { type ActiveBlogDialog, BlogDialogs } from '../components/BlogDialogs';
import { BlogFiltersPanel } from '../components/BlogFiltersPanel';
import { BlogPageHeading } from '../components/BlogPageHeading';
import { BlogStatsCards } from '../components/BlogStatsCards';
import { BlogTabs } from '../components/BlogTabs';
import {
  useBlogCategories,
  useBlogCounts,
  useBlogs,
  useBlogTagSuggestions,
} from '../hooks/useBlogs';
import { useBlogExport } from '../hooks/useBlogExport';
import {
  type BlogTab,
  DEFAULT_BLOG_SORT,
  PANEL_KEYS,
  toBlogFilters,
  useBlogListParams,
} from '../hooks/useBlogListParams';
import { useBlogPermissions } from '../hooks/useBlogPermissions';
import type { BlogCounts } from '../types/blog.types';
import { activeBlogChips, type BlogPanelFilters } from '../utils/blogFilters';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

const SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'createdAt,asc', label: 'Oldest first' },
  { value: 'updatedAt,desc', label: 'Recently updated' },
  { value: 'publishedAt,desc', label: 'Published (latest)' },
  { value: 'publishedAt,asc', label: 'Published (earliest)' },
  { value: 'title,asc', label: 'Title (A–Z)' },
  { value: 'title,desc', label: 'Title (Z–A)' },
] as const;

const TABS: ReadonlyArray<{ value: BlogTab; label: string; count: (c: BlogCounts) => number }> = [
  { value: 'all', label: 'All blogs', count: (c) => c.total },
  { value: 'live', label: 'Published', count: (c) => c.live },
  { value: 'scheduled', label: 'Scheduled', count: (c) => c.scheduled },
  { value: 'draft', label: 'Drafts', count: (c) => c.drafts },
];

export function BlogsPage() {
  const navigate = useNavigate();
  const permissions = useBlogPermissions();
  const list = useBlogListParams();
  const { update } = list;
  const [storedPageSize, setPageSize] = useLocalStorage<number>(STORAGE_KEYS.blogsPageSize, 10);
  const pageSize = PAGE_SIZE_OPTIONS.find((size) => size === storedPageSize) ?? 10;
  const [panelOpen, setPanelOpen] = useState(false);
  const [dialog, setDialog] = useState<ActiveBlogDialog | null>(null);
  // "Now" for the live/scheduled tabs; fixed per load (and refresh) so the query key is stable.
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

  const filters = toBlogFilters(list, now);
  const counts = useBlogCounts();
  const categories = useBlogCategories({ enabled: permissions.canViewCategories });
  const tagSuggestions = useBlogTagSuggestions({ enabled: panelOpen });
  const { data, isPending, isFetching, error, refetch } = useBlogs({
    ...filters,
    page: list.page,
    size: pageSize,
  });
  const exporter = useBlogExport();

  // Selection belongs to one page of one query; changing either starts a fresh selection.
  const selectionKey = JSON.stringify([filters, list.page, pageSize]);
  const [selection, setSelection] = useState<{ key: string; ids: Set<number> }>({
    key: selectionKey,
    ids: new Set(),
  });
  const selectedIds = selection.key === selectionKey ? selection.ids : new Set<number>();
  const selectedBlogs = (data?.content ?? []).filter((blog) => selectedIds.has(blog.id));
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
      buildBlogColumns({
        onView: canView ? (blog) => void navigate(blogRoutes.detail(blog.id)) : undefined,
        onEdit: canEdit ? (blog) => void navigate(blogRoutes.edit(blog.id)) : undefined,
        onDuplicate: canDuplicate
          ? (blog) => void navigate(blogRoutes.duplicate(blog.id))
          : undefined,
        onChangeStatus: canChangeStatus
          ? (blog, status) => setDialog({ kind: 'status', blogs: [blog], status })
          : undefined,
        onDelete: canDelete ? (blog) => setDialog({ kind: 'delete', blogs: [blog] }) : undefined,
      }),
    [canView, canEdit, canDuplicate, canChangeStatus, canDelete, navigate, setDialog],
  );

  const appliedPanel: BlogPanelFilters = {
    tag: list.tag,
    publishedFrom: list.publishedFrom,
    publishedTo: list.publishedTo,
    createdFrom: list.createdFrom,
    createdTo: list.createdTo,
  };
  const chips = activeBlogChips(appliedPanel, (keys) =>
    update(Object.fromEntries(keys.map((key) => [key, undefined]))),
  );
  const hasFilters = Boolean(
    list.search || list.tab !== 'all' || list.categoryId || chips.length > 0,
  );
  const sortValue = `${list.sort.field},${list.sort.direction}`;
  const sortChanged =
    list.sort.field !== DEFAULT_BLOG_SORT.field ||
    list.sort.direction !== DEFAULT_BLOG_SORT.direction;

  const changeSort = (field: string, direction: 'asc' | 'desc') => {
    const isDefault =
      field === DEFAULT_BLOG_SORT.field && direction === DEFAULT_BLOG_SORT.direction;
    update({ sort: isDefault ? undefined : field, dir: isDefault ? undefined : direction });
  };
  const applyPanel = (next: BlogPanelFilters) => {
    update({
      tag: next.tag,
      pFrom: next.publishedFrom,
      pTo: next.publishedTo,
      cFrom: next.createdFrom,
      cTo: next.createdTo,
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

  const categoryOptions = (categories.data ?? []).map((category) => ({
    value: String(category.id),
    label: category.status === 'active' ? category.title : `${category.title} (inactive)`,
  }));
  const selects: ToolbarSelect[] = [
    ...(permissions.canViewCategories
      ? [
          {
            id: 'category',
            label: 'Category',
            value: list.categoryId ? String(list.categoryId) : '',
            allLabel: 'All categories',
            options: categoryOptions,
            onChange: (value: string) => update({ cat: value || undefined }),
          },
        ]
      : []),
    {
      id: 'sort',
      label: 'Sort by',
      // A header sort without a preset (e.g. status) is shown as an extra entry.
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

  const goToCreate = () => void navigate(ROUTES.blogNew);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <BlogPageHeading
          title="Blogs"
          crumbs={[{ label: 'Dashboard', to: ROUTES.dashboard }, { label: 'Blogs' }]}
        />
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
              Add new blog
            </Button>
          )}
        </div>
      </header>

      <BlogStatsCards
        counts={counts.data}
        isLoading={counts.isPending}
        error={counts.error}
        onRetry={() => void counts.refetch()}
      />

      <Paper className="min-w-0 overflow-hidden">
        <BlogTabs
          label="Blog status"
          value={list.tab}
          onChange={(tab) => update({ tab: tab === 'all' ? undefined : tab })}
          options={TABS.map((tab) => ({
            value: tab.value,
            label: tab.label,
            count: counts.data ? tab.count(counts.data) : undefined,
          }))}
        />
        <ListToolbar
          search={searchInput}
          onSearchChange={handleSearchChange}
          searchLabel="Search blogs"
          searchPlaceholder="Search title or slug…"
          selects={selects}
          onOpenFilters={() => setPanelOpen(true)}
          panelFilterCount={chips.length}
          onClear={hasFilters || sortChanged ? clearAll : undefined}
          onRefresh={refresh}
          refreshLabel="Refresh blogs"
          isRefreshing={isFetching}
        />
        <ActiveFilterChips filters={chips} />
        <BulkActionsBar count={selectedBlogs.length} onClear={clearSelection}>
          {canChangeStatus && (
            <>
              <Button
                size="small"
                variant="outlined"
                startIcon={<PublishOutlined />}
                onClick={() =>
                  setDialog({ kind: 'status', blogs: selectedBlogs, status: 'publish' })
                }
              >
                Publish
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<UnpublishedOutlined />}
                onClick={() => setDialog({ kind: 'status', blogs: selectedBlogs, status: 'draft' })}
              >
                Unpublish
              </Button>
            </>
          )}
          <Button
            size="small"
            variant="outlined"
            startIcon={<FileDownloadOutlined />}
            onClick={() => exporter.exportRows(selectedBlogs)}
          >
            Export
          </Button>
          {canDelete && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<DeleteOutline />}
              onClick={() => setDialog({ kind: 'delete', blogs: selectedBlogs })}
            >
              Delete
            </Button>
          )}
        </BulkActionsBar>
        <div className={isFetching && !isPending ? 'opacity-60 transition-opacity' : undefined}>
          <DataTable
            caption="Blogs"
            columns={columns}
            rows={data?.content}
            getRowId={(blog) => blog.id}
            isLoading={isPending}
            error={error}
            onRetry={() => void refetch()}
            skeletonRows={5}
            emptyState={
              hasFilters ? (
                <EmptyState
                  title="No matching blogs"
                  message="No blogs match these filters. Try clearing some of them."
                  action={
                    <Button variant="outlined" onClick={clearAll}>
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  title="No blogs yet"
                  message="Blogs share guides, market news and tips with buyers on the website and app."
                  action={
                    canCreate && (
                      <Button startIcon={<Add />} onClick={goToCreate}>
                        Add new blog
                      </Button>
                    )
                  }
                />
              )
            }
            minWidth={1150}
            selection={{
              selected: selectedIds,
              onChange: (ids) => setSelection({ key: selectionKey, ids }),
              rowLabel: (id) =>
                `Select ${data?.content.find((blog) => blog.id === id)?.title ?? id}`,
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
          A blog is visible on the website and app when it is published, its publication date has
          arrived and its category is active. Scheduled blogs go live automatically; changes reach
          visitors within a minute.
        </span>
      </Paper>

      <Drawer anchor="right" open={panelOpen} onClose={() => setPanelOpen(false)}>
        <div className="w-[min(22rem,100vw)] p-4">
          <BlogFiltersPanel
            // A new key resets the draft whenever the applied filters change elsewhere.
            key={JSON.stringify(appliedPanel)}
            applied={appliedPanel}
            tagOptions={tagSuggestions.data ?? []}
            onApply={applyPanel}
            onReset={resetPanel}
          />
        </div>
      </Drawer>

      <BlogDialogs dialog={dialog} onClose={() => setDialog(null)} onDone={clearSelection} />
    </div>
  );
}
