import Add from '@mui/icons-material/Add';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import Alert from '@mui/material/Alert';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

import { Button } from '@/components/common/Button';
import { FormTextField } from '@/components/common/Input';
import type { EntityId } from '@/types/common.types';

import {
  useAmenityCatalog,
  useSyncAmenities,
  useSyncNearbyPlaces,
} from '../../hooks/useProperties';
import {
  MAX_NEARBY_PLACES,
  type NearbyPlacesFormValues,
  nearbyPlacesSchema,
} from '../../schemas/propertySchemas';
import {
  type AmenityResponse,
  NEARBY_PLACE_TYPES,
  type Property,
} from '../../types/property.types';
import { NEARBY_PLACE_LABELS } from '../../utils/propertyDisplay';

import { StepActions, StepCard, StepError, type StepProps } from './WizardShared';
import { toInput } from './wizardForm';

const MAX_AMENITIES = 100;

function byCategory(catalog: AmenityResponse[]): Array<[string, AmenityResponse[]]> {
  const groups = new Map<string, AmenityResponse[]>();
  for (const amenity of catalog) {
    const key = amenity.category ?? 'Other';
    groups.set(key, [...(groups.get(key) ?? []), amenity]);
  }
  return [...groups.entries()];
}

function samePlaces(property: Property, values: NearbyPlacesFormValues): boolean {
  const saved = property.nearbyPlaces.map((p) => [p.placeName, p.placeType, Number(p.distanceKm)]);
  const next = values.places.map((p) => [p.placeName.trim(), p.placeType, Number(p.distanceKm)]);
  return JSON.stringify(saved) === JSON.stringify(next);
}

export function AmenitiesStep({ property, onSaved, onBack }: StepProps) {
  const catalog = useAmenityCatalog();
  const syncAmenities = useSyncAmenities();
  const syncPlaces = useSyncNearbyPlaces();
  const [selected, setSelected] = useState<Set<EntityId>>(
    () => new Set(property.amenities.map((a) => a.id)),
  );
  const [formError, setFormError] = useState<unknown>(null);
  const { control, handleSubmit } = useForm<NearbyPlacesFormValues>({
    resolver: zodResolver(nearbyPlacesSchema),
    defaultValues: {
      places: property.nearbyPlaces.map((p) => ({
        placeName: p.placeName,
        placeType: p.placeType,
        distanceKm: toInput(p.distanceKm),
      })),
    },
    mode: 'onTouched',
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'places' });
  const groups = useMemo(() => byCategory(catalog.data ?? []), [catalog.data]);
  const saving = syncAmenities.isPending || syncPlaces.isPending;

  const toggle = (id: EntityId) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSubmit = async (values: NearbyPlacesFormValues) => {
    setFormError(null);
    let latest = property;
    try {
      const savedIds = new Set(property.amenities.map((a) => a.id));
      const amenitiesChanged =
        savedIds.size !== selected.size || [...selected].some((id) => !savedIds.has(id));
      if (amenitiesChanged) {
        latest = await syncAmenities.mutateAsync({
          id: latest.id,
          version: latest.version,
          body: [...selected],
        });
      }
      if (!samePlaces(property, values)) {
        latest = await syncPlaces.mutateAsync({
          id: latest.id,
          version: latest.version,
          body: values.places.map((p) => ({
            placeName: p.placeName.trim(),
            placeType: p.placeType,
            distanceKm: Number(p.distanceKm),
          })),
        });
      }
      onSaved(latest);
    } catch (error) {
      setFormError(error);
    }
  };

  return (
    <StepCard
      title="Amenities and nearby places"
      description="Select at least one amenity. Nearby places are optional; distances are shown as entered, unverified."
    >
      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
        <StepError error={formError} propertyId={property.id} />
        <Typography variant="subtitle1" component="h3" fontWeight={600}>
          Amenities ({selected.size} selected)
        </Typography>
        {catalog.isPending && <Skeleton variant="rounded" height={160} className="mt-3" />}
        {catalog.error && (
          <Alert
            severity="error"
            className="mt-3"
            action={
              <Button
                size="small"
                variant="text"
                color="inherit"
                onClick={() => void catalog.refetch()}
              >
                Retry
              </Button>
            }
          >
            Could not load the amenity list. {catalog.error.message}
          </Alert>
        )}
        <div className="mt-2 flex flex-col gap-4">
          {groups.map(([category, amenities]) => (
            <fieldset key={category} className="rounded-xl border p-3">
              <legend className="px-1 text-sm font-semibold capitalize">{category}</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {amenities.map((amenity) => (
                  <FormControlLabel
                    key={amenity.id}
                    label={amenity.name}
                    control={
                      <Checkbox
                        checked={selected.has(amenity.id)}
                        onChange={() => toggle(amenity.id)}
                        disabled={!selected.has(amenity.id) && selected.size >= MAX_AMENITIES}
                      />
                    }
                  />
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        {/* Linked amenities that were retired from the catalog stay until unselected. */}
        {property.amenities.some((a) => !(catalog.data ?? []).some((c) => c.id === a.id)) &&
          catalog.data && (
            <Alert severity="info" className="mt-3">
              Some linked amenities are no longer in the catalog. Saving keeps only the amenities
              selected above.
            </Alert>
          )}

        <Typography variant="subtitle1" component="h3" fontWeight={600} className="mt-6">
          Nearby places ({fields.length})
        </Typography>
        <div className="mt-2 flex flex-col gap-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]"
            >
              <FormTextField
                control={control}
                name={`places.${index}.placeName`}
                label="Place"
                size="small"
                required
                slotProps={{ htmlInput: { maxLength: 150 } }}
              />
              <FormTextField
                control={control}
                name={`places.${index}.placeType`}
                label="Type"
                select
                size="small"
              >
                {NEARBY_PLACE_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {NEARBY_PLACE_LABELS[type]}
                  </MenuItem>
                ))}
              </FormTextField>
              <FormTextField
                control={control}
                name={`places.${index}.distanceKm`}
                label="Distance (km)"
                size="small"
                required
                slotProps={{ htmlInput: { inputMode: 'decimal' } }}
              />
              <IconButton
                aria-label={`Remove place ${index + 1}`}
                color="error"
                onClick={() => remove(index)}
              >
                <DeleteOutline fontSize="small" />
              </IconButton>
            </div>
          ))}
          <div>
            <Button
              variant="outlined"
              startIcon={<Add />}
              disabled={fields.length >= MAX_NEARBY_PLACES}
              onClick={() => append({ placeName: '', placeType: 'metro_station', distanceKm: '' })}
            >
              Add nearby place
            </Button>
          </div>
        </div>
        <StepActions onBack={onBack} saving={saving} />
      </form>
    </StepCard>
  );
}
