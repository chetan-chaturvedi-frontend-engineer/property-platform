import { zodResolver } from '@hookform/resolvers/zod';
import MenuItem from '@mui/material/MenuItem';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { FormTextField } from '@/components/common/Input';
import { applyServerErrors } from '@/utils/helpers';

import { useUpdateProjectInfo } from '../../hooks/useProperties';
import {
  DESCRIPTION_MAX_LENGTH,
  MAX_HIGHLIGHTS,
  type ProjectInfoFormValues,
  projectInfoSchema,
  splitLines,
} from '../../schemas/propertySchemas';
import { LAND_AREA_UNITS, PROJECT_STATUSES } from '../../types/property.types';
import { AREA_UNIT_LABELS, PROJECT_STATUS_LABELS } from '../../utils/propertyDisplay';

import { StepActions, StepCard, StepError, type StepProps } from './WizardShared';
import { changedFields, numberOrNull, textOrNull, toInput } from './wizardForm';

const FIELDS = [
  'projectStatus',
  'totalTowersBlocks',
  'totalUnitsFlats',
  'landArea',
  'landAreaUnit',
  'possessionStartDate',
  'possessionEndDate',
  'projectDescription',
  'projectHighlights',
] as const;

/** The legal approval status is not part of this step: only legal reviewers change it. */
export function ProjectInfoStep({ property, onSaved, onBack }: StepProps) {
  const update = useUpdateProjectInfo();
  const [formError, setFormError] = useState<unknown>(null);
  const info = property.projectInfo;
  const { control, handleSubmit, setError } = useForm<ProjectInfoFormValues>({
    resolver: zodResolver(projectInfoSchema),
    defaultValues: {
      projectStatus: info.projectStatus,
      totalTowersBlocks: toInput(info.totalTowersBlocks),
      totalUnitsFlats: toInput(info.totalUnitsFlats),
      landArea: toInput(info.landArea),
      landAreaUnit: info.landAreaUnit ?? '',
      possessionStartDate: toInput(info.possessionStartDate),
      possessionEndDate: toInput(info.possessionEndDate),
      projectDescription: toInput(info.projectDescription),
      projectHighlights: info.projectHighlights.join('\n'),
    },
    mode: 'onTouched',
  });
  const description = useWatch({ control, name: 'projectDescription' });

  const onSubmit = (values: ProjectInfoFormValues) => {
    setFormError(null);
    const body = changedFields(info, {
      projectStatus: values.projectStatus,
      totalTowersBlocks: numberOrNull(values.totalTowersBlocks),
      totalUnitsFlats: numberOrNull(values.totalUnitsFlats),
      landArea: numberOrNull(values.landArea),
      landAreaUnit: values.landAreaUnit === '' ? null : values.landAreaUnit,
      possessionStartDate: values.possessionStartDate || null,
      possessionEndDate: values.possessionEndDate || null,
      projectDescription: textOrNull(values.projectDescription),
      projectHighlights: splitLines(values.projectHighlights),
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
      title="Project information"
      description="Construction stage, size and the description buyers see. A description is required to submit."
    >
      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
        <StepError error={formError} propertyId={property.id} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FormTextField
            control={control}
            name="projectStatus"
            label="Construction status"
            select
            required
          >
            {PROJECT_STATUSES.map((status) => (
              <MenuItem key={status} value={status}>
                {PROJECT_STATUS_LABELS[status]}
              </MenuItem>
            ))}
          </FormTextField>
          <FormTextField
            control={control}
            name="totalTowersBlocks"
            label="Towers / blocks"
            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
          />
          <FormTextField
            control={control}
            name="totalUnitsFlats"
            label="Total units"
            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
          />
          <FormTextField
            control={control}
            name="landArea"
            label="Land area"
            slotProps={{ htmlInput: { inputMode: 'decimal' } }}
          />
          <FormTextField control={control} name="landAreaUnit" label="Land area unit" select>
            <MenuItem value="">None</MenuItem>
            {LAND_AREA_UNITS.map((unit) => (
              <MenuItem key={unit} value={unit}>
                {AREA_UNIT_LABELS[unit]}
              </MenuItem>
            ))}
          </FormTextField>
          <span className="hidden lg:block" />
          <FormTextField
            control={control}
            name="possessionStartDate"
            label="Possession from"
            type="date"
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <FormTextField
            control={control}
            name="possessionEndDate"
            label="Possession until"
            type="date"
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <FormTextField
            control={control}
            name="projectDescription"
            label="Description"
            multiline
            minRows={5}
            className="md:col-span-2 lg:col-span-3"
            helperText={`${description.length} / ${DESCRIPTION_MAX_LENGTH}`}
            slotProps={{ htmlInput: { maxLength: DESCRIPTION_MAX_LENGTH } }}
          />
          <FormTextField
            control={control}
            name="projectHighlights"
            label="Highlights"
            multiline
            minRows={3}
            className="md:col-span-2 lg:col-span-3"
            helperText={`One per line, up to ${MAX_HIGHLIGHTS}`}
          />
        </div>
        <StepActions onBack={onBack} saving={update.isPending} />
      </form>
    </StepCard>
  );
}
