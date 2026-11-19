import Add from '@mui/icons-material/Add';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import FormHelperText from '@mui/material/FormHelperText';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { type FieldPath, useFieldArray, useForm } from 'react-hook-form';

import { Button } from '@/components/common/Button';
import { FormTextField } from '@/components/common/Input';
import { toApiError } from '@/services/api/apiError';

import { useSyncApartments } from '../../hooks/useProperties';
import {
  type ApartmentFormValues,
  type ApartmentsFormValues,
  apartmentsSchema,
  MAX_APARTMENTS,
} from '../../schemas/propertySchemas';
import {
  APARTMENT_AREA_UNITS,
  APARTMENT_TYPES,
  type ApartmentRequest,
  type ApartmentResponse,
} from '../../types/property.types';
import { APARTMENT_TYPE_LABELS, AREA_UNIT_LABELS } from '../../utils/propertyDisplay';

import { StepActions, StepCard, StepError, type StepProps } from './WizardShared';
import { numberOrUndefined, toInput } from './wizardForm';

const NEW_APARTMENT: ApartmentFormValues = {
  apartmentName: '',
  apartmentType: '2bhk',
  startingPrice: '',
  bedrooms: '2',
  bathrooms: '2',
  balconies: '',
  carParking: '',
  areaMin: '',
  areaMax: '',
  carpetArea: '',
  superBuiltUpArea: '',
  areaUnit: 'sq_ft',
};

function toFormValues(a: ApartmentResponse): ApartmentFormValues {
  return {
    id: a.id,
    apartmentName: a.apartmentName,
    apartmentType: a.apartmentType,
    startingPrice: toInput(a.startingPrice),
    bedrooms: toInput(a.bedrooms),
    bathrooms: toInput(a.bathrooms),
    balconies: toInput(a.balconies),
    carParking: toInput(a.carParking),
    areaMin: toInput(a.areaMin),
    areaMax: toInput(a.areaMax),
    carpetArea: toInput(a.carpetArea),
    superBuiltUpArea: toInput(a.superBuiltUpArea),
    areaUnit: a.areaUnit,
  };
}

/**
 * Each item replaces the whole configuration on the server, so fields this form does not edit
 * (description, highlights, built-up and balcony areas, currency) are carried over unchanged.
 */
function toRequest(values: ApartmentFormValues, existing?: ApartmentResponse): ApartmentRequest {
  return {
    ...(values.id ? { id: values.id } : {}),
    apartmentName: values.apartmentName.trim(),
    apartmentType: values.apartmentType,
    startingPrice: Number(values.startingPrice),
    bedrooms: Number(values.bedrooms),
    bathrooms: Number(values.bathrooms),
    balconies: numberOrUndefined(values.balconies),
    carParking: numberOrUndefined(values.carParking),
    areaMin: Number(values.areaMin),
    areaMax: Number(values.areaMax),
    carpetArea: numberOrUndefined(values.carpetArea),
    superBuiltUpArea: numberOrUndefined(values.superBuiltUpArea),
    areaUnit: values.areaUnit,
    ...(existing
      ? {
          currency: existing.currency,
          description: existing.description ?? undefined,
          builtUpArea: existing.builtUpArea ?? undefined,
          ...(existing.balconyArea != null ? { balconyArea: existing.balconyArea } : {}),
          ...(existing.highlights.length ? { highlights: existing.highlights } : {}),
        }
      : {}),
  };
}

/** Server keys such as `apartments[0].areaMax` -> form paths `apartments.0.areaMax`. */
function toFormPath(key: string): string {
  return key.replace(/\[(\d+)\]/g, '.$1');
}

