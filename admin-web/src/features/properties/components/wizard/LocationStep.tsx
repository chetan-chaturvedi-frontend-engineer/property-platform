import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { FormTextField } from '@/components/common/Input';
import { applyServerErrors } from '@/utils/helpers';

import { useUpdateLocation } from '../../hooks/useProperties';
import { type LocationFormValues, locationSchema } from '../../schemas/propertySchemas';

import { StepActions, StepCard, StepError, type StepProps } from './WizardShared';
import { changedFields, numberOrNull, textOrNull, toInput } from './wizardForm';

const FIELDS = [
  'projectAddress',
  'city',
  'locality',
  'pincode',
  'state',
  'landmark',
  'latitude',
  'longitude',
] as const;

export function LocationStep({ property, onSaved, onBack }: StepProps) {
  const update = useUpdateLocation();
  const [formError, setFormError] = useState<unknown>(null);
  const { location } = property;
  const { control, handleSubmit, setError } = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      projectAddress: toInput(location.projectAddress),
      city: toInput(location.city),
      locality: toInput(location.locality),
      pincode: toInput(location.pincode),
      state: toInput(location.state),
      landmark: toInput(location.landmark),
      latitude: toInput(location.latitude),
      longitude: toInput(location.longitude),
    },
    mode: 'onTouched',
  });

  const onSubmit = (values: LocationFormValues) => {
    setFormError(null);
    const body = changedFields(location, {
      projectAddress: values.projectAddress.trim(),
      city: values.city.trim(),
      locality: values.locality.trim(),
      pincode: values.pincode.trim(),
      state: values.state.trim(),
      landmark: textOrNull(values.landmark),
      latitude: numberOrNull(values.latitude),
      longitude: numberOrNull(values.longitude),
    });
    if (Object.keys(body).length === 0) {
      onSaved(property);
      return;
    }
    update.mutate(
      { id: property.id, version: property.version, body },
      {
        onSuccess: onSaved,
        onError: (error) =>
          setFormError(applyServerErrors(error, setError, FIELDS) === null ? null : error),
      },
    );
  };

  return (
    <StepCard
      title="Location"
      description="Where the project is. Coordinates are stored as entered; they are not looked up or verified."
    >
      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
        <StepError error={formError} propertyId={property.id} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormTextField
            control={control}
            name="projectAddress"
            label="Address"
            required
            multiline
            minRows={2}
            className="md:col-span-2"
            slotProps={{ htmlInput: { maxLength: 1000 } }}
          />
          <FormTextField
            control={control}
            name="locality"
            label="Locality / area"
            required
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />
          <FormTextField
            control={control}
            name="city"
            label="City"
            required
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />
          <FormTextField
            control={control}
            name="state"
            label="State"
            required
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />
          <FormTextField
            control={control}
            name="pincode"
            label="PIN code"
            required
            slotProps={{ htmlInput: { maxLength: 6, inputMode: 'numeric' } }}
          />
          <FormTextField
            control={control}
            name="landmark"
            label="Landmark"
            className="md:col-span-2"
            slotProps={{ htmlInput: { maxLength: 150 } }}
          />
          <FormTextField
            control={control}
            name="latitude"
            label="Latitude"
            helperText="-90 to 90, optional"
            slotProps={{ htmlInput: { inputMode: 'decimal' } }}
          />
          <FormTextField
            control={control}
            name="longitude"
            label="Longitude"
            helperText="-180 to 180, optional"
            slotProps={{ htmlInput: { inputMode: 'decimal' } }}
          />
        </div>
        <StepActions onBack={onBack} saving={update.isPending} />
      </form>
    </StepCard>
  );
}
