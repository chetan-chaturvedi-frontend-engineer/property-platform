import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import MenuItem from '@mui/material/MenuItem';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/common/Button';
import { FormTextField, PasswordField } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { PERMISSIONS } from '@/utils/constants';
import { applyServerErrors } from '@/utils/helpers';

import { useCreateUser, useUpdateUser, useUserRoles } from '../hooks/useUsers';
import { type UserFormMode, type UserFormValues, userFormSchema } from '../schemas/userSchema';
import {
  CREATE_STATUSES,
  isCreateStatus,
  type ManagedUser,
  type UpdateUserRequest,
  USER_STATUSES,
  type UserStatus,
} from '../types/user.types';
import { roleLabel, USER_STATUS_META } from '../utils/userDisplay';

const FIELDS = [
  'fullName',
  'email',
  'phone',
  'userType',
  'status',
  'password',
  'passwordConfirmation',
] as const;

const EMPTY: UserFormValues = {
  fullName: '',
  email: '',
  phone: '',
  userType: '',
  status: 'pending',
  password: '',
  passwordConfirmation: '',
  // Applies only when creating an active account.
  signInReady: true,
};

function toFormValues(user: ManagedUser): UserFormValues {
  return {
    ...EMPTY,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone ?? '',
    userType: user.userType,
    status: user.status,
  };
}

/** PATCH body with only the fields that changed, so unchanged fields are never overwritten. */
function toUpdateRequest(user: ManagedUser, values: UserFormValues): UpdateUserRequest {
  const request: UpdateUserRequest = {};
  if (values.fullName !== user.fullName) request.fullName = values.fullName;
  if (values.email !== user.email) request.email = values.email;
  const phone = values.phone || null;
  if (phone !== user.phone) request.phone = phone;
  if (values.userType !== user.userType) request.userType = values.userType;
  if (values.status !== user.status) request.status = values.status;
  return request;
}

/** An account never returns to pending once it has left it (backend rule). */
function editableStatuses(current: UserStatus): readonly UserStatus[] {
  return current === 'pending' ? USER_STATUSES : USER_STATUSES.filter((s) => s !== 'pending');
}

interface UserFormDialogProps {
  open: boolean;
  /** Edit this user; create a new one when absent. */
  user?: ManagedUser | null;
  /** The signed-in admin cannot change their own role or status (backend: `user_self_modification`). */
  isSelf?: boolean;
  onClose: () => void;
}

