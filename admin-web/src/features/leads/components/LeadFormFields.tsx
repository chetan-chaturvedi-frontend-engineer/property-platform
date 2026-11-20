import Autocomplete from '@mui/material/Autocomplete';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { type Control, Controller, type Path, useWatch } from 'react-hook-form';

import { FormTextField, type FormTextFieldProps } from '@/components/common/Input';

import { LEAD_LIMITS, type LeadFormValues } from '../schemas/leadSchema';
import type { AmenityOption } from '../types/lead.types';
import {
  AREA_UNIT_LABELS,
  BHK_OPTIONS,
  bhkLabel,
  FACING_LABELS,
  FURNISHING_LABELS,
  LEAD_PRIORITY_META,
  LEAD_PROPERTY_TYPE_LABELS,
  LEAD_PURPOSE_LABELS,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_META,
  PARKING_LABELS,
  POSSESSION_LABELS,
  slugLabel,
} from '../utils/leadDisplay';

import { AssigneeAutocomplete } from './AssigneeAutocomplete';

type FieldControl = Control<LeadFormValues>;

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-2">
      <Typography component="legend" variant="subtitle2" fontWeight={700} className="mb-3">
        {title}
      </Typography>
      {children}
    </fieldset>
  );
}

interface SelectFieldProps extends Omit<FormTextFieldProps<LeadFormValues>, 'select' | 'children'> {
  options: Record<string, string>;
  /** Label of the "not set" choice; omit for required selects. */
  emptyLabel?: string;
}

function SelectField({ options, emptyLabel, ...rest }: SelectFieldProps) {
  return (
    <FormTextField select {...rest}>
      {emptyLabel !== undefined && (
        <MenuItem value="">
          <em>{emptyLabel}</em>
        </MenuItem>
      )}
      {Object.entries(options).map(([value, label]) => (
        <MenuItem key={value} value={value}>
          {label}
        </MenuItem>
      ))}
    </FormTextField>
  );
}

const labels = <T extends string>(meta: Record<T, { label: string }>) =>
  Object.fromEntries(
    Object.entries<{ label: string }>(meta).map(([key, value]) => [key, value.label]),
  );

export function LeadContactFields({ control }: { control: FieldControl }) {
  return (
    <FormSection title="Contact">
      <FormTextField
        control={control}
        name="leadName"
        label="Lead name"
        required
        autoComplete="off"
        slotProps={{ htmlInput: { maxLength: LEAD_LIMITS.leadName } }}
      />
      <FormTextField control={control} name="email" label="Email" type="email" autoComplete="off" />
      <FormTextField
        control={control}
        name="phone"
        label="Phone"
        type="tel"
        required
        autoComplete="off"
        helperText="Any format; numbers without a country code are taken as Indian"
      />
      <FormTextField
        control={control}
        name="alternatePhone"
        label="Alternate phone"
        type="tel"
        autoComplete="off"
      />
      <FormTextField
        control={control}
        name="location"
        label="Current location"
        className="sm:col-span-2"
        helperText="Where the customer lives now"
      />
    </FormSection>
  );
}

interface LeadEnquiryFieldsProps {
  control: FieldControl;
  /** A converted lead keeps its status (backend rule). */
  statusLocked?: boolean;
  /** Offer the assignee on create (needs `LEAD_ASSIGN`). */
  showAssignee?: boolean;
}

export function LeadEnquiryFields({
  control,
  statusLocked = false,
  showAssignee = false,
}: LeadEnquiryFieldsProps) {
  const status = useWatch({ control, name: 'status' });
  return (
    <FormSection title="Enquiry">
      <SelectField
        control={control}
        name="purpose"
        label="Purpose"
        required
        options={LEAD_PURPOSE_LABELS}
      />
      <SelectField control={control} name="source" label="Source" options={LEAD_SOURCE_LABELS} />
      <SelectField
        control={control}
        name="status"
        label="Status"
        options={labels(LEAD_STATUS_META)}
        disabled={statusLocked}
        helperText={statusLocked ? 'A converted lead keeps its status' : undefined}
      />
      <SelectField
        control={control}
        name="priority"
        label="Priority"
        options={labels(LEAD_PRIORITY_META)}
      />
      {status === 'lost' && (
        <FormTextField
          control={control}
          name="lostReason"
          label="Lost reason"
          required
          multiline
          minRows={2}
          className="sm:col-span-2"
          slotProps={{ htmlInput: { maxLength: LEAD_LIMITS.lostReason } }}
        />
      )}
      <FormTextField
        control={control}
        name="nextFollowUpAt"
        label="Next follow-up"
        type="datetime-local"
        slotProps={{ inputLabel: { shrink: true } }}
      />
      {showAssignee && (
        <Controller
          control={control}
          name="assignee"
          render={({ field, fieldState }) => (
            <AssigneeAutocomplete
              value={field.value}
              onChange={(value) =>
                field.onChange(value ? { ...value, email: value.email ?? '' } : null)
              }
              label="Assign to"
              size="medium"
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message ?? 'Optional. Must be able to work on leads.'}
            />
          )}
        />
      )}
    </FormSection>
  );
}

