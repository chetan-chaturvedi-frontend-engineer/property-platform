import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { FormTextField } from '@/components/common/Input';

import { PLAN_LIMITS, type PlanFormValues } from '../schemas/planSchema';
import { PLAN_STATUSES } from '../types/subscriptionPlan.types';
import { PLAN_STATUS_META } from '../utils/planDisplay';

import { FeatureListField } from './FeatureListField';
import { PlanPricingFields } from './PlanPricingFields';

interface SectionProps {
  title: string;
  children: ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <section aria-label={title} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Typography variant="subtitle2" component="h3" fontWeight={700} className="sm:col-span-2">
        {title}
      </Typography>
      {children}
    </section>
  );
}

interface SwitchFieldProps {
  name: 'popular' | 'unlimitedProperties';
  label: string;
  description?: string;
}

function SwitchField({ name, label, description }: SwitchFieldProps) {
  const { control } = useFormContext<PlanFormValues>();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, ref, ...field } }) => (
        <FormControlLabel
          label={
            <span>
              {label}
              {description && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  component="span"
                  display="block"
                >
                  {description}
                </Typography>
              )}
            </span>
          }
          control={
            <Switch
              {...field}
              inputRef={ref}
              checked={value}
              onChange={(event) => onChange(event.target.checked)}
            />
          }
        />
      )}
    />
  );
}

interface PlanFormFieldsProps {
  /** Editing an existing plan: the slug is then always set. */
  isEdit?: boolean;
}

/** Every field of the plan form. Must be rendered inside the form's `FormProvider`. */
export function PlanFormFields({ isEdit = false }: PlanFormFieldsProps) {
  const { control } = useFormContext<PlanFormValues>();
  const [unlimited, status] = useWatch({ control, name: ['unlimitedProperties', 'status'] });

  return (
    <div className="flex flex-col gap-6">
      <Section title="Basics">
        <FormTextField
          control={control}
          name="title"
          label="Plan name"
          required
          slotProps={{ htmlInput: { maxLength: PLAN_LIMITS.title } }}
        />
        <FormTextField
          control={control}
          name="slug"
          label="Slug"
          helperText={
            isEdit
              ? 'Unique URL key. Changing it can break saved links.'
              : 'Optional; generated from the name when left empty.'
          }
          slotProps={{ htmlInput: { maxLength: PLAN_LIMITS.slug } }}
        />
        <FormTextField
          control={control}
          name="description"
          label="Description"
          multiline
          minRows={3}
          className="sm:col-span-2"
          slotProps={{ htmlInput: { maxLength: PLAN_LIMITS.description } }}
        />
        <FormTextField
          control={control}
          name="icon"
          label="Icon name"
          helperText='Icon identifier used by the apps, e.g. "crown"'
          slotProps={{ htmlInput: { maxLength: PLAN_LIMITS.icon } }}
        />
        <FormTextField
          control={control}
          name="photo"
          label="Photo"
          helperText="https:// URL or storage key"
          slotProps={{ htmlInput: { maxLength: PLAN_LIMITS.photo } }}
        />
      </Section>

      <PlanPricingFields />

      <Section title="Limits">
        <div className="flex flex-col gap-2">
          <SwitchField name="unlimitedProperties" label="Unlimited properties" />
          {!unlimited && (
            <FormTextField
              control={control}
              name="noOfProperties"
              label="Active property listings"
              required
              slotProps={{
                htmlInput: { inputMode: 'numeric', min: 0, max: PLAN_LIMITS.maxProperties },
              }}
            />
          )}
        </div>
        <FormTextField
          control={control}
          name="noOfTeamMembers"
          label="Team members"
          helperText="Builder team seats; 0 = team management not included"
          slotProps={{
            htmlInput: { inputMode: 'numeric', min: 0, max: PLAN_LIMITS.maxTeamMembers },
          }}
        />
      </Section>

      <FeatureListField
        control={control}
        max={PLAN_LIMITS.maxFeatures}
        maxLength={PLAN_LIMITS.feature}
      />

      <Section title="Display and status">
        <FormTextField
          control={control}
          name="status"
          label="Status"
          select
          helperText={PLAN_STATUS_META[status].description}
        >
          {PLAN_STATUSES.map((value) => (
            <MenuItem key={value} value={value}>
              {PLAN_STATUS_META[value].label}
            </MenuItem>
          ))}
        </FormTextField>
        <FormTextField
          control={control}
          name="sortOrder"
          label="Display order"
          helperText="Lower numbers are shown first"
          slotProps={{
            htmlInput: { inputMode: 'numeric', min: 0, max: PLAN_LIMITS.maxSortOrder },
          }}
        />
        <div className="sm:col-span-2">
          <SwitchField
            name="popular"
            label="Mark as popular"
            description="Highlights this plan as the recommended choice."
          />
        </div>
      </Section>
    </div>
  );
}
