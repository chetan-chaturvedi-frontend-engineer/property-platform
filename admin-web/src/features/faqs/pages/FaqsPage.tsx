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
import { faqRoutes, ROUTES, SEARCH_DEBOUNCE_MS, STORAGE_KEYS } from '@/utils/constants';

import { buildFaqColumns } from '../components/faqColumns';
import { type ActiveFaqDialog, FaqDialogs } from '../components/FaqDialogs';
import { FaqExpandedRow } from '../components/FaqExpandedRow';
import { FaqStatsCards } from '../components/FaqStatsCards';
import { FaqViewDialog } from '../components/FaqViewDialog';
import {
  DEFAULT_FAQ_SORT,
  isDefaultFaqSort,
  toFaqFilters,
  useFaqListParams,
} from '../hooks/useFaqListParams';
import { useFaqPermissions } from '../hooks/useFaqPermissions';
import { useFaqCategories, useFaqCounts, useFaqs } from '../hooks/useFaqs';
import { FAQ_STATUS_OPTIONS } from '../utils/faqDisplay';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

const SORT_OPTIONS = [
  { value: 'sortOrder,asc', label: 'Display order' },
  { value: 'updatedAt,desc', label: 'Recently updated' },
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'createdAt,asc', label: 'Oldest first' },
  { value: 'question,asc', label: 'Question (A–Z)' },
  { value: 'question,desc', label: 'Question (Z–A)' },
] as const;