export function LeadRequirementFields({ control }: { control: FieldControl }) {
  const bhk = useWatch({ control, name: 'bhk' });
  // A saved value outside the offered list stays selectable.
  const bhkValues = bhk && !BHK_OPTIONS.includes(bhk) ? [bhk, ...BHK_OPTIONS] : BHK_OPTIONS;
  const money = { htmlInput: { inputMode: 'decimal' as const } };
  return (
    <FormSection title="Requirements">
      <SelectField
        control={control}
        name="propertyType"
        label="Property type"
        emptyLabel="Not specified"
        options={LEAD_PROPERTY_TYPE_LABELS}
      />
      <SelectField
        control={control}
        name="bhk"
        label="BHK"
        emptyLabel="Not specified"
        options={Object.fromEntries(bhkValues.map((value) => [value, bhkLabel(value)]))}
      />
      <div className="grid grid-cols-[1fr_1fr_6rem] gap-2 sm:col-span-2">
        <FormTextField control={control} name="budgetMin" label="Budget from" slotProps={money} />
        <FormTextField control={control} name="budgetMax" label="Budget to" slotProps={money} />
        <FormTextField
          control={control}
          name="budgetCurrency"
          label="Currency"
          slotProps={{ htmlInput: { maxLength: 3, 'aria-label': 'Budget currency' } }}
        />
      </div>
      <FormTextField control={control} name="area" label="Area" slotProps={money} />
      <SelectField
        control={control}
        name="areaUnit"
        label="Area unit"
        emptyLabel="Not specified"
        options={AREA_UNIT_LABELS}
      />
      <FormTextField
        control={control}
        name="preferredLocation"
        label="Preferred location"
        className="sm:col-span-2"
        slotProps={{ htmlInput: { maxLength: LEAD_LIMITS.preferredLocation } }}
      />
      <SelectField
        control={control}
        name="possession"
        label="Possession"
        emptyLabel="Not specified"
        options={POSSESSION_LABELS}
      />
      <FormTextField
        control={control}
        name="moveInDate"
        label="Move-in date"
        type="date"
        slotProps={{ inputLabel: { shrink: true } }}
      />
    </FormSection>
  );
}

interface LeadPreferenceFieldsProps {
  control: FieldControl;
  /** The amenity catalog; `undefined` hides the picker (no access to the catalog). */
  amenityOptions?: readonly AmenityOption[];
  amenitiesLoading?: boolean;
}

export function LeadPreferenceFields({
  control,
  amenityOptions,
  amenitiesLoading = false,
}: LeadPreferenceFieldsProps) {
  const nameBySlug = new Map((amenityOptions ?? []).map((a) => [a.slug, a.name]));
  return (
    <FormSection title="Preferences">
      <FormTextField
        control={control}
        name="floorPreference"
        label="Floor preference"
        slotProps={{ htmlInput: { maxLength: LEAD_LIMITS.floorPreference } }}
      />
      <SelectField
        control={control}
        name="facing"
        label="Facing"
        emptyLabel="Any"
        options={FACING_LABELS}
      />
      <SelectField
        control={control}
        name="furnishing"
        label="Furnishing"
        emptyLabel="Any"
        options={FURNISHING_LABELS}
      />
      <SelectField
        control={control}
        name="parking"
        label="Parking"
        emptyLabel="Not specified"
        options={PARKING_LABELS}
      />
      {amenityOptions && (
        <Controller
          control={control}
          name="amenities"
          render={({ field, fieldState }) => (
            <Autocomplete<string, true>
              multiple
              className="sm:col-span-2"
              options={amenityOptions.map((a) => a.slug)}
              value={field.value}
              onChange={(_, value) => field.onChange(value)}
              onBlur={field.onBlur}
              loading={amenitiesLoading}
              getOptionLabel={(slug) => nameBySlug.get(slug) ?? slugLabel(slug)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Amenities"
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          )}
        />
      )}
      <Controller
        control={control}
        name="loanRequired"
        render={({ field: { value, onChange, ref } }) => (
          <FormControlLabel
            className="sm:col-span-2"
            label="Home loan required"
            control={
              <Checkbox
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
                inputRef={ref}
              />
            }
          />
        )}
      />
      <FormTextField
        control={control}
        name={'additionalNote' satisfies Path<LeadFormValues>}
        label="Additional notes"
        multiline
        minRows={3}
        className="sm:col-span-2"
        slotProps={{ htmlInput: { maxLength: LEAD_LIMITS.additionalNote } }}
      />
    </FormSection>
  );
}
