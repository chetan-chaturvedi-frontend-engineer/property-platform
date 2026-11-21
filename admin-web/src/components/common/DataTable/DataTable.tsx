import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import Checkbox from '@mui/material/Checkbox';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Skeleton from '@mui/material/Skeleton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Fragment, type ReactNode } from 'react';

import { formatNumber } from '@/utils/formatters';

import { EmptyState } from '../Feedback/EmptyState';
import { ErrorState } from '../Feedback/ErrorState';

export interface DataTableColumn<TRow> {
  id: string;
  header: string;
  /** Rendered as React text, so values are escaped. */
  cell: (row: TRow) => ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
  /** API sort field; the header becomes a sort toggle when the table has `sort`. */
  sortField?: string;
}

export type SortDirection = 'asc' | 'desc';

export interface DataTableSort {
  field: string;
  direction: SortDirection;
  onChange: (field: string, direction: SortDirection) => void;
}

export interface DataTablePagination {
  /** Zero-based, like the API. */
  page: number;
  pageSize: number;
  totalElements: number;
  pageSizeOptions?: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  /**
   * `compact` (default): MUI's previous/next bar. `numbered`: "Showing 1 to 10 of 156 entries",
   * page number buttons and a per-page select.
   */
  variant?: 'compact' | 'numbered';
}

export interface DataTableSelection<TId extends string | number> {
  selected: ReadonlySet<TId>;
  onChange: (selected: Set<TId>) => void;
  /** Accessible name of a row's checkbox, e.g. "Select SV-100012". */
  rowLabel: (id: TId) => string;
}

export interface DataTableExpansion<TRow, TId extends string | number> {
  expanded: ReadonlySet<TId>;
  onToggle: (id: TId) => void;
  /** Content of the panel under an expanded row; rendered only while it is open. */
  render: (row: TRow) => ReactNode;
  /** Accessible name of a row's toggle, e.g. "Details of How do I register?". */
  toggleLabel: (row: TRow) => string;
}

interface DataTableProps<TRow, TId extends string | number> {
  caption: string;
  columns: readonly DataTableColumn<TRow>[];
  rows: readonly TRow[] | undefined;
  getRowId: (row: TRow) => TId;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  emptyMessage?: string;
  /** Replaces the default empty state, e.g. to add an action. */
  emptyState?: ReactNode;
  pagination?: DataTablePagination;
  sort?: DataTableSort;
  /** Adds a checkbox column; "select all" covers the rows on this page. */
  selection?: DataTableSelection<TId>;
  /** Adds a toggle column that opens a details panel under each row. */
  expansion?: DataTableExpansion<TRow, TId>;
  skeletonRows?: number;
  /** Lets wide tables scroll horizontally instead of squeezing columns on small screens. */
  minWidth?: number;
}

