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
import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { Button } from '@/components/common/Button';
import { DataTable, type SortDirection } from '@/components/common/DataTable/DataTable';
import { ConfirmDialog } from '@/components/common/Modal';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useDebounce } from '@/hooks/useDebounce';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAuthStore } from '@/store/authStore';
import type { EntityId } from '@/types/common.types';
import {
  PAGINATION,
  PERMISSIONS,
  ROUTES,
  SEARCH_DEBOUNCE_MS,
  STORAGE_KEYS,
} from '@/utils/constants';
import { formatNumber } from '@/utils/formatters';

import { buildUserColumns } from '../components/userColumns';
import { UserDetailsDrawer } from '../components/UserDetailsDrawer';
import { UserFormDialog } from '../components/UserFormDialog';
import { UserStatsCards } from '../components/UserStatsCards';
import { useDeleteUser, useUserRoles, useUsers, useUserStats } from '../hooks/useUsers';
import type { ManagedUser, UserSortField, UserStatus } from '../types/user.types';

type StatusTab = 'all' | Extract<UserStatus, 'active' | 'pending' | 'inactive'>;

const STATUS_TABS: Array<{ value: StatusTab; label: string }> = [
  { value: 'all', label: 'All users' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'inactive', label: 'Inactive' },
];

const SEARCH_MAX_LENGTH = 100;

type FormState = { mode: 'create' } | { mode: 'edit'; user: ManagedUser } | null;

const DEFAULT_SORT: { field: UserSortField; direction: SortDirection } = {
  field: 'createdAt',
  direction: 'desc',
};

