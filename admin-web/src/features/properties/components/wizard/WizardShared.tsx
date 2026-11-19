import ArrowBack from '@mui/icons-material/ArrowBack';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { Button } from '@/components/common/Button';
import { toApiError } from '@/services/api/apiError';
import type { EntityId } from '@/types/common.types';

import { propertyKeys } from '../../hooks/useProperties';
import type { Property } from '../../types/property.types';

export interface StepProps {
  property: Property;
  /** Called with the saved property; the wizard moves on. */
  onSaved: (property: Property) => void;
  onBack?: () => void;
}

export function StepCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Paper className="p-4 sm:p-6">
      <Typography variant="h5" component="h2">
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" className="mt-1 mb-5">
        {description}
      </Typography>
      {children}
    </Paper>
  );
}

export function StepActions({
  onBack,
  saving,
  submitLabel = 'Save and continue',
  extra,
}: {
  onBack?: () => void;
  saving: boolean;
  submitLabel?: string;
  extra?: ReactNode;
}) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      {onBack ? (
        <Button variant="text" startIcon={<ArrowBack />} onClick={onBack} disabled={saving}>
          Back
        </Button>
      ) : (
        <span />
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        {extra}
        <Button type="submit" loading={saving}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

/**
 * Form-level error. A version conflict means someone else saved the property meanwhile: reloading
 * shows their change (the form keeps the admin's input) before saving again.
 */
export function StepError({ error, propertyId }: { error: unknown; propertyId?: EntityId }) {
  const queryClient = useQueryClient();
  if (!error) {
    return null;
  }
  const apiError = toApiError(error);
  const conflict = apiError.code === 'property_version_conflict';
  return (
    <Alert
      severity="error"
      role="alert"
      className="mb-4"
      action={
        conflict && propertyId ? (
          <Button
            size="small"
            variant="text"
            color="inherit"
            onClick={() =>
              void queryClient.invalidateQueries({ queryKey: propertyKeys.detail(propertyId) })
            }
          >
            Reload
          </Button>
        ) : undefined
      }
    >
      {conflict
        ? 'Someone else changed this property while you were editing. Reload to see the latest version, then save again.'
        : apiError.message}
    </Alert>
  );
}