/** Generic table with loading, empty, error states, optional selection and server-side pagination. */
export function DataTable<TRow, TId extends string | number = string | number>({
  caption,
  columns,
  rows,
  getRowId,
  isLoading = false,
  error = null,
  onRetry,
  emptyMessage = 'No records found.',
  emptyState,
  pagination,
  sort,
  selection,
  expansion,
  skeletonRows = 5,
  minWidth,
}: DataTableProps<TRow, TId>) {
  if (error && !rows?.length) {
    return <ErrorState message={error.message} onRetry={onRetry} />;
  }

  const showSkeleton = isLoading && !rows;
  const columnCount = columns.length + (selection ? 1 : 0) + (expansion ? 1 : 0);
  const isEmpty = !showSkeleton && (!rows || rows.length === 0);
  const pageIds = rows?.map(getRowId) ?? [];
  const selectedOnPage = selection ? pageIds.filter((id) => selection.selected.has(id)).length : 0;

  const toggleAll = () => {
    if (!selection) return;
    const next = new Set(selection.selected);
    if (selectedOnPage === pageIds.length) {
      pageIds.forEach((id) => next.delete(id));
    } else {
      pageIds.forEach((id) => next.add(id));
    }
    selection.onChange(next);
  };
  const toggleRow = (id: TId) => {
    if (!selection) return;
    const next = new Set(selection.selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selection.onChange(next);
  };

  return (
    <>
      <TableContainer>
        <Table size="small" aria-busy={isLoading || undefined} sx={{ minWidth }}>
          <caption className="sr-only">{caption}</caption>
          <TableHead>
            <TableRow>
              {selection && (
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    checked={pageIds.length > 0 && selectedOnPage === pageIds.length}
                    indeterminate={selectedOnPage > 0 && selectedOnPage < pageIds.length}
                    disabled={pageIds.length === 0}
                    onChange={toggleAll}
                    slotProps={{ input: { 'aria-label': 'Select all rows on this page' } }}
                  />
                </TableCell>
              )}
              {expansion && (
                <TableCell padding="checkbox">
                  <span className="sr-only">Expand</span>
                </TableCell>
              )}
              {columns.map((column) => {
                const isSorted = Boolean(sort && column.sortField === sort.field);
                return (
                  <TableCell
                    key={column.id}
                    align={column.align}
                    style={{ width: column.width }}
                    sortDirection={isSorted && sort ? sort.direction : false}
                  >
                    {sort && column.sortField ? (
                      <TableSortLabel
                        active={isSorted}
                        direction={isSorted ? sort.direction : 'asc'}
                        onClick={() => {
                          const field = column.sortField ?? sort.field;
                          sort.onChange(
                            field,
                            isSorted && sort.direction === 'asc' ? 'desc' : 'asc',
                          );
                        }}
                      >
                        {column.header}
                      </TableSortLabel>
                    ) : (
                      column.header
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {showSkeleton &&
              Array.from({ length: skeletonRows }, (_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  {selection && <TableCell padding="checkbox" />}
                  {expansion && <TableCell padding="checkbox" />}
                  {columns.map((column) => (
                    <TableCell key={column.id}>
                      <Skeleton variant="text" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {rows?.map((row) => {
              const id = getRowId(row);
              const isSelected = selection?.selected.has(id) ?? false;
              const isExpanded = expansion?.expanded.has(id) ?? false;
              const panelId = `row-details-${String(id)}`;
              return (
                <Fragment key={id}>
                  <TableRow
                    hover
                    selected={isSelected}
                    sx={isExpanded ? { '& > td': { borderBottom: 'none' } } : undefined}
                  >
                    {selection && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={isSelected}
                          onChange={() => toggleRow(id)}
                          slotProps={{ input: { 'aria-label': selection.rowLabel(id) } }}
                        />
                      </TableCell>
                    )}
                    {expansion && (
                      <TableCell padding="checkbox">
                        <IconButton
                          size="small"
                          aria-label={expansion.toggleLabel(row)}
                          aria-expanded={isExpanded}
                          aria-controls={isExpanded ? panelId : undefined}
                          onClick={() => expansion.onToggle(id)}
                        >
                          {isExpanded ? (
                            <KeyboardArrowDown fontSize="small" />
                          ) : (
                            <KeyboardArrowRight fontSize="small" />
                          )}
                        </IconButton>
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell key={column.id} align={column.align}>
                        {column.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                  {expansion && isExpanded && (
                    <TableRow selected={isSelected}>
                      <TableCell colSpan={columnCount} sx={{ py: 0 }}>
                        <Collapse in appear unmountOnExit>
                          <div id={panelId} className="pb-4">
                            {expansion.render(row)}
                          </div>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {isEmpty && (emptyState ?? <EmptyState title="No results" message={emptyMessage} />)}
      {pagination &&
        !isEmpty &&
        (pagination.variant === 'numbered' ? (
          <NumberedPagination {...pagination} />
        ) : (
          <TablePagination
            component="div"
            count={pagination.totalElements}
            page={pagination.page}
            rowsPerPage={pagination.pageSize}
            rowsPerPageOptions={
              pagination.pageSizeOptions ? [...pagination.pageSizeOptions] : [pagination.pageSize]
            }
            onPageChange={(_, page) => pagination.onPageChange(page)}
            onRowsPerPageChange={(event) =>
              pagination.onPageSizeChange?.(Number(event.target.value))
            }
          />
        ))}
    </>
  );
}

function NumberedPagination({
  page,
  pageSize,
  totalElements,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}: DataTablePagination) {
  const pageCount = Math.max(1, Math.ceil(totalElements / pageSize));
  const first = totalElements === 0 ? 0 : page * pageSize + 1;
  const last = Math.min(totalElements, (page + 1) * pageSize);
  return (
    <div className="flex flex-col items-center gap-3 border-t px-4 py-3 md:flex-row md:justify-between">
      <Typography variant="body2" color="text.secondary" aria-live="polite">
        Showing {formatNumber(first)} to {formatNumber(last)} of {formatNumber(totalElements)}{' '}
        entries
      </Typography>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Pagination
          count={pageCount}
          page={Math.min(page + 1, pageCount)}
          onChange={(_, next) => onPageChange(next - 1)}
          shape="rounded"
          color="primary"
          variant="outlined"
          siblingCount={1}
          showFirstButton={pageCount > 7}
          showLastButton={pageCount > 7}
          aria-label="Pages"
        />
        {onPageSizeChange && pageSizeOptions && (
          <TextField
            select
            size="small"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            slotProps={{ select: { SelectDisplayProps: { 'aria-label': 'Rows per page' } } }}
            sx={{ minWidth: 112 }}
          >
            {pageSizeOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option} / page
              </MenuItem>
            ))}
          </TextField>
        )}
      </div>
    </div>
  );
}
