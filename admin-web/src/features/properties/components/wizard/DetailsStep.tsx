import { zodResolver } from '@hookform/resolvers/zod';
import MenuItem from '@mui/material/MenuItem';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { FormTextField } from '@/components/common/Input';
import { applyServerErrors } from '@/utils/helpers';

import { useCreateProperty, useUpdateDetails } from '../../hooks/useProperties';
import {
  type DetailsFormOutput,
  type DetailsFormValues,
  detailsSchema,
} from '../../schemas/propertySchemas';
import { PROPERTY_TYPES, type Property } from '../../types/property.types';
import { PROPERTY_TYPE_LABELS } from '../../utils/propertyDisplay';

import { StepActions, StepCard, StepError } from './WizardShared';
import { changedFields, textOrNull } from './wizardForm';

const FIELDS = [
  'propertyType',
  'projectName',
  'builderCompanyName',
  'reraNumber',
  'gstNumber',
  'projectEmail',
  'projectPhone',
] as const;

const EMPTY: DetailsFormValues = {
  propertyType: 'apartment',
  projectName: '',
  builderCompanyName: '',
  reraNumber: '',
  gstNumber: '',
  projectEmail: '',
  projectPhone: '',
};

function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `create-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

interface DetailsStepProps {
  /** Absent: this form creates the draft. */
  property: Property | null;
  onSaved: (property: Property) => void;
}

export function DetailsStep({ property, onSaved }: DetailsStepProps) {
  const create = useCreateProperty();
  const update = useUpdateDetails();
  // One key per form: a retried submission returns the same draft instead of creating a second one.
  const idempotencyKey = useRef(newIdempotencyKey());
  const [formError, setFormError] = useState<unknown>(null);
  const { control, handleSubmit, setError } = useForm<
    DetailsFormValues,
    unknown,
    DetailsFormOutput
  >({
    resolver: zodResolver(detailsSchema),
    defaultValues: property
      ? {
          ...property.details,
          reraNumber: property.details.reraNumber ?? '',
          gstNumber: property.details.gstNumber ?? '',
        }
      : EMPTY,
    mode: 'onTouched',
  });

  const onError = (error: unknown) => {
    setFormError(applyServerErrors(error, setError, FIELDS) === null ? null : error);
  };

  const onSubmit = (values: DetailsFormOutput) => {
    setFormError(null);
    if (!property) {
      create.mutate(
        {
          request: {
            ...values,
            reraNumber: values.reraNumber || undefined,
            gstNumber: values.gstNumber || undefined,
          },
          idempotencyKey: idempotencyKey.current,
        },
        { onSuccess: onSaved, onError },
      );
      return;
    }
    const body = changedFields(property.details, {
      ...values,
      reraNumber: textOrNull(values.reraNumber),
      gstNumber: textOrNull(values.gstNumber),
    });
    if (Object.keys(body).length === 0) {
      onSaved(property);
      return;
    }
    update.mutate(
      { id: property.id, version: property.version, body },
      { onSuccess: onSaved, onError },
    );
  };

  return (
    <StepCard
      title="Property details"
      description="Basic information about the project and how buyers can reach the builder."
    >
      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
        <StepError error={formError} propertyId={property?.id} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormTextField
            control={control}
            name="propertyType"
            label="Property type"
            select
            required
          >
            {PROPERTY_TYPES.map((type) => (
              <MenuItem key={type} value={type}>
                {PROPERTY_TYPE_LABELS[type]}
              </MenuItem>
            ))}
          </FormTextField>
          <FormTextField
            control={control}
            name="projectName"
            label="Project name"
            required
            slotProps={{ htmlInput: { maxLength: 150 } }}
            helperText={property ? 'The public URL keeps its original slug.' : undefined}
          />
          <FormTextField
            control={control}
            name="builderCompanyName"
            label="Builder / company name"
            required
            slotProps={{ htmlInput: { maxLength: 150 } }}
          />
          <FormTextField
            control={control}
            name="reraNumber"
            label="RERA number"
            slotProps={{ htmlInput: { maxLength: 50 } }}
          />
          <FormTextField
            control={control}
            name="gstNumber"
            label="GST number"
            helperText="15-character GSTIN, optional"
            slotProps={{ htmlInput: { maxLength: 15, style: { textTransform: 'uppercase' } } }}
          />
          <FormTextField
            control={control}
            name="projectEmail"
            label="Project email"
            type="email"
            required
            slotProps={{ htmlInput: { maxLength: 255 } }}
          />
          <FormTextField
            control={control}
            name="projectPhone"
            label="Project phone"
            type="tel"
            required
            helperText="Indian numbers may omit +91"
            slotProps={{ htmlInput: { maxLength: 32 } }}
          />
        </div>
        <StepActions
          saving={create.isPending || update.isPending}
          submitLabel={property ? 'Save and continue' : 'Create draft and continue'}
        />
      </form>
    </StepCard>
  );
}
