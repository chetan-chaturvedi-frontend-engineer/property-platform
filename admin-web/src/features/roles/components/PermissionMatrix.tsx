import Search from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';
import Skeleton from '@mui/material/Skeleton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';

import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/Feedback/EmptyState';
import { ErrorState } from '@/components/common/Feedback/ErrorState';

import type { PermissionModule } from '../types/role.types';
import {
  actionLabel,
  filterModules,
  matrixColumns,
  moduleCodes,
  type PermissionSelection,
  setCodes,
} from '../utils/permissionMatrix';

import { PermissionModuleRow } from './PermissionModuleRow';

interface PermissionMatrixProps {
  catalog: readonly PermissionModule[] | undefined;
  selection: PermissionSelection;
  onChange: (selection: Set<string>) => void;
  /** Whether the signed-in admin may change a code; false for every code when read-only. */
  isChangeable: (code: string) => boolean;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  /** Accessible name of the table. */
  caption?: string;
}

/**
 * The role permission matrix, generated from the backend catalog: shared actions as columns, every
 * action when a module is expanded, a module checkbox with an indeterminate state, search, and bulk
 * select for the visible modules. Bulk actions skip codes the admin may not change.
 */
export function PermissionMatrix({
  catalog,
  selection,
  onChange,
  isChangeable,
  isLoading = false,
  error = null,
  onRetry,
  caption = 'Permissions',
}: PermissionMatrixProps) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const columns = useMemo(() => matrixColumns(catalog ?? []), [catalog]);
  const visible = useMemo(() => filterModules(catalog ?? [], query), [catalog, query]);
  const total = useMemo(
    () => (catalog ?? []).reduce((sum, module) => sum + module.actions.length, 0),
    [catalog],
  );
  const granted = useMemo(
    () =>
      (catalog ?? []).reduce(
        (sum, module) => sum + module.actions.filter((a) => selection.has(a.code)).length,
        0,
      ),
    [catalog, selection],
  );

  if (error && !catalog) {
    return (
      <ErrorState title="Could not load permissions" message={error.message} onRetry={onRetry} />
    );
  }

  const visibleCodes = visible.flatMap(({ module }) => moduleCodes(module));
  const anyChangeable = visibleCodes.some(isChangeable);
  const setMany = (codes: readonly string[], value: boolean) =>
    onChange(setCodes(selection, codes, value, isChangeable));
  const toggleExpanded = (key: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Typography variant="body2" color="text.secondary" aria-live="polite">
          {isLoading ? <Skeleton width={160} /> : `${granted} of ${total} permissions granted`}
        </Typography>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <TextField
            size="small"
            type="search"
            value={query}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
            placeholder="Search permissions…"
            slotProps={{
              htmlInput: { 'aria-label': 'Search permissions' },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
            className="sm:w-64"
          />
          <div className="flex gap-2">
            <Button
              size="small"
              variant="outlined"
              disabled={!anyChangeable || isLoading}
              onClick={() => setMany(visibleCodes, true)}
            >
              {query ? 'Select visible' : 'Select all'}
            </Button>
            <Button
              size="small"
              variant="text"
              disabled={!anyChangeable || isLoading}
              onClick={() => setMany(visibleCodes, false)}
            >
              {query ? 'Clear visible' : 'Clear all'}
            </Button>
          </div>
        </div>
      </div>

      <TableContainer className="rounded-lg border" sx={{ borderColor: 'divider' }}>
        <Table size="small" aria-label={caption} sx={{ minWidth: 640 }}>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell>Permission module</TableCell>
              {columns.map((column) => (
                <TableCell key={column} align="center">
                  {actionLabel(column)}
                </TableCell>
              ))}
              <TableCell align="center">All</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }, (_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={columns.length + 3 || 8}>
                    <Skeleton height={28} />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading &&
              visible.map(({ module, matchedActions }) => (
                <PermissionModuleRow
                  key={module.key}
                  module={module}
                  columns={columns}
                  selection={selection}
                  // A search that matches only some actions opens the row so they are visible.
                  expanded={expanded.has(module.key) || matchedActions.length > 0}
                  onToggleExpanded={() => toggleExpanded(module.key)}
                  onSetCodes={setMany}
                  isChangeable={isChangeable}
                  highlighted={matchedActions}
                />
              ))}
          </TableBody>
        </Table>
        {!isLoading && visible.length === 0 && (
          <EmptyState
            title="No matching permissions"
            message="No module or permission matches this search."
            action={
              <Button variant="outlined" size="small" onClick={() => setQuery('')}>
                Clear search
              </Button>
            }
          />
        )}
      </TableContainer>
    </div>
  );
}