export function UsersPage() {
  const { can } = usePermissions();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const canView = can(PERMISSIONS.userView);
  const canCreate = can(PERMISSIONS.userCreate);
  const canUpdate = can(PERMISSIONS.userUpdate);
  const canDelete = can(PERMISSIONS.userDelete);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useLocalStorage<number>(
    STORAGE_KEYS.usersPageSize,
    PAGINATION.defaultPageSize,
  );
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [userType, setUserType] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState(DEFAULT_SORT);
  const search = useDebounce(searchInput.trim(), SEARCH_DEBOUNCE_MS);

  const [viewingId, setViewingId] = useState<EntityId | null>(null);
  const [formState, setFormState] = useState<FormState>(null);
  const [deleting, setDeleting] = useState<ManagedUser | null>(null);

  // Same rule as the backend: the end of the range must not be before its start.
  const dateRangeIsValid = !createdFrom || !createdTo || createdFrom <= createdTo;

  const stats = useUserStats();
  const roles = useUserRoles();
  const { data, isPending, isFetching, error, refetch } = useUsers(
    {
      page,
      size: Math.min(pageSize, PAGINATION.maxPageSize),
      sort: `${sort.field},${sort.direction}`,
      search: search || undefined,
      status: statusTab === 'all' ? undefined : statusTab,
      userType: userType || undefined,
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined,
    },
    { enabled: dateRangeIsValid },
  );
  const deleteUser = useDeleteUser();

  const columns = useMemo(() => {
    const roleBySlug = new Map((roles.data ?? []).map((role) => [role.slug, role]));
    // UI hint only (the backend decides): an active role the admin may not assign is one whose users
    // they may not manage either, e.g. a role with more dashboard access than their own.
    const isManageable = (user: ManagedUser) => {
      const role = roleBySlug.get(user.userType);
      return !role || !role.active || role.assignable;
    };
    return buildUserColumns({
      onView: canView ? (user) => setViewingId(user.id) : undefined,
      onEdit: canUpdate ? (user) => setFormState({ mode: 'edit', user }) : undefined,
      onDelete: canDelete ? setDeleting : undefined,
      canEdit: isManageable,
      canDelete: (user) => user.id !== currentUserId && isManageable(user),
    });
  }, [canView, canUpdate, canDelete, currentUserId, roles.data]);

  const tabCount = (tab: StatusTab): number | undefined =>
    tab === 'all' ? stats.data?.total : stats.data?.byStatus[tab];

  const confirmDelete = () => {
    if (!deleting || deleteUser.isPending) {
      return;
    }
    deleteUser.mutate(deleting.id, {
      onSuccess: () => {
        // Removing the only row on a later page would leave an empty page behind.
        if (page > 0 && data?.content.length === 1) {
          setPage(page - 1);
        }
        setDeleting(null);
      },
    });
  };

  const hasFilters = Boolean(search || userType || createdFrom || createdTo || statusTab !== 'all');

  const resetFilters = () => {
    setSearchInput('');
    setUserType('');
    setCreatedFrom('');
    setCreatedTo('');
    setStatusTab('all');
    setSort(DEFAULT_SORT);
    setPage(0);
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Typography variant="h1">Users</Typography>
          <Breadcrumbs
            aria-label="Breadcrumb"
            separator={<NavigateNext fontSize="small" />}
            className="mt-1"
          >
            <Link component={RouterLink} to={ROUTES.dashboard} underline="hover">
              Dashboard
            </Link>
            <Typography color="text.secondary" aria-current="page">
              Users
            </Typography>
          </Breadcrumbs>
        </div>
        {canCreate && (
          <Button
            startIcon={<Add />}
            size="large"
            onClick={() => setFormState({ mode: 'create' })}
            className="self-start sm:self-auto"
          >
            Add new user
          </Button>
        )}
      </header>

      <UserStatsCards />

      <Paper className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b px-4 pt-2 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            value={statusTab}
            onChange={(_, value: StatusTab) => {
              setStatusTab(value);
              setPage(0);
            }}
            variant="scrollable"
            allowScrollButtonsMobile
            aria-label="Filter users by status"
            textColor="inherit"
            sx={{
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 52 },
              '& .Mui-selected': { color: 'var(--app-primary-strong)' },
              '& .MuiTabs-indicator': { backgroundColor: 'var(--app-primary-strong)', height: 3 },
            }}
          >
            {STATUS_TABS.map((tab) => {
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
        <div className="flex flex-col gap-3 p-4 md:flex-row md:flex-wrap md:items-start">
          <TextField
            size="small"
            type="search"
            placeholder="Search by name, email or phone…"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              setPage(0);
            }}
            className="md:max-w-xs"
            slotProps={{
              htmlInput: { maxLength: SEARCH_MAX_LENGTH, 'aria-label': 'Search users' },
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
            label="Role"
            value={userType}
            onChange={(event) => {
              setUserType(event.target.value);
              setPage(0);
            }}
            className="md:w-44"
            helperText={roles.isError ? 'Could not load roles' : undefined}
            error={roles.isError}
          >
            <MenuItem value="">All roles</MenuItem>
            {(roles.data ?? []).map((role) => (
              <MenuItem key={role.slug} value={role.slug}>
                {role.active ? role.name : `${role.name} (inactive)`}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            type="date"
            label="Joined from"
            value={createdFrom}
            onChange={(event) => {
              setCreatedFrom(event.target.value);
              setPage(0);
            }}
            className="md:w-44"
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            size="small"
            type="date"
            label="Joined to"
            value={createdTo}
            onChange={(event) => {
              setCreatedTo(event.target.value);
              setPage(0);
            }}
            error={!dateRangeIsValid}
            helperText={dateRangeIsValid ? undefined : 'Must not be before the start date'}
            className="md:w-44"
            slotProps={{ inputLabel: { shrink: true } }}
          />
          {(hasFilters || sort !== DEFAULT_SORT) && (
            <Button variant="text" startIcon={<FilterAltOff />} onClick={resetFilters}>
              Clear filters
            </Button>
          )}
        </div>
        <div className={isFetching && !isPending ? 'opacity-60 transition-opacity' : undefined}>
          <DataTable
            caption="Users"
            columns={columns}
            rows={data?.content}
            getRowId={(user) => user.id}
            isLoading={isPending && dateRangeIsValid}
            error={error}
            onRetry={() => void refetch()}
            emptyMessage={
              hasFilters ? 'No users match these filters.' : 'No users have been added yet.'
            }
            minWidth={960}
            sort={{
              field: sort.field,
              direction: sort.direction,
              onChange: (field, direction) => {
                setSort({ field: field as UserSortField, direction });
                setPage(0);
              },
            }}
            pagination={{
              page,
              pageSize,
              totalElements: data?.totalElements ?? 0,
              pageSizeOptions: PAGINATION.pageSizeOptions,
              onPageChange: setPage,
              onPageSizeChange: (size) => {
                setPageSize(size);
                setPage(0);
              },
            }}
          />
        </div>
      </Paper>

      {canView && (
        <UserDetailsDrawer
          userId={viewingId}
          onClose={() => setViewingId(null)}
          onEdit={
            canUpdate
              ? (user) => {
                  setViewingId(null);
                  setFormState({ mode: 'edit', user });
                }
              : undefined
          }
        />
      )}

      {formState && (
        <UserFormDialog
          open
          user={formState.mode === 'edit' ? formState.user : null}
          isSelf={formState.mode === 'edit' && formState.user.id === currentUserId}
          onClose={() => setFormState(null)}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete user?"
        description={
          deleting && (
            <Typography component="span">
              <strong>{deleting.fullName}</strong> ({deleting.email}) will be removed from the
              platform and signed out everywhere. Their properties, leads and history are kept.
            </Typography>
          )
        }
        confirmLabel="Delete user"
        destructive
        loading={deleteUser.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
