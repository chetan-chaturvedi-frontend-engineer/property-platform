import Add from '@mui/icons-material/Add';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';

import { Button } from '@/components/common/Button';
import { DataTable, type SortDirection } from '@/components/common/DataTable/DataTable';
import { ConfirmDialog } from '@/components/common/Modal';
import { PageHeading } from '@/components/common/PageHeading';
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

import { buildUserColumns } from '../components/userColumns';
import { UserDetailsDrawer } from '../components/UserDetailsDrawer';
import { UserFiltersBar } from '../components/UserFiltersBar';
import { UserFormDialog } from '../components/UserFormDialog';
import { UserStatsCards } from '../components/UserStatsCards';
import { type UserExportFilters, useUserExport } from '../hooks/useUserExport';
import { useDeleteUser, useUserRoles, useUsers, useUserStats } from '../hooks/useUsers';
import type { ManagedUser, UserSortField, UserStatus } from '../types/user.types';
import { USER_STATUS_META } from '../utils/userDisplay';

type StatusTab = 'all' | Extract<UserStatus, 'active' | 'pending' | 'inactive' | 'suspended'>;

const STATUS_TABS: Array<{ value: StatusTab; label: string }> = [
  { value: 'all', label: 'All users' },
  { value: 'active', label: USER_STATUS_META.active.label },
  { value: 'pending', label: USER_STATUS_META.pending.label },
  { value: 'inactive', label: USER_STATUS_META.inactive.label },
  // "Blocked" (suspended accounts).
  { value: 'suspended', label: USER_STATUS_META.suspended.label },
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
  // Shared by the table and the CSV export, so the export holds exactly the filtered users.
  const filters: UserExportFilters = {
    sort: `${sort.field},${sort.direction}`,
    search: search || undefined,
    status: statusTab === 'all' ? undefined : statusTab,
    userType: userType || undefined,
    createdFrom: createdFrom || undefined,
    createdTo: createdTo || undefined,
  };
  const { data, isPending, isFetching, error, refetch } = useUsers(
    { ...filters, page, size: Math.min(pageSize, PAGINATION.maxPageSize) },
    { enabled: dateRangeIsValid },
  );
  const deleteUser = useDeleteUser();
  const exporter = useUserExport();

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
        <PageHeading
          title="Users"
          crumbs={[{ label: 'Dashboard', to: ROUTES.dashboard }, { label: 'Users' }]}
        />
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <Button
            variant="outlined"
            size="large"
            startIcon={<FileDownloadOutlined />}
            loading={exporter.isExporting}
            disabled={!dateRangeIsValid}
            onClick={() => void exporter.exportMatching(filters)}
          >
            Export CSV
          </Button>
          {canCreate && (
            <Button
              startIcon={<Add />}
              size="large"
              onClick={() => setFormState({ mode: 'create' })}
            >
              Add new user
            </Button>
          )}
        </div>
      </header>

      <UserStatsCards />

      <Paper className="overflow-hidden">
        <UserFiltersBar
          statusTabs={STATUS_TABS.map((tab) => ({ ...tab, count: tabCount(tab.value) }))}
          status={statusTab}
          onStatusChange={(value) => {
            setStatusTab(value);
            setPage(0);
          }}
          roles={(roles.data ?? []).map((role) => ({
            value: role.slug,
            label: role.active ? role.name : `${role.name} (inactive)`,
          }))}
          role={userType}
          onRoleChange={(value) => {
            setUserType(value);
            setPage(0);
          }}
          rolesError={roles.isError}
          joinedFrom={createdFrom}
          joinedTo={createdTo}
          onJoinedFromChange={(value) => {
            setCreatedFrom(value);
            setPage(0);
          }}
          onJoinedToChange={(value) => {
            setCreatedTo(value);
            setPage(0);
          }}
          search={searchInput}
          onSearchChange={(value) => {
            setSearchInput(value);
            setPage(0);
          }}
          searchMaxLength={SEARCH_MAX_LENGTH}
          canClear={hasFilters || sort !== DEFAULT_SORT}
          onClear={resetFilters}
        />
        {/* Single-line headers and dates, and a visible divider between rows. */}
        <div
          className={`[&_tbody_td]:border-b [&_tbody_td]:border-line [&_tbody_tr:last-child>td]:border-b-0 [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap ${
            isFetching && !isPending ? 'opacity-60 transition-opacity' : ''
          }`}
        >
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
            minWidth={1080}
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
              variant: 'numbered',
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