export function ApartmentsStep({ property, onSaved, onBack }: StepProps) {
  const sync = useSyncApartments();
  const [formError, setFormError] = useState<unknown>(null);
  const { control, handleSubmit, setError, formState } = useForm<ApartmentsFormValues>({
    resolver: zodResolver(apartmentsSchema),
    defaultValues: {
      apartments: property.apartments.length
        ? property.apartments.map(toFormValues)
        : [NEW_APARTMENT],
    },
    mode: 'onTouched',
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'apartments' });
  const listError =
    formState.errors.apartments?.root?.message ?? formState.errors.apartments?.message;

  const onSubmit = (values: ApartmentsFormValues) => {
    setFormError(null);
    const existing = new Map(property.apartments.map((a) => [a.id, a]));
    const body = values.apartments.map((a) => toRequest(a, a.id ? existing.get(a.id) : undefined));
    sync.mutate(
      { id: property.id, version: property.version, body },
      {
        onSuccess: onSaved,
        onError: (error) => {
          const apiError = toApiError(error);
          let unmatched = Object.keys(apiError.fieldErrors).length === 0;
          for (const [key, message] of Object.entries(apiError.fieldErrors)) {
            const path = toFormPath(key);
            if (/^apartments\.\d+\.\w+$/.test(path)) {
              setError(path as FieldPath<ApartmentsFormValues>, { type: 'server', message });
            } else {
              unmatched = true;
            }
          }
          setFormError(unmatched ? error : null);
        },
      },
    );
  };

  return (
    <StepCard
      title="Unit types and pricing"
      description="Each configuration needs a starting price and its advertised area range. Removing one here deletes it when you save."
    >
      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
        <StepError error={formError} propertyId={property.id} />
        <div className="flex flex-col gap-4">
          {fields.map((field, index) => (
            <fieldset key={field.id} className="rounded-xl border p-4">
              <legend className="px-1">
                <Typography variant="subtitle2" component="span">
                  Unit type {index + 1}
                </Typography>
              </legend>
              <div className="flex justify-end">
                <Tooltip title="Remove this unit type">
                  <span>
                    <IconButton
                      size="small"
                      color="error"
                      aria-label={`Remove unit type ${index + 1}`}
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FormTextField
                  control={control}
                  name={`apartments.${index}.apartmentName`}
                  label="Name"
                  required
                  className="sm:col-span-2"
                  placeholder="e.g. 2 BHK Type A"
                  slotProps={{ htmlInput: { maxLength: 100 } }}
                />
                <FormTextField
                  control={control}
                  name={`apartments.${index}.apartmentType`}
                  label="Type"
                  select
                  required
                >
                  {APARTMENT_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {APARTMENT_TYPE_LABELS[type]}
                    </MenuItem>
                  ))}
                </FormTextField>
                <FormTextField
                  control={control}
                  name={`apartments.${index}.startingPrice`}
                  label="Starting price (₹)"
                  required
                  slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                />
                <FormTextField
                  control={control}
                  name={`apartments.${index}.bedrooms`}
                  label="Bedrooms"
                  required
                  slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                />
                <FormTextField
                  control={control}
                  name={`apartments.${index}.bathrooms`}
                  label="Bathrooms"
                  required
                  slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                />
                <FormTextField
                  control={control}
                  name={`apartments.${index}.balconies`}
                  label="Balconies"
                  slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                />
                <FormTextField
                  control={control}
                  name={`apartments.${index}.carParking`}
                  label="Parking"
                  slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                />
                <FormTextField
                  control={control}
                  name={`apartments.${index}.areaMin`}
                  label="Area from"
                  required
                  slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                />
                <FormTextField
                  control={control}
                  name={`apartments.${index}.areaMax`}
                  label="Area to"
                  required
                  slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                />
                <FormTextField
                  control={control}
                  name={`apartments.${index}.areaUnit`}
                  label="Area unit"
                  select
                >
                  {APARTMENT_AREA_UNITS.map((unit) => (
                    <MenuItem key={unit} value={unit}>
                      {AREA_UNIT_LABELS[unit]}
                    </MenuItem>
                  ))}
                </FormTextField>
                <FormTextField
                  control={control}
                  name={`apartments.${index}.carpetArea`}
                  label="Carpet area"
                  slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                />
                <FormTextField
                  control={control}
                  name={`apartments.${index}.superBuiltUpArea`}
                  label="Super built-up area"
                  className="lg:col-span-2"
                  slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                />
              </div>
            </fieldset>
          ))}
          {listError && <FormHelperText error>{listError}</FormHelperText>}
          <div>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => append(NEW_APARTMENT)}
              disabled={fields.length >= MAX_APARTMENTS}
            >
              Add unit type
            </Button>
          </div>
        </div>
        <StepActions onBack={onBack} saving={sync.isPending} />
      </form>
    </StepCard>
  );
}
