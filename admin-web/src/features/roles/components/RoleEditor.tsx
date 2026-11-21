import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/Modal';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useUnsavedChangesPrompt } from '@/hooks/useUnsavedChangesPrompt';
import { applyServerErrors } from '@/utils/helpers';

import { useUpdateRole } from '../hooks/useRoles';
import { type RoleDetailsValues, roleDetailsSchema } from '../schemas/roleSchema';
import type { PermissionModule, Role, UpdateRoleRequest } from '../types/role.types';
import {
  permissionsFromSelection,
  sameSelection,
  selectionChanges,
  selectionFromPermissions,
} from '../utils/permissionMatrix';
import { detailsLockReason, permissionsLockReason } from '../utils/roleDisplay';

import { PermissionMatrix } from './PermissionMatrix';
import { RoleDetailsFields } from './RoleDetailsFields';

const FIELDS = ['name', 'description', 'status'] as const;

interface RoleEditorProps {
  role: Role;
  catalog: readonly PermissionModule[] | undefined;
  isCatalogLoading?: boolean;
  catalogError?: Error | null;
  onRetryCatalog?: () => void;
  canUpdate: boolean;
  /** Reports unsaved changes, so the page can ask before switching roles. */
  onDirtyChange?: (dirty: boolean) => void;
}

const toValues = (role: Role): RoleDetailsValues => ({
  name: role.name,
  description: role.description ?? '',
  status: role.status,
});

/**
 * Edits one role: details, status and the permission matrix, saved together with one PATCH that only
 * carries what changed. Mount it with `key={role.id + role.updatedAt}` so a save (or a change made
 * elsewhere) starts again from the persisted role.
 */
export function RoleEditor({
  role,
  catalog,
  isCatalogLoading = false,
  catalogError = null,
  onRetryCatalog,
  canUpdate,
  onDirtyChange,
}: RoleEditorProps) {
  const { can } = usePermissions();
  const update = useUpdateRole();
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const { control, handleSubmit, reset, setError, formState } = useForm<RoleDetailsValues>({
    resolver: zodResolver(roleDetailsSchema),
    defaultValues: toValues(role),
    mode: 'onTouched',
  });
  const status = useWatch({ control, name: 'status' });

  const saved = useMemo(
    () => selectionFromPermissions(role.permissions, catalog ?? []),
    [role.permissions, catalog],
  );
  // Null until the admin changes something, so a catalog arriving later still seeds the matrix.
  const [edited, setEdited] = useState<Set<string> | null>(null);
  const selection = edited ?? saved;
  const permissionsDirty = edited !== null && !sameSelection(edited, saved);
  const changes = selectionChanges(saved, selection);
  const dirty = formState.isDirty || permissionsDirty;

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const { blocker } = useUnsavedChangesPrompt(dirty && !update.isPending);

  const detailsReason = detailsLockReason(role, canUpdate);
  const permissionsReason = permissionsLockReason(role, canUpdate);
  const permissionsEditable = permissionsReason === null;
  // Grants are limited to the admin's own permissions; the backend rejects anything else.
  const isChangeable = useCallback(
    (code: string) => permissionsEditable && can(code),
    [permissionsEditable, can],
  );

  const handleReset = () => {
    reset(toValues(role));
    setEdited(null);
    setFormError(null);
  };

  const save = async (values: RoleDetailsValues) => {
    setFormError(null);
    const request: UpdateRoleRequest = {};
    if (values.name !== role.name) request.name = values.name;
    const description = values.description || null;
    if (description !== role.description) request.description = description;
    if (values.status !== role.status) request.status = values.status;
    if (permissionsDirty) request.permissions = permissionsFromSelection(selection, catalog ?? []);
    if (Object.keys(request).length === 0) return;
    try {
      await update.mutateAsync({ id: role.id, request });
      // The cache refresh remounts this editor (new updatedAt) with the persisted role.
    } catch (error) {
      setFormError(applyServerErrors(error, setError, FIELDS));
    }
  };

  const onSubmit = handleSubmit((values) => {
    if (values.status === 'inactive' && role.status === 'active' && role.userCount > 0) {
      setConfirmDeactivate(true);
      return;
    }
    void save(values);
  });

  const confirmAndSave = handleSubmit(async (values) => {
    await save(values);
    setConfirmDeactivate(false);
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label={`Edit ${role.name}`}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Typography variant="subtitle1" component="h2" fontWeight={700}>
          Role details
        </Typography>
        {dirty && (
          <Chip
            size="small"
            color="warning"
            label={
              permissionsDirty
                ? `Unsaved changes (+${changes.added.length} / −${changes.removed.length} permissions)`
                : 'Unsaved changes'
            }
          />
        )}
      </div>

      {formError && <Alert severity="error">{formError}</Alert>}
      {permissionsReason && (
        <Alert severity={role.superAdmin ? 'info' : 'warning'}>{permissionsReason}</Alert>
      )}

      <RoleDetailsFields
        control={control}
        role={role}
        detailsDisabled={detailsReason !== null}
        statusDisabled={!permissionsEditable}
        statusHelper={
          status === 'inactive' && role.status === 'active'
            ? 'Users with this role lose every permission once you save.'
            : undefined
        }
      />

      <Divider />

      <div className="flex flex-col gap-3">
        <Typography variant="subtitle1" component="h2" fontWeight={700}>
          Permissions
        </Typography>
        <PermissionMatrix
          catalog={catalog}
          selection={selection}
          onChange={setEdited}
          isChangeable={isChangeable}
          isLoading={isCatalogLoading}
          error={catalogError}
          onRetry={onRetryCatalog}
          caption={`Permissions of ${role.name}`}
        />
      </div>

      {detailsReason === null && (
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={update.isPending} disabled={!dirty}>
            Save changes
          </Button>
          <Button variant="outlined" onClick={handleReset} disabled={!dirty || update.isPending}>
            Reset
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeactivate}
        title="Deactivate role"
        confirmLabel="Deactivate and save"
        destructive
        loading={update.isPending}
        onCancel={() => setConfirmDeactivate(false)}
        onConfirm={() => void confirmAndSave()}
        description={
          <Typography variant="body2">
            {role.userCount} user{role.userCount === 1 ? '' : 's'} with the “{role.name}” role will
            lose every permission immediately, including access to the admin panel. Continue?
          </Typography>
        }
      />
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Discard unsaved changes?"
        description="Your changes to this role have not been saved."
        confirmLabel="Discard changes"
        destructive
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
    </form>
  );
}
