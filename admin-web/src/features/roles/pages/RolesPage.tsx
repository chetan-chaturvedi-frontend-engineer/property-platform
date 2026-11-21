import Add from '@mui/icons-material/Add';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import EditOutlined from '@mui/icons-material/EditOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/Modal';
import { PageHeading } from '@/components/common/PageHeading';
import type { RowMenuAction } from '@/components/common/RowMenu';
import type { EntityId } from '@/types/common.types';
import { ROUTES, SEARCH_DEBOUNCE_MS } from '@/utils/constants';

import { RoleDeleteDialog } from '../components/RoleDeleteDialog';
import { RoleDetailsPanel } from '../components/RoleDetailsPanel';
import { RoleFormDialog } from '../components/RoleFormDialog';
import { RolesListPanel } from '../components/RolesListPanel';
import { RoleStatsCards } from '../components/RoleStatsCards';
import { RoleViewDialog } from '../components/RoleViewDialog';
import { useRolePermissions } from '../hooks/useRolePermissions';
import { useRoles, useRoleStats } from '../hooks/useRoles';
import type { Role } from '../types/role.types';

const PAGE_SIZE = 20;

type Dialog =
  | { kind: 'create'; source: Role | null }
  | { kind: 'delete'; role: Role }
  | { kind: 'view'; id: EntityId };

function parseId(value: string | null): EntityId | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parsePage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 0;
}

/**
 * Roles & Permissions: role list (left) and the selected role's details and permission matrix
 * (right). The selected role, search and list page live in the URL.
 */
export function RolesPage() {
  const permissions = useRolePermissions();
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const page = parsePage(params.get('page'));
  const selectedParam = parseId(params.get('role'));
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<EntityId | null>(null);

  const update = useCallback(
    (changes: Record<string, string | undefined>, replace = true) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(changes)) {
            if (value === undefined || value === '') next.delete(key);
            else next.set(key, value);
          }
          return next;
        },
        { replace },
      ),
    [setParams],
  );

  // Typing is local; the value goes to the URL (and the API) once typing pauses.
  const [searchInput, setSearchInput] = useState(search);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(searchTimer.current), []);
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(
      () => update({ q: value.trim() || undefined, page: undefined }),
      SEARCH_DEBOUNCE_MS,
    );
  };

  const stats = useRoleStats();
  const list = useRoles({ search: search || undefined, page, size: PAGE_SIZE, sort: 'name,asc' });
  const roles = list.data?.content;
  // Without a selection in the URL, the first listed role is shown.
  const selectedId = selectedParam ?? roles?.[0]?.id ?? null;

  // A page past the end (e.g. after deleting the last role of a page) jumps to the last page.
  useEffect(() => {
    if (list.data && list.data.totalPages > 0 && page >= list.data.totalPages) {
      update({ page: String(list.data.totalPages - 1) });
    }
  }, [list.data, page, update]);

  const select = (id: EntityId) => {
    if (id === selectedId) return;
    if (dirty) {
      setPendingSelection(id);
      return;
    }
    update({ role: String(id) }, false);
  };

  const { canView, canCreate, canUpdate, canDelete, canListUsers } = permissions;
  const actionsFor = (role: Role): RowMenuAction[] => {
    const actions: RowMenuAction[] = [];
    if (canView) {
      actions.push({
        key: 'view',
        label: 'View details',
        icon: <VisibilityOutlined fontSize="small" />,
        onSelect: () => setDialog({ kind: 'view', id: role.id }),
      });
    }
    if (canUpdate && role.manageable) {
      actions.push({
        key: 'edit',
        label: 'Edit',
        icon: <EditOutlined fontSize="small" />,
        onSelect: () => select(role.id),
      });
    }
    if (canCreate && !role.superAdmin) {
      actions.push({
        key: 'duplicate',
        label: 'Duplicate',
        icon: <ContentCopyOutlined fontSize="small" />,
        onSelect: () => setDialog({ kind: 'create', source: role }),
      });
    }
    if (canDelete && !role.defaultRole) {
      actions.push({
        key: 'delete',
        label: 'Delete',
        icon: <DeleteOutline fontSize="small" />,
        tone: 'danger',
        onSelect: () => setDialog({ kind: 'delete', role }),
      });
    }
    return actions;
  };

  const openCreate = canCreate ? () => setDialog({ kind: 'create', source: null }) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeading
          title="Roles & Permissions"
          crumbs={[{ label: 'Dashboard', to: ROUTES.dashboard }, { label: 'Roles & Permissions' }]}
        />
        {openCreate && (
          <Button
            startIcon={<Add />}
            size="large"
            onClick={openCreate}
            className="self-start sm:self-auto"
          >
            Add new role
          </Button>
        )}
      </header>

      <RoleStatsCards
        stats={stats.data}
        isLoading={stats.isPending}
        error={stats.error}
        onRetry={() => void stats.refetch()}
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)]">
        <RolesListPanel
          roles={roles}
          totalElements={list.data?.totalElements ?? 0}
          page={page}
          totalPages={list.data?.totalPages ?? 0}
          onPageChange={(next) => update({ page: next > 0 ? String(next) : undefined }, false)}
          search={searchInput}
          onSearchChange={handleSearchChange}
          selectedId={selectedId}
          onSelect={(role) => select(role.id)}
          actionsFor={actionsFor}
          onAdd={openCreate}
          isLoading={list.isPending}
          isFetching={list.isFetching}
          error={list.error}
          onRetry={() => void list.refetch()}
        />
        <RoleDetailsPanel
          id={selectedId}
          canUpdate={canUpdate}
          onDirtyChange={setDirty}
          onClearSelection={() => update({ role: undefined })}
        />
      </div>

      {dialog?.kind === 'create' && (
        <RoleFormDialog
          source={dialog.source}
          onClose={() => setDialog(null)}
          // The new role is opened unless that would discard unsaved changes to the current one.
          onCreated={(role) => {
            if (!dirty) update({ role: String(role.id) }, false);
          }}
        />
      )}
      {dialog?.kind === 'delete' && (
        <RoleDeleteDialog
          role={dialog.role}
          onClose={() => setDialog(null)}
          onDeleted={(role) => {
            if (role.id === selectedId) update({ role: undefined });
          }}
        />
      )}
      <RoleViewDialog
        id={dialog?.kind === 'view' ? dialog.id : null}
        canListUsers={canListUsers}
        onClose={() => setDialog(null)}
        onEdit={
          canUpdate
            ? (id) => {
                setDialog(null);
                select(id);
              }
            : undefined
        }
      />
      <ConfirmDialog
        open={pendingSelection !== null}
        title="Discard unsaved changes?"
        description="The selected role has unsaved changes. Switching roles discards them."
        confirmLabel="Discard and switch"
        destructive
        onCancel={() => setPendingSelection(null)}
        onConfirm={() => {
          if (pendingSelection !== null) update({ role: String(pendingSelection) }, false);
          setPendingSelection(null);
          setDirty(false);
        }}
      />
    </div>
  );
}