export function FaqsPage() {
  const navigate = useNavigate();
  const permissions = useFaqPermissions();
  const list = useFaqListParams();
  const { update, changeSort } = list;
  const [storedPageSize, setPageSize] = useLocalStorage<number>(STORAGE_KEYS.faqsPageSize, 10);
  const pageSize = PAGE_SIZE_OPTIONS.find((size) => size === storedPageSize) ?? 10;
  const [panelOpen, setPanelOpen] = useState(false);
  const [dialog, setDialog] = useState<ActiveFaqDialog | null>(null);
  const [viewId, setViewId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());

  // Typing is local; the value goes to the URL (and the API) once typing pauses.
  const [searchInput, setSearchInput] = useState(list.search);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(searchTimer.current), []);
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => update({ q: value.trim() }), SEARCH_DEBOUNCE_MS);
  };

  const filters = toFaqFilters(list);
  const counts = useFaqCounts();
  const categories = useFaqCategories();
  const categoryList = useMemo(() => categories.data ?? [], [categories.data]);
  const { data, isPending, isFetching, error, refetch } = useFaqs({
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
  const selectedFaqs = (data?.content ?? []).filter((faq) => selectedIds.has(faq.id));
  const clearSelection = () => setSelection({ key: selectionKey, ids: new Set() });

  // A page past the end (e.g. after deleting the last row of a page) jumps to the last page.
  useEffect(() => {
    if (data && data.totalPages > 0 && list.page >= data.totalPages) {
      update({ page: data.totalPages - 1 }, false);
    }
  }, [data, list.page, update]);

  const { canView, canCreate, canEdit, canChangeStatus, canDelete } = permissions;
  const goToEdit = (id: number) => void navigate(faqRoutes.edit(id));
  const columns = useMemo(
    () =>
      buildFaqColumns(
        {
          onView: canView ? (faq) => setViewId(faq.id) : undefined,
          onEdit: canEdit ? (faq) => void navigate(faqRoutes.edit(faq.id)) : undefined,
          onChangeStatus: canChangeStatus
            ? (faq, status) => setDialog({ kind: 'status', faqs: [faq], status })
            : undefined,
          onDelete: canDelete ? (faq) => setDialog({ kind: 'delete', faqs: [faq] }) : undefined,
        },
        categoryList,
      ),
    [canView, canEdit, canChangeStatus, canDelete, navigate, categoryList, setDialog, setViewId],
  );

  const hasFilters = Boolean(list.search || list.category || list.status);
  const sortValue = `${list.sort.field},${list.sort.direction}`;
  const sortOptions = SORT_OPTIONS.some((option) => option.value === sortValue)
    ? SORT_OPTIONS
    : [...SORT_OPTIONS, { value: sortValue, label: 'Column sort' }];
  const categoryOptions = categoryList.map((category) => ({
    value: category.key,
    label: category.label,
  }));
  // A category in the URL that is no longer configured (orphaned FAQs) is still offered.
  if (list.category && !categoryOptions.some((option) => option.value === list.category)) {
    categoryOptions.push({ value: list.category, label: `${list.category} (removed)` });
  }

  const selects: ToolbarSelect[] = [
    {
      id: 'category',
      label: 'Category',
      value: list.category,
      allLabel: 'All categories',
      options: categoryOptions,
      onChange: (value) => update({ cat: value || undefined }),
    },
    {
      id: 'status',
      label: 'Status',
      value: list.status ?? '',
      allLabel: 'All statuses',
      options: FAQ_STATUS_OPTIONS,
      onChange: (value) => update({ status: value || undefined }),
    },
  ];

  const appliedPanel = {
    category: list.category,
    status: list.status ?? '',
    sort: sortValue,
  };
  const applyPanel = (next: typeof appliedPanel) => {
    // The URL parser validates both parts; the default order is not stored.
    const [field = DEFAULT_FAQ_SORT.field, direction = 'asc'] = next.sort.split(',');
    const isDefault = field === DEFAULT_FAQ_SORT.field && direction === DEFAULT_FAQ_SORT.direction;
    update({
      cat: next.category || undefined,
      status: next.status || undefined,
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
    update({ cat: undefined, status: undefined, sort: undefined, dir: undefined });
    setPanelOpen(false);
  };
  const refresh = () => {
    void refetch();
    void counts.refetch();
  };
  const toggleExpanded = (id: number) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const goToCreate = () => void navigate(ROUTES.faqNew);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeading
          title="FAQs"
          crumbs={[{ label: 'Dashboard', to: ROUTES.dashboard }, { label: 'FAQs' }]}
        />
        {canCreate && (
          <Button
            startIcon={<Add />}
            size="large"
            onClick={goToCreate}
            className="self-start sm:self-auto"
          >
            Add new FAQ
          </Button>
        )}
      </header>

      <FaqStatsCards
        counts={counts.data}
        categoryCount={categories.data?.length}
        isLoading={counts.isPending}
        isCategoriesLoading={categories.isPending}
        error={counts.error}
        onRetry={() => void counts.refetch()}
      />

      <Paper className="min-w-0 overflow-hidden">
        <ListToolbar
          search={searchInput}
          onSearchChange={handleSearchChange}
          searchLabel="Search FAQs"
          searchPlaceholder="Search FAQs…"
          selects={selects}
          onOpenFilters={() => setPanelOpen(true)}
          panelFilterCount={isDefaultFaqSort(list.sort) ? 0 : 1}
          onClear={hasFilters || !isDefaultFaqSort(list.sort) ? clearAll : undefined}
          onRefresh={refresh}
          refreshLabel="Refresh FAQs"
          isRefreshing={isFetching}
        />
        <BulkActionsBar count={selectedFaqs.length} onClear={clearSelection}>
          {canChangeStatus && (
            <>
              <Button
                size="small"
                variant="outlined"
                startIcon={<PublishOutlined />}
                onClick={() => setDialog({ kind: 'status', faqs: selectedFaqs, status: 'publish' })}
              >
                Publish
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<UnpublishedOutlined />}
                onClick={() => setDialog({ kind: 'status', faqs: selectedFaqs, status: 'draft' })}
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
              onClick={() => setDialog({ kind: 'delete', faqs: selectedFaqs })}
            >
              Delete
            </Button>
          )}
        </BulkActionsBar>
        <div className={isFetching && !isPending ? 'opacity-60 transition-opacity' : undefined}>
          <DataTable
            caption="FAQs"
            columns={columns}
            rows={data?.content}
            getRowId={(faq) => faq.id}
            isLoading={isPending}
            error={error}
            onRetry={() => void refetch()}
            skeletonRows={6}
            emptyState={
              hasFilters ? (
                <EmptyState
                  title="No matching FAQs"
                  message="No FAQs match this search or these filters. Try clearing some of them."
                  action={
                    <Button variant="outlined" onClick={clearAll}>
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  title="No FAQs yet"
                  message="FAQs answer common questions from buyers and sellers on the website and app."
                  action={
                    canCreate && (
                      <Button startIcon={<Add />} onClick={goToCreate}>
                        Add new FAQ
                      </Button>
                    )
                  }
                />
              )
            }
            minWidth={1000}
            selection={
              canChangeStatus || canDelete
                ? {
                    selected: selectedIds,
                    onChange: (ids) => setSelection({ key: selectionKey, ids }),
                    rowLabel: (id) =>
                      `Select ${data?.content.find((faq) => faq.id === id)?.question ?? id}`,
                  }
                : undefined
            }
            expansion={{
              expanded,
              onToggle: toggleExpanded,
              toggleLabel: (faq) => `Details of ${faq.question}`,
              render: (faq) => <FaqExpandedRow id={faq.id} categories={categoryList} />,
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
          Published FAQs appear on the website and app in display order (lowest first) within a
          minute. Categories are configured on the server; a FAQ whose category was removed stays
          hidden until it is moved. Deleting a FAQ is permanent.
        </span>
      </Paper>

      <Drawer anchor="right" open={panelOpen} onClose={() => setPanelOpen(false)}>
        <div className="w-[min(22rem,100vw)] p-4">
          <FiltersPanel
            // A new key resets the draft whenever the applied filters change elsewhere.
            key={JSON.stringify(appliedPanel)}
            label="FAQ filters"
            fields={[
              {
                id: 'category',
                label: 'Category',
                options: categoryOptions,
                allLabel: 'All categories',
              },
              {
                id: 'status',
                label: 'Status',
                options: FAQ_STATUS_OPTIONS,
                allLabel: 'All statuses',
              },
              { id: 'sort', label: 'Sort by', options: sortOptions },
            ]}
            applied={appliedPanel}
            onApply={applyPanel}
            onReset={resetPanel}
          />
        </div>
      </Drawer>

      <FaqViewDialog
        id={viewId}
        categories={categoryList}
        onClose={() => setViewId(null)}
        onEdit={canEdit ? goToEdit : undefined}
      />
      <FaqDialogs dialog={dialog} onClose={() => setDialog(null)} onDone={clearSelection} />
    </div>
  );
}
