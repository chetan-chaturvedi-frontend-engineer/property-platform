import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { type Control, Controller, type Path } from 'react-hook-form';

import { FormTextField } from '@/components/common/Input';

import { SITE_VISIT_LIMITS, type SiteVisitFormValues } from '../schemas/siteVisitSchema';
import {
  type LeadPickerOption,
  type PickerOption,
  SITE_VISIT_TYPES,
} from '../types/siteVisit.types';
import {
  addDays,
  MAX_ADVANCE_DAYS,
  propertyNow,
  SITE_VISIT_TIME_ZONE,
  SITE_VISIT_TYPE_LABELS,
} from '../utils/siteVisitDisplay';

import { LeadPicker, PropertyPicker, UserPicker } from './Pickers';

interface SectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

function Section({ title, description, children }: SectionProps) {
  return (
    <fieldset className="flex flex-col gap-4 sm:col-span-2">
      <legend className="mb-1">
        <Typography variant="subtitle2" component="span" fontWeight={700}>
          {title}
        </Typography>
        {description && (
          <Typography variant="caption" color="text.secondary" component="p">
            {description}
          </Typography>
        )}
      </legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

interface PickerFieldProps {
  control: Control<SiteVisitFormValues>;
  name: Extract<Path<SiteVisitFormValues>, 'property' | 'customer' | 'agent' | 'lead'>;
  render: (props: {
    value: PickerOption | null;
    onChange: (value: PickerOption | null) => void;
    error: boolean;
    helperText?: string;
  }) => ReactNode;
  helperText?: string;
}

/** A picker bound to the form, with the field's error as helper text. */
function PickerField({ control, name, render, helperText }: PickerFieldProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <>
          {render({
            value: field.value,
            onChange: field.onChange,
            error: Boolean(fieldState.error),
            helperText: fieldState.error?.message ?? helperText,
          })}
        </>
      )}
    />
  );
}

interface SiteVisitFormFieldsProps {
  control: Control<SiteVisitFormValues>;
  mode: 'create' | 'edit';
  /** Visit details (schedule, visitor) are read-only once the visit is no longer upcoming. */
  detailsLocked?: boolean;
  /** Read-only property name in edit mode (the property never changes). */
  propertyLabel?: string;
  showLead?: boolean;
  showCustomer?: boolean;
  showAgent?: boolean;
  /** Called with the chosen lead, so its contact details can prefill empty visitor fields. */
  onLeadPicked?: (lead: LeadPickerOption) => void;
}

export function SiteVisitFormFields({
  control,
  mode,
  detailsLocked = false,
  propertyLabel,
  showLead = false,
  showCustomer = false,
  showAgent = false,
  onLeadPicked,
}: SiteVisitFormFieldsProps) {
  const today = propertyNow().date;

  return (
    <>
      <Section
        title="Visit"
        description={`Date and time are local to the property (${SITE_VISIT_TIME_ZONE}), up to ${MAX_ADVANCE_DAYS} days ahead.`}
      >
        {mode === 'create' ? (
          <PickerField
            control={control}
            name="property"
            render={(props) => (
              <PropertyPicker label="Property" required className="sm:col-span-2" {...props} />
            )}
          />
        ) : (
          <TextField
            label="Property"
            value={propertyLabel ?? ''}
            size="small"
            disabled
            helperText="The property of a visit cannot change."
            className="sm:col-span-2"
          />
        )}
        <FormTextField
          control={control}
          name="visitDate"
          label="Visit date"
          type="date"
          size="small"
          required
          disabled={detailsLocked}
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { min: today, max: addDays(today, MAX_ADVANCE_DAYS) },
          }}
        />
        <FormTextField
          control={control}
          name="visitTime"
          label="Visit time"
          type="time"
          size="small"
          required
          disabled={detailsLocked}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 300 } }}
        />
        <FormTextField
          control={control}
          name="visitType"
          label="Visit type"
          select
          size="small"
          disabled={detailsLocked}
        >
          {SITE_VISIT_TYPES.map((type) => (
            <MenuItem key={type} value={type}>
              {SITE_VISIT_TYPE_LABELS[type]}
            </MenuItem>
          ))}
        </FormTextField>
        <FormTextField
          control={control}
          name="numberOfPeople"
          label="Number of people"
          size="small"
          required
          disabled={detailsLocked}
          slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 3 } }}
        />
        {showAgent && (
          <PickerField
            control={control}
            name="agent"
            helperText="Must be active and allowed to work on site visits."
            render={(props) => <UserPicker label="Assigned agent" {...props} />}
          />
        )}
      </Section>

      <Section title="Visitor" description="Contact details of the person visiting.">
        {showLead && (
          <PickerField
            control={control}
            name="lead"
            helperText={
              mode === 'create' ? 'Picking a lead fills in empty contact fields.' : undefined
            }
            render={({ onChange, ...props }) => (
              <LeadPicker
                label="Lead / customer"
                {...props}
                onChange={(value, option) => {
                  onChange(value);
                  if (option) onLeadPicked?.(option);
                }}
              />
            )}
          />
        )}
        {showCustomer && (
          <PickerField
            control={control}
            name="customer"
            helperText="The visitor's app account, if they have one."
            render={(props) => <UserPicker label="Customer account" {...props} />}
          />
        )}
        <FormTextField
          control={control}
          name="name"
          label="Customer name"
          size="small"
          required
          disabled={detailsLocked}
          slotProps={{ htmlInput: { maxLength: SITE_VISIT_LIMITS.name } }}
        />
        <FormTextField
          control={control}
          name="mobile"
          label="Contact number"
          size="small"
          required
          disabled={detailsLocked}
          type="tel"
          slotProps={{ htmlInput: { maxLength: SITE_VISIT_LIMITS.mobile } }}
        />
        <FormTextField
          control={control}
          name="email"
          label="Email"
          size="small"
          type="email"
          disabled={detailsLocked}
          className="sm:col-span-2"
          slotProps={{ htmlInput: { maxLength: SITE_VISIT_LIMITS.email } }}
        />
        <FormTextField
          control={control}
          name="note"
          label="Additional notes"
          size="small"
          multiline
          minRows={2}
          disabled={detailsLocked}
          className="sm:col-span-2"
          slotProps={{ htmlInput: { maxLength: SITE_VISIT_LIMITS.note } }}
        />
      </Section>

      <Section title="Follow-up" description="Can be changed at any time, also after the visit.">
        <FormTextField
          control={control}
          name="nextFollowUp"
          label="Next follow-up"
          type="datetime-local"
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <FormTextField
          control={control}
          name="followUpNote"
          label="Remarks"
          size="small"
          multiline
          minRows={1}
          slotProps={{ htmlInput: { maxLength: SITE_VISIT_LIMITS.note } }}
        />
      </Section>
    </>
  );
}
