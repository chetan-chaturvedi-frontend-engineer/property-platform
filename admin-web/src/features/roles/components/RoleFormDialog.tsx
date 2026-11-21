import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCallback, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/components/common/Button';
import { FormTextField } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { applyServerErrors } from '@/utils/helpers';
import { cleanSlugInput } from '@/utils/slug';

import { useCreateRole, usePermissionCatalog } from '../hooks/useRoles';
import { type CreateRoleValues, createRoleSchema } from '../schemas/roleSchema';
import type { Role } from '../types/role.types';
import { permissionsFromSelection, selectionFromPermissions } from '../utils/permissionMatrix';
import {
  ROLE_DESCRIPTION_MAX_LENGTH,
  ROLE_SLUG_MAX_LENGTH,
  ROLE_STATUS_META,
  roleSlugFromName,
} from '../utils/roleDisplay';

import { PermissionMatrix } from './PermissionMatrix';

const FIELDS = ['name', 'slug', 'description', 'status'] as const;
const FORM_ID = 'create-role-form';

interface RoleFormDialogProps {
  /** Prefills a copy of this role (duplicate); a blank role when absent. */
  source?: Role | null;
  onClose: () => void;
  /** Called with the created role, e.g. to select it. */
  onCreated?: (role: Role) => void;
}

/** Creates a role with its permissions. Mounted only while open, so every opening starts fresh. */
export function RoleFormDialog({ source = null, onClose, onCreated }: RoleFormDialogProps) {
  const { can } = usePermissions();
  const catalog = usePermissionCatalog();
  const create = useCreateRole();
  const [formError, setFormError] = useState<string | null>(null);
  // The slug follows the name until the admin edits it.
  const [slugEdited, setSlugEdited] = useState(false);
  const initialName = source ? `Copy of ${source.name}`.slice(0, 100) : '';
  const { control, handleSubmit, setValue, setError, getFieldState } = useForm<CreateRoleValues>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: initialName,
      slug: source ? roleSlugFromName(`${source.slug}-copy`) : '',
      description: source?.description ?? '',
      status: 'active',
    },
    mode: 'onTouched',
  });
  // A copy only keeps the permissions the admin may grant.
  const [edited, setEdited] = useState<Set<string> | null>(null);
  const seeded =
    source && catalog.data
      ? new Set(
          [...selectionFromPermissions(source.permissions, catalog.data)].filter((code) =>
            can(code),
          ),
        )
      : new Set<string>();
  const selection = edited ?? seeded;
  const isChangeable = useCallback((code: string) => can(code), [can]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const role = await create.mutateAsync({
        name: values.name,
        slug: values.slug,
        ...(values.description ? { description: values.description } : {}),
        status: values.status,
        permissions: permissionsFromSelection(selection, catalog.data ?? []),
      });
      onCreated?.(role);
      onClose();
    } catch (error) {
      setFormError(applyServerErrors(error, setError, FIELDS));
    }
  });

  return (
    <Modal
      open
      title={source ? `Duplicate ${source.name}` : 'Add new role'}
      onClose={create.isPending ? () => undefined : onClose}
      maxWidth="lg"
      actions={
        <>
          <Button variant="text" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            loading={create.isPending}
            disabled={catalog.isPending}
          >
            Create role
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={(event) => void onSubmit(event)}
        noValidate
        aria-label="Add new role"
        className="flex flex-col gap-4 pt-2"
      >
        {formError && <Alert severity="error">{formError}</Alert>}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto]">
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                inputRef={field.ref}
                label="Role name"
                required
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  field.onChange(event.target.value);
                  if (!slugEdited) {
                    setValue('slug', roleSlugFromName(event.target.value), {
                      shouldValidate: getFieldState('slug').isTouched,
                    });
                  }
                }}
              />
            )}
          />
          <Controller
            control={control}
            name="slug"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                inputRef={field.ref}
                label="Role slug"
                required
                error={Boolean(fieldState.error)}
                helperText={
                  fieldState.error?.message ?? 'Used by user accounts; cannot be changed later'
                }
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  setSlugEdited(true);
                  field.onChange(cleanSlugInput(event.target.value).slice(0, ROLE_SLUG_MAX_LENGTH));
                }}
              />
            )}
          />
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <FormControlLabel
                className="md:pt-2"
                control={
                  <Switch
                    color="success"
                    checked={field.value === 'active'}
                    onChange={(event) =>
                      field.onChange(event.target.checked ? 'active' : 'inactive')
                    }
                  />
                }
                label={ROLE_STATUS_META[field.value].label}
              />
            )}
          />
          <FormTextField
            control={control}
            name="description"
            label="Description"
            multiline
            minRows={2}
            className="md:col-span-3"
            slotProps={{ htmlInput: { maxLength: ROLE_DESCRIPTION_MAX_LENGTH } }}
            helperText="Optional. What this role is for."
          />
        </div>
        <Typography variant="subtitle2" component="h3">
          Permissions
        </Typography>
        <Typography variant="caption" color="text.secondary">
          You can only grant permissions you hold yourself. Without “Admin Panel — Access”, users of
          this role cannot sign in to the dashboard.
        </Typography>
        <PermissionMatrix
          catalog={catalog.data}
          selection={selection}
          onChange={setEdited}
          isChangeable={isChangeable}
          isLoading={catalog.isPending}
          error={catalog.error}
          onRetry={() => void catalog.refetch()}
          caption="Permissions of the new role"
        />
      </form>
    </Modal>
  );
}
