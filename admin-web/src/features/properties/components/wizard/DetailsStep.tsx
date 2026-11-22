import { zodResolver } from '@hookform/resolvers/zod';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import { useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { FormTextField } from '@/components/common/Input';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { toApiError } from '@/services/api/apiError';
import { PERMISSIONS } from '@/utils/constants';
import { applyServerErrors } from '@/utils/helpers';

import { useCreateProperty, useUpdateDetails } from '../../hooks/useProperties';
import {
  type DetailsFormOutput,
  type DetailsFormValues,
  detailsSchemaFor,
} from '../../schemas/propertySchemas';
import {
  PROPERTY_TYPES,
  type Property,
  type UpdateDetailsRequest,
} from '../../types/property.types';
import { PROPERTY_TYPE_LABELS } from '../../utils/propertyDisplay';
import { BuilderAccountCard } from '../BuilderAccountCard';

import { BuilderPicker } from './BuilderPicker';

import { StepActions, StepCard, StepError } from './WizardShared';
import { changedFields, textOrNull } from './wizardForm';

const FIELDS = [
  'propertyType',
  'projectName',
  'reraNumber',
  'gstNumber',
  'projectEmail',
  'projectPhone',
] as const;

const EMPTY: DetailsFormValues = {
  propertyType: 'apartment',
  projectName: '',
  builder: null,
  reraNumber: '',
  gstNumber: '',
  projectEmail: '',
  projectPhone: '',
};

/** The linked builder, with its contact details when the account still exists. */
function linkedBuilder(property: Property) {
  const { builderUserId, builder, builderCompanyName } = property.details;
  if (!builderUserId) return null;
  return builder ?? { id: builderUserId, fullName: builderCompanyName, email: null, phone: null };
}

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
  const { can } = usePermissions();
  // Builders are listed through the users API.
  const canListBuilders = can(PERMISSIONS.userList);
  const create = useCreateProperty();
  const update = useUpdateDetails();
  // One key per form: a retried submission returns the same draft instead of creating a second one.
  const idempotencyKey = useRef(newIdempotencyKey());
  const [formError, setFormError] = useState<unknown>(null);
  // A property saved before builder accounts existed has only a typed name; it may keep it until linked.
  const unlinkedName =
    property && !property.details.builderUserId ? property.details.builderCompanyName : null;
  const resolver = useMemo(
    () => zodResolver(detailsSchemaFor(unlinkedName === null)),
    [unlinkedName],
  );
  const { control, handleSubmit, setError } = useForm<
    DetailsFormValues,
    unknown,
    DetailsFormOutput
  >({
    resolver,
    defaultValues: property
      ? {
          propertyType: property.details.propertyType,
          projectName: property.details.projectName,
          builder: linkedBuilder(property),
          reraNumber: property.details.reraNumber ?? '',
          gstNumber: property.details.gstNumber ?? '',
          projectEmail: property.details.projectEmail,
          projectPhone: property.details.projectPhone,
        }
      : EMPTY,
    mode: 'onTouched',
  });
  const builder = useWatch({ control, name: 'builder' });

  const onError = (error: unknown) => {
    // The server reports the builder on builderUserId (bad account) or builderCompanyName (missing).
    const { fieldErrors } = toApiError(error);
    const builderMessage = fieldErrors.builderUserId ?? fieldErrors.builderCompanyName;
    if (builderMessage) {
      setError('builder', { type: 'server', message: builderMessage });
    }
    const others = Object.keys(fieldErrors).filter(
      (field) => field !== 'builderUserId' && field !== 'builderCompanyName',
    );
    if (builderMessage && others.length === 0) {
      setFormError(null);
      return;
    }
    setFormError(applyServerErrors(error, setError, FIELDS) === null ? null : error);
  };

  const onSubmit = (values: DetailsFormOutput) => {
    setFormError(null);
    const { builder: picked, ...fields } = values;
    if (!property) {
      create.mutate(
        {
          request: {
            ...fields,
            ...(picked ? { builderUserId: picked.id } : {}),
            reraNumber: fields.reraNumber || undefined,
            gstNumber: fields.gstNumber || undefined,
          },
          idempotencyKey: idempotencyKey.current,
        },
        { onSuccess: onSaved, onError },
      );
      return;
    }
    const body: UpdateDetailsRequest = changedFields(property.details, {
      ...fields,
      reraNumber: textOrNull(fields.reraNumber),
      gstNumber: textOrNull(fields.gstNumber),
    });
    // Unlinking is not offered: an unlinked property keeps its typed name until a builder is picked.
    if (picked && picked.id !== property.details.builderUserId) {
      body.builderUserId = picked.id;
    }
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
          <div className="flex flex-col gap-2 md:col-span-2">
            <Controller
              control={control}
              name="builder"
              render={({ field, fieldState }) => (
                <BuilderPicker
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  required={unlinkedName === null}
                  disabled={!canListBuilders}
                  error={Boolean(fieldState.error)}
                  helperText={
                    fieldState.error?.message ??
                    (canListBuilders
                      ? 'Builders are users with the Builder role. Their name is shown as the builder.'
                      : 'Choosing a builder needs permission to list users (USER_LIST). Ask an administrator.')
                  }
                />
              )}
            />
            {builder ? (
              <BuilderAccountCard builder={builder} />
            ) : (
              unlinkedName && (
                <Alert severity="info" variant="outlined">
                  Currently “{unlinkedName}”, which is not linked to a builder account. Select a
                  builder to link one; otherwise the name stays as it is.
                </Alert>
              )
            )}
          </div>
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
