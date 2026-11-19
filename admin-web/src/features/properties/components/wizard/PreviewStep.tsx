import CheckCircle from '@mui/icons-material/CheckCircle';
import EditOutlined from '@mui/icons-material/EditOutlined';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { Button } from '@/components/common/Button';
import { ErrorState } from '@/components/common/Feedback/ErrorState';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { PERMISSIONS } from '@/utils/constants';

import { usePropertyPreview, useSubmitProperty } from '../../hooks/useProperties';
import type { Property } from '../../types/property.types';
import {
  APARTMENT_TYPE_LABELS,
  coverOf,
  fieldLabel,
  formatDate,
  formatPlace,
  formatPrice,
  PROJECT_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  priceRange,
  PUBLICATION_STATUS_META,
} from '../../utils/propertyDisplay';
import { PropertyThumbnail } from '../PropertyThumbnail';

import { StepCard, StepError } from './WizardShared';

interface PreviewStepProps {
  property: Property;
  onEditStep: (step: number) => void;
  onSubmitted: (property: Property) => void;
  onBack: () => void;
}

const SUBMITTABLE = new Set(['draft', 'rejected']);

function Block({
  step,
  title,
  property,
  onEdit,
  children,
}: {
  step: number;
  title: string;
  property: Property;
  onEdit: (step: number) => void;
  children: ReactNode;
}) {
  const progress = property.wizard.steps.find((s) => s.step === step);
  return (
    <section className="rounded-xl border p-4" aria-labelledby={`preview-step-${step}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {progress?.complete ? (
            <CheckCircle fontSize="small" color="success" aria-label="Complete" />
          ) : (
            <ErrorOutline fontSize="small" color="warning" aria-label="Incomplete" />
          )}
          <Typography
            id={`preview-step-${step}`}
            variant="subtitle1"
            component="h3"
            fontWeight={600}
          >
            {step}. {title}
          </Typography>
        </div>
        <Button
          size="small"
          variant="text"
          startIcon={<EditOutlined />}
          onClick={() => onEdit(step)}
        >
          Edit
        </Button>
      </div>
      {progress && !progress.complete && progress.missing.length > 0 && (
        <Typography variant="caption" color="warning.main" component="p" className="mt-1">
          Missing: {progress.missing.map(fieldLabel).join(', ')}
        </Typography>
      )}
      <div className="mt-3 text-sm">{children}</div>
    </section>
  );
}

function Pairs({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3">
          <dt className="text-muted">{label}</dt>
          <dd className="text-right font-medium break-words">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PreviewStep({ property, onEditStep, onSubmitted, onBack }: PreviewStepProps) {
  const { can } = usePermissions();
  const preview = usePropertyPreview(property.id);
  const submit = useSubmitProperty();

  if (preview.isPending) {
    return <Skeleton variant="rounded" height={480} />;
  }
  if (preview.error || !preview.data) {
    return (
      <ErrorState
        message={preview.error?.message ?? 'Could not load the preview.'}
        onRetry={() => void preview.refetch()}
      />
    );
  }

  const p = preview.data;
  const status = p.publicationStatus;
  const canSubmit = can(PERMISSIONS.propertyUpdateAny) && SUBMITTABLE.has(status);
  const cover = coverOf(p);

  return (
    <StepCard
      title="Preview and submit"
      description="Check everything before sending the property for review. Use Edit to fix a step."
    >
      <StepError error={submit.error} propertyId={p.id} />
      <div className="mb-4 flex flex-col gap-4 sm:flex-row">
        <PropertyThumbnail
          url={cover?.url}
          alt={p.details.projectName}
          className="aspect-[4/3] w-full sm:w-56"
        />
        <div>
          <Typography variant="h5" component="p">
            {p.details.projectName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {PROPERTY_TYPE_LABELS[p.details.propertyType]} ·{' '}
            {formatPlace([p.location.locality, p.location.city])}
          </Typography>
          <Typography variant="h6" component="p" className="mt-2">
            {priceRange(p)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Status: {PUBLICATION_STATUS_META[status].label}
          </Typography>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Block step={1} title="Property details" property={p} onEdit={onEditStep}>
          <Pairs
            rows={[
              ['Builder', p.details.builderCompanyName],
              ['RERA', p.details.reraNumber],
              ['GST', p.details.gstNumber],
              ['Email', p.details.projectEmail],
              ['Phone', p.details.projectPhone],
            ]}
          />
        </Block>
        <Block step={2} title="Location" property={p} onEdit={onEditStep}>
          <Pairs
            rows={[
              ['Address', p.location.projectAddress],
              ['City', formatPlace([p.location.locality, p.location.city])],
              ['State', p.location.state],
              ['PIN code', p.location.pincode],
            ]}
          />
        </Block>
        <Block step={3} title="Unit types" property={p} onEdit={onEditStep}>
          {p.apartments.length === 0 ? (
            '—'
          ) : (
            <ul className="flex flex-col gap-1">
              {p.apartments.map((a) => (
                <li key={a.id} className="flex justify-between gap-3">
                  <span>
                    {a.apartmentName} ({APARTMENT_TYPE_LABELS[a.apartmentType]})
                  </span>
                  <span className="font-medium">{formatPrice(a.startingPrice, a.currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </Block>
        <Block step={4} title="Project information" property={p} onEdit={onEditStep}>
          <Pairs
            rows={[
              ['Construction', PROJECT_STATUS_LABELS[p.projectInfo.projectStatus]],
              ['Total units', p.projectInfo.totalUnitsFlats],
              ['Possession', formatDate(p.projectInfo.possessionEndDate)],
              ['Description', p.projectInfo.projectDescription ? 'Added' : null],
            ]}
          />
        </Block>
        <Block step={5} title="Amenities" property={p} onEdit={onEditStep}>
          {p.amenities.length ? p.amenities.map((a) => a.name).join(', ') : '—'}
          {p.nearbyPlaces.length > 0 && (
            <Typography variant="caption" color="text.secondary" component="p" className="mt-1">
              {p.nearbyPlaces.length} nearby places
            </Typography>
          )}
        </Block>
        <Block step={6} title="Media" property={p} onEdit={onEditStep}>
          {p.media.filter((m) => m.mediaType === 'photo').length} photos,{' '}
          {p.media.filter((m) => m.mediaType === 'video').length} videos,{' '}
          {p.media.filter((m) => m.mediaType === 'brochure').length} brochure
          {p.threeDTourUrl ? ', 3D tour linked' : ''}
        </Block>
      </div>

      {!p.wizard.readyToSubmit && (
        <Alert severity="warning" className="mt-4">
          Complete the steps marked above before submitting.
        </Alert>
      )}
      {!SUBMITTABLE.has(status) && (
        <Alert severity="info" className="mt-4">
          This property is {PUBLICATION_STATUS_META[status].label.toLowerCase()}, so it cannot be
          submitted again. Your changes are saved.
        </Alert>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-between">
        <Button variant="text" onClick={onBack} disabled={submit.isPending}>
          Back
        </Button>
        {canSubmit && (
          <Button
            loading={submit.isPending}
            disabled={!p.wizard.readyToSubmit || preview.isFetching}
            onClick={() =>
              // The cached detail holds the version of the latest save in this wizard.
              submit.mutate({ id: p.id, version: property.version }, { onSuccess: onSubmitted })
            }
          >
            Submit for review
          </Button>
        )}
      </div>
    </StepCard>
  );
}
