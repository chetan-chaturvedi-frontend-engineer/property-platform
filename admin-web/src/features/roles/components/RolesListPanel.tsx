import Add from '@mui/icons-material/Add';
import Search from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';
import ListItemButton from '@mui/material/ListItemButton';
import Pagination from '@mui/material/Pagination';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/Feedback/EmptyState';
import { ErrorState } from '@/components/common/Feedback/ErrorState';
import { RowMenu, type RowMenuAction } from '@/components/common/RowMenu';
import type { EntityId } from '@/types/common.types';
import { formatNumber } from '@/utils/formatters';

import type { Role } from '../types/role.types';

import { RoleBadges } from './RoleBadges';

interface RolesListPanelProps {
  roles: readonly Role[] | undefined;
  totalElements: number;
  /** Zero-based. */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  search: string;
  onSearchChange: (value: string) => void;
  selectedId: EntityId | null;
  onSelect: (role: Role) => void;
  /** Row menu actions for a role; an empty list hides the menu. */
  actionsFor: (role: Role) => RowMenuAction[];
  /** Shown as the bottom button when given. */
  onAdd?: () => void;
  isLoading?: boolean;
  isFetching?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

/** The searchable roles list with the selected role highlighted. */
export function RolesListPanel({
  roles,
  totalElements,
  page,
  totalPages,
  onPageChange,
  search,
  onSearchChange,
  selectedId,
  onSelect,
  actionsFor,
  onAdd,
  isLoading = false,
  isFetching = false,
  error = null,
  onRetry,
}: RolesListPanelProps) {
  return (
    <Paper
      component="section"
      aria-labelledby="roles-panel-title"
      className="flex min-w-0 flex-col"
    >
      <div
        className="flex items-center justify-between gap-3 border-b p-4"
        style={{ borderColor: 'var(--mui-palette-divider)' }}
      >
        <div>
          <Typography id="roles-panel-title" variant="subtitle1" component="h2" fontWeight={700}>
            Roles
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {isLoading ? <Skeleton width={48} /> : `${formatNumber(totalElements)} total`}
          </Typography>
        </div>
        <TextField
          size="small"
          type="search"
          value={search}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onSearchChange(event.target.value)
          }
          placeholder="Search roles…"
          slotProps={{
            htmlInput: { 'aria-label': 'Search roles' },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          className="w-44 sm:w-52"
        />
      </div>

      <div className={isFetching && !isLoading ? 'opacity-60 transition-opacity' : undefined}>
        {isLoading && (
          <div className="flex flex-col gap-3 p-4" aria-busy="true" aria-label="Loading roles">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index}>
                <Skeleton width="50%" />
                <Skeleton width="80%" />
              </div>
            ))}
          </div>
        )}
        {!isLoading && error && !roles && (
          <ErrorState title="Could not load roles" message={error.message} onRetry={onRetry} />
        )}
        {!isLoading && roles?.length === 0 && (
          <EmptyState
            title={search ? 'No matching roles' : 'No roles yet'}
            message={search ? 'No role name, slug or description matches this search.' : undefined}
            action={
              search ? (
                <Button size="small" variant="outlined" onClick={() => onSearchChange('')}>
                  Clear search
                </Button>
              ) : undefined
            }
          />
        )}
        {!isLoading && roles && roles.length > 0 && (
          <ul aria-label="Roles" className="m-0 list-none p-2">
            {roles.map((role) => {
              const selected = role.id === selectedId;
              return (
                <li key={role.id} className="flex items-start gap-1 rounded-lg">
                  <ListItemButton
                    selected={selected}
                    aria-current={selected ? 'true' : undefined}
                    onClick={() => onSelect(role)}
                    className="min-w-0 flex-1 flex-col !items-start rounded-lg"
                    sx={{
                      borderLeft: '3px solid',
                      borderLeftColor: selected ? 'primary.main' : 'transparent',
                      '&.Mui-selected': {
                        bgcolor: 'rgba(var(--mui-palette-primary-mainChannel) / 0.08)',
                      },
                    }}
                  >
                    <span className="flex w-full flex-wrap items-center gap-1.5">
                      <Typography
                        variant="body2"
                        component="span"
                        fontWeight={600}
                        color={selected ? 'primary' : 'textPrimary'}
                        className="break-words"
                      >
                        {role.name}
                      </Typography>
                      <RoleBadges role={role} />
                    </span>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      component="span"
                      className="line-clamp-2"
                    >
                      {role.description ?? role.slug}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" component="span">
                      {role.userCount} user{role.userCount === 1 ? '' : 's'}
                    </Typography>
                  </ListItemButton>
                  <div className="pt-2">
                    <RowMenu label={`Actions for ${role.name}`} actions={actionsFor(role)} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center px-2 pb-2">
          <Pagination
            size="small"
            count={totalPages}
            page={page + 1}
            onChange={(_, value) => onPageChange(value - 1)}
            aria-label="Roles pages"
          />
        </div>
      )}

      {onAdd && (
        <div className="mt-auto p-4 pt-2">
          <Button variant="outlined" fullWidth startIcon={<Add />} onClick={onAdd}>
            Add new role
          </Button>
        </div>
      )}
    </Paper>
  );
}
