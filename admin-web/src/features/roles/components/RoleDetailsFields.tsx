import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { type Control, Controller } from 'react-hook-form';

import { FormTextField } from '@/components/common/Input';
import { formatDateTime } from '@/utils/formatters';

import type { RoleDetailsValues } from '../schemas/roleSchema';
import type { Role } from '../types/role.types';
import { ROLE_DESCRIPTION_MAX_LENGTH, ROLE_STATUS_META } from '../utils/roleDisplay';

interface RoleDetailsFieldsProps {
  control: Control<RoleDetailsValues>;
  role: Role;
  detailsDisabled: boolean;
  statusDisabled: boolean;
  /** Shown under the status switch, e.g. why it is locked. */
  statusHelper?: ReactNode;
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Typography variant="caption" fontWeight={600} component="p">
        {label}
      </Typography>
      <Typography variant="body2" className="flex items-center gap-1.5">
        <CalendarMonthOutlined fontSize="small" color="action" aria-hidden />
        {value}
      </Typography>
    </div>
  );
}

/** Name, immutable slug, status and description of a role, plus its timestamps. */
export function RoleDetailsFields({
  control,
  role,
  detailsDisabled,
  statusDisabled,
  statusHelper,
}: RoleDetailsFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_minmax(12rem,auto)]">
      <FormTextField
        control={control}
        name="name"
        label="Role name"
        required
        size="small"
        disabled={detailsDisabled}
      />
      <TextField
        label="Role slug"
        size="small"
        value={role.slug}
        disabled
        helperText="Fixed when the role is created"
      />
      <div>
        <Typography variant="caption" fontWeight={600} component="p">
          Role status
        </Typography>
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <FormControlLabel
              disabled={statusDisabled}
              control={
                <Switch
                  color="success"
                  checked={field.value === 'active'}
                  onChange={(event) => field.onChange(event.target.checked ? 'active' : 'inactive')}
                />
              }
              label={ROLE_STATUS_META[field.value].label}
            />
          )}
        />
        {statusHelper && (
          <Typography variant="caption" color="text.secondary" component="p">
            {statusHelper}
          </Typography>
        )}
      </div>
      <FormTextField
        control={control}
        name="description"
        label="Description"
        multiline
        minRows={3}
        size="small"
        disabled={detailsDisabled}
        className="md:col-span-2"
        slotProps={{ htmlInput: { maxLength: ROLE_DESCRIPTION_MAX_LENGTH } }}
      />
      <div className="flex flex-col gap-3">
        <MetaItem label="Created on" value={formatDateTime(role.createdAt)} />
        <MetaItem label="Last updated" value={formatDateTime(role.updatedAt)} />
      </div>
    </div>
  );
}
