import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import { Controller, useFormContext } from 'react-hook-form';

import { FormTextField } from '@/components/common/Input';

import { BANNER_LIMITS, type BannerFormValues } from '../schemas/bannerSchema';
import { BANNER_STATUSES } from '../types/banner.types';
import type { BannerOption } from '../utils/bannerOptions';

interface BannerInfoFieldsProps {
  typeOptions: readonly BannerOption[];
  placementOptions: readonly BannerOption[];
  disabled?: boolean;
}

/** Title, type and placement. Saved values no longer offered (retired) stay selectable. */
export function BannerInfoFields({
  typeOptions,
  placementOptions,
  disabled = false,
}: BannerInfoFieldsProps) {
  const { control } = useFormContext<BannerFormValues>();

  return (
    <div className="flex flex-col gap-4">
      <FormTextField
        name="title"
        control={control}
        label="Banner title"
        placeholder="Enter banner title"
        required
        fullWidth
        disabled={disabled}
        helperText="Used as the image's alternative text in the app."
        slotProps={{ htmlInput: { maxLength: BANNER_LIMITS.title } }}
      />
      <FormTextField
        name="type"
        control={control}
        select
        label="Banner type"
        required
        fullWidth
        disabled={disabled}
        helperText="What the banner is for."
      >
        {typeOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </FormTextField>
      <FormTextField
        name="placement"
        control={control}
        select
        label="Placement"
        required
        fullWidth
        disabled={disabled}
        helperText="Choose banner position on the website and app."
      >
        {placementOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </FormTextField>
    </div>
  );
}

interface BannerStatusFieldProps {
  /** Without the status permission the choice is locked and explained. */
  canChangeStatus: boolean;
  /** Explains a locked choice, e.g. "New banners are saved as inactive". */
  lockedNote: string;
  disabled?: boolean;
}

const STATUS_LABELS = { active: 'Active', inactive: 'Inactive' } as const;

export function BannerStatusField({
  canChangeStatus,
  lockedNote,
  disabled = false,
}: BannerStatusFieldProps) {
  const { control } = useFormContext<BannerFormValues>();
  return (
    <Controller
      name="status"
      control={control}
      render={({ field }) => (
        <fieldset>
          <Typography component="legend" variant="body2" fontWeight={600}>
            Status
          </Typography>
          <RadioGroup
            row
            {...field}
            onChange={(event) => {
              const value = BANNER_STATUSES.find((status) => status === event.target.value);
              if (value) field.onChange(value);
            }}
          >
            {BANNER_STATUSES.map((status) => (
              <FormControlLabel
                key={status}
                value={status}
                control={<Radio size="small" />}
                label={STATUS_LABELS[status]}
                disabled={disabled || !canChangeStatus}
              />
            ))}
          </RadioGroup>
          {!canChangeStatus && <FormHelperText>{lockedNote}</FormHelperText>}
        </fieldset>
      )}
    />
  );
}