/** Mounted only while open, so every opening starts from fresh values. */
export function UserFormDialog({ open, user, isSelf = false, onClose }: UserFormDialogProps) {
  const mode: UserFormMode = user ? 'edit' : 'create';
  const { can } = usePermissions();
  const canChangeStatus = can(PERMISSIONS.userChangeStatus) && !isSelf;
  const [formError, setFormError] = useState<string | null>(null);
  const roles = useUserRoles();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const isSaving = createUser.isPending || updateUser.isPending;
  const resolver = useMemo(() => zodResolver(userFormSchema(mode)), [mode]);
  const { control, handleSubmit, setError } = useForm<UserFormValues>({
    resolver,
    defaultValues: user ? toFormValues(user) : EMPTY,
    mode: 'onTouched',
  });

  // Only roles the admin may assign are offered; the user's current role stays visible (disabled) when it
  // is not one of them, so editing other fields never changes it.
  const roleOptions = useMemo(() => {
    const options = (roles.data ?? [])
      .filter((role) => role.assignable)
      .map((role) => ({ slug: role.slug, name: role.name, disabled: false }));
    if (user && !options.some((role) => role.slug === user.userType)) {
      return [{ slug: user.userType, name: roleLabel(user), disabled: true }, ...options];
    }
    return options;
  }, [roles.data, user]);
  const roleLocked = isSelf || (user ? roleOptions[0]?.disabled === true : false);
  const statuses =
    mode === 'create' ? CREATE_STATUSES : editableStatuses(user?.status ?? 'pending');
  const status = useWatch({ control, name: 'status' });
  const signInReady = useWatch({ control, name: 'signInReady' });
  // The backend accepts emailVerified only for accounts created active (which needs USER_CHANGE_STATUS).
  const offerSignInReady = mode === 'create' && canChangeStatus && status === 'active';

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (user) {
        const request = toUpdateRequest(user, values);
        if (Object.keys(request).length > 0) {
          await updateUser.mutateAsync({ id: user.id, request });
        }
      } else {
        await createUser.mutateAsync({
          fullName: values.fullName,
          email: values.email,
          ...(values.phone ? { phone: values.phone } : {}),
          password: values.password,
          passwordConfirmation: values.passwordConfirmation,
          userType: values.userType,
          // Without USER_CHANGE_STATUS the field is hidden and the server default (pending) applies.
          ...(canChangeStatus && isCreateStatus(values.status) ? { status: values.status } : {}),
          ...(offerSignInReady && values.signInReady ? { emailVerified: true } : {}),
        });
      }
      onClose();
    } catch (error) {
      setFormError(applyServerErrors(error, setError, FIELDS));
    }
  });

  const formId = mode === 'create' ? 'create-user-form' : 'edit-user-form';
  const statusHelper = isSelf
    ? 'You cannot change your own status'
    : !can(PERMISSIONS.userChangeStatus)
      ? 'You are not allowed to change account status'
      : mode === 'create' && !(offerSignInReady && signInReady)
        ? 'The user must verify their email or phone before signing in'
        : undefined;

  return (
    <Modal
      open={open}
      title={mode === 'create' ? 'Add new user' : `Edit ${user?.fullName ?? 'user'}`}
      onClose={isSaving ? () => undefined : onClose}
      maxWidth="sm"
      actions={
        <>
          <Button variant="text" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={isSaving} disabled={roles.isPending}>
            {mode === 'create' ? 'Create user' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={onSubmit}
        noValidate
        aria-label={mode === 'create' ? 'Add new user' : 'Edit user'}
        className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2"
      >
        {formError && (
          <Alert severity="error" className="sm:col-span-2">
            {formError}
          </Alert>
        )}
        {roles.isError && (
          <Alert severity="warning" className="sm:col-span-2">
            Could not load roles. {roles.error.message}
          </Alert>
        )}
        <FormTextField
          control={control}
          name="fullName"
          label="Full name"
          autoComplete="off"
          required
          className="sm:col-span-2"
        />
        <FormTextField
          control={control}
          name="email"
          label="Email"
          type="email"
          autoComplete="off"
          required
        />
        <FormTextField
          control={control}
          name="phone"
          label="Phone"
          type="tel"
          autoComplete="off"
          helperText="Optional. Include the country code."
        />
        <FormTextField
          control={control}
          name="userType"
          label="Role"
          select
          required
          disabled={roleLocked || roles.isPending}
          helperText={
            isSelf
              ? 'You cannot change your own role'
              : roleLocked
                ? 'You are not allowed to change this role'
                : undefined
          }
        >
          {roleOptions.map((role) => (
            <MenuItem key={role.slug} value={role.slug} disabled={role.disabled}>
              {role.name}
            </MenuItem>
          ))}
        </FormTextField>
        {(mode === 'edit' || canChangeStatus) && (
          <FormTextField
            control={control}
            name="status"
            label="Status"
            select
            required
            disabled={!canChangeStatus}
            helperText={statusHelper}
          >
            {statuses.map((status) => (
              <MenuItem key={status} value={status}>
                {USER_STATUS_META[status].label}
              </MenuItem>
            ))}
          </FormTextField>
        )}
        {offerSignInReady && (
          <div className="sm:col-span-2">
            <Controller
              control={control}
              name="signInReady"
              render={({ field: { value, onChange, ref } }) => (
                <FormControlLabel
                  label="Sign-in ready"
                  control={
                    <Checkbox
                      checked={value}
                      onChange={(event) => onChange(event.target.checked)}
                      inputRef={ref}
                      slotProps={{ input: { 'aria-describedby': 'sign-in-ready-help' } }}
                    />
                  }
                />
              )}
            />
            <FormHelperText id="sign-in-ready-help" className="mt-0 ml-8">
              Marks the email as verified, so the user can sign in right away with this password.
              Only do this if you know the email belongs to them.
            </FormHelperText>
          </div>
        )}
        {mode === 'create' && (
          <>
            <PasswordField
              control={control}
              name="password"
              label="Password"
              autoComplete="new-password"
              helperText="8+ characters with upper and lower case, a digit and a symbol"
              required
            />
            <PasswordField
              control={control}
              name="passwordConfirmation"
              label="Confirm password"
              autoComplete="new-password"
              required
            />
          </>
        )}
      </form>
    </Modal>
  );
}
