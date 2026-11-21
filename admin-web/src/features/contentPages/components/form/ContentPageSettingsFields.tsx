import MenuItem from '@mui/material/MenuItem';
import { useFormContext } from 'react-hook-form';

import { FormTextField } from '@/components/common/Input';

import type { ContentPageFormValues } from '../../schemas/contentPageSchema';
import {
  CONTENT_PAGE_STATUS_OPTIONS,
  CONTENT_PAGE_TYPE_OPTIONS,
} from '../../utils/contentPageDisplay';

interface ContentPageSettingsFieldsProps {
  /** Without the publish permission the status cannot be changed. */
  canChangeStatus: boolean;
  disabled?: boolean;
}

/** Type and status of the page form. */
export function ContentPageSettingsFields({
  canChangeStatus,
  disabled = false,
}: ContentPageSettingsFieldsProps) {
  const { control } = useFormContext<ContentPageFormValues>();

  return (
    <div className="flex flex-col gap-5">
      <FormTextField<ContentPageFormValues>
        name="type"
        control={control}
        select
        label="Page type"
        fullWidth
        disabled={disabled}
        helperText="System pages are the ones the website and app link to. The type is a label only."
      >
        {CONTENT_PAGE_TYPE_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </FormTextField>
      <FormTextField<ContentPageFormValues>
        name="status"
        control={control}
        select
        label="Status"
        fullWidth
        disabled={disabled || !canChangeStatus}
        helperText={
          canChangeStatus
            ? 'Published pages are public within a minute.'
            : 'Changing the status needs the page publish permission.'
        }
      >
        {CONTENT_PAGE_STATUS_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </FormTextField>
    </div>
  );
}
