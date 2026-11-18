import Skeleton from '@mui/material/Skeleton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import type { ReactNode } from 'react';

import { EmptyState } from '../Feedback/EmptyState';
import { ErrorState } from '../Feedback/ErrorState';

export interface DataTableColumn<TRow> {
  id: string;
  header: string;
  /** Rendered as React text, so values are escaped. */
  cell: (row: TRow) => ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
}

export interface DataTablePagination {
  /** Zero-based, like the API. */
  page: number;
  pageSize: number;
  totalElements: number;
  pageSizeOptions?: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

interface DataTableProps<TRow> {
  caption: string;
  columns: readonly DataTableColumn<TRow>[];
  rows: readonly TRow[] | undefined;
  getRowId: (row: TRow) => string | number;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  emptyMessage?: string;
  pagination?: DataTablePagination;
  skeletonRows?: number;
}

/** Generic table with loading, empty, error states and server-side pagination. */
export function DataTable<TRow>({
  caption,
  columns,
  rows,
  getRowId,
  isLoading = false,
  error = null,
  onRetry,
  emptyMessage = 'No records found.',
  pagination,
  skeletonRows = 5,
}: DataTableProps<TRow>) {
  if (error && !rows?.length) {
    return <ErrorState message={error.message} onRetry={onRetry} />;
  }

  const showSkeleton = isLoading && !rows;
  const isEmpty = !showSkeleton && (!rows || rows.length === 0);

  return (
    <>
      <TableContainer>
        <Table size="small" aria-busy={isLoading || undefined}>
          <caption className="sr-only">{caption}</caption>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.id} align={column.align} style={{ width: column.width }}>
                  {column.header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {showSkeleton &&
              Array.from({ length: skeletonRows }, (_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  {columns.map((column) => (
                    <TableCell key={column.id}>
                      <Skeleton variant="text" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {rows?.map((row) => (
              <TableRow key={getRowId(row)} hover>
                {columns.map((column) => (
                  <TableCell key={column.id} align={column.align}>
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {isEmpty && <EmptyState title="No results" message={emptyMessage} />}
      {pagination && !isEmpty && (
        <TablePagination
          component="div"
          count={pagination.totalElements}
          page={pagination.page}
          rowsPerPage={pagination.pageSize}
          rowsPerPageOptions={
            pagination.pageSizeOptions ? [...pagination.pageSizeOptions] : [pagination.pageSize]
          }
          onPageChange={(_, page) => pagination.onPageChange(page)}
          onRowsPerPageChange={(event) => pagination.onPageSizeChange?.(Number(event.target.value))}
        />
      )}
    </>
  );
}
