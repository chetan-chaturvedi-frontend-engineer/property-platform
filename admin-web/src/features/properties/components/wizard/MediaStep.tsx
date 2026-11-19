import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import LinkOutlined from '@mui/icons-material/LinkOutlined';
import StarOutline from '@mui/icons-material/StarOutline';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/common/Button';
import { FormTextField } from '@/components/common/Input';
import { ConfirmDialog } from '@/components/common/Modal';
import { formatBytes } from '@/utils/formatters';
import { applyServerErrors } from '@/utils/helpers';
import { type UploadKind, validateUploadFile } from '@/utils/fileValidation';

import {
  useAddExternalVideo,
  useDeleteMedia,
  useSetCover,
  useUpdateMediaSettings,
  useUploadMedia,
} from '../../hooks/useProperties';
import {
  type ExternalVideoFormValues,
  externalVideoSchema,
  TOUR_HOSTS,
  type TourFormValues,
  tourSchema,
} from '../../schemas/propertySchemas';
import type { MediaResponse, ProjectMediaType } from '../../types/property.types';
import { PropertyThumbnail } from '../PropertyThumbnail';

import { StepActions, StepCard, StepError, type StepProps } from './WizardShared';
import { textOrNull } from './wizardForm';

/** Backend limits per property (`PropertyMediaService`). */
const LIMITS: Record<ProjectMediaType, number> = { photo: 50, video: 10, brochure: 1 };
const KINDS: Record<ProjectMediaType, UploadKind> = {
  photo: 'image',
  video: 'video',
  brochure: 'pdf',
};
const ACCEPT: Record<ProjectMediaType, string> = {
  photo: 'image/jpeg,image/png,image/webp',
  video: 'video/mp4',
  brochure: 'application/pdf',
};
const TYPE_LABELS: Record<ProjectMediaType, string> = {
  photo: 'Photo (JPEG, PNG, WebP, up to 10 MB)',
  video: 'Video (MP4, up to 50 MB)',
  brochure: 'Brochure (PDF, up to 20 MB)',
};

function MediaItem({
  media,
  onCover,
  onDelete,
  busy,
}: {
  media: MediaResponse;
  onCover?: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const name = media.title ?? media.originalFilename ?? (media.external ? media.url : 'File');
  return (
    <li className="flex items-center gap-3 rounded-lg border p-2">
      {media.mediaType === 'photo' ? (
        <PropertyThumbnail url={media.url} alt={name} className="h-14 w-20 shrink-0" />
      ) : (
        <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg bg-[var(--mui-palette-action-hover)]">
          {media.external ? <LinkOutlined aria-hidden /> : <DescriptionOutlined aria-hidden />}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <Typography variant="body2" fontWeight={600} noWrap title={name}>
          {name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {media.mediaType}
          {media.fileSize ? ` · ${formatBytes(media.fileSize)}` : ''}
          {media.primary ? ' · Cover photo' : ''}
        </Typography>
      </div>
      {onCover && (
        <Tooltip title="Make cover photo">
          <IconButton
            size="small"
            aria-label={`Make ${name} the cover photo`}
            onClick={onCover}
            disabled={busy}
          >
            <StarOutline fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title="Remove">
        <IconButton
          size="small"
          color="error"
          aria-label={`Remove ${name}`}
          onClick={onDelete}
          disabled={busy}
        >
          <DeleteOutline fontSize="small" />
        </IconButton>
      </Tooltip>
    </li>
  );
}

export function MediaStep({ property, onSaved, onBack }: StepProps) {
  const upload = useUploadMedia();
  const addVideo = useAddExternalVideo();
  const setCover = useSetCover();
  const deleteMedia = useDeleteMedia();
  const updateSettings = useUpdateMediaSettings();
  const fileInput = useRef<HTMLInputElement>(null);
  const [mediaType, setMediaType] = useState<ProjectMediaType>('photo');
  const [title, setTitle] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const [removing, setRemoving] = useState<MediaResponse | null>(null);
  const busy =
    upload.isPending || setCover.isPending || deleteMedia.isPending || addVideo.isPending;

  const counts = {
    photo: property.media.filter((m) => m.mediaType === 'photo').length,
    video: property.media.filter((m) => m.mediaType === 'video').length,
    brochure: property.media.filter((m) => m.mediaType === 'brochure').length,
  };
  const atLimit = counts[mediaType] >= LIMITS[mediaType];

  const tourForm = useForm<TourFormValues>({
    resolver: zodResolver(tourSchema),
    defaultValues: { threeDTourUrl: property.threeDTourUrl ?? '' },
    mode: 'onTouched',
  });
  const videoForm = useForm<ExternalVideoFormValues>({
    resolver: zodResolver(externalVideoSchema),
    defaultValues: { url: '', title: '' },
    mode: 'onTouched',
  });
  const write = { id: property.id, version: property.version };

  const onFile = async (file: File | undefined) => {
    setFileError(null);
    setActionError(null);
    if (!file) return;
    const result = await validateUploadFile(file, [KINDS[mediaType]]);
    if (!result.valid) {
      setFileError(result.error);
      return;
    }
    upload.mutate(
      { ...write, body: { file, mediaType, title: title.trim() || undefined } },
      { onSuccess: () => setTitle(''), onError: setActionError },
    );
  };

  const onAddVideo = (values: ExternalVideoFormValues) => {
    setActionError(null);
    addVideo.mutate(
      { ...write, body: { url: values.url.trim(), title: values.title.trim() || undefined } },
      {
        onSuccess: () => videoForm.reset(),
        onError: (error) => {
          if (applyServerErrors(error, videoForm.setError, ['url', 'title']) !== null) {
            setActionError(error);
          }
        },
      },
    );
  };

  const onContinue = (values: TourFormValues) => {
    setActionError(null);
    const next = textOrNull(values.threeDTourUrl);
    if (next === (property.threeDTourUrl ?? null)) {
      onSaved(property);
      return;
    }
    updateSettings.mutate(
      { ...write, body: { threeDTourUrl: next } },
      {
        onSuccess: onSaved,
        onError: (error) => {
          if (applyServerErrors(error, tourForm.setError, ['threeDTourUrl']) !== null) {
            setActionError(error);
          }
        },
      },
    );
  };

  return (
    <StepCard
      title="Media"
      description="At least one photo is required. The first photo becomes the cover unless you choose another."
    >
      <StepError error={actionError} propertyId={property.id} />

      <section aria-labelledby="upload-heading" className="rounded-xl border border-dashed p-4">
        <Typography id="upload-heading" variant="subtitle1" component="h3" fontWeight={600}>
          Upload a file
        </Typography>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,16rem)_1fr_auto]">
          <TextField
            select
            size="small"
            label="File type"
            value={mediaType}
            onChange={(event) => {
              setMediaType(event.target.value as ProjectMediaType);
              setFileError(null);
            }}
          >
            {(Object.keys(TYPE_LABELS) as ProjectMediaType[]).map((type) => (
              <MenuItem key={type} value={type}>
                {TYPE_LABELS[type]} — {counts[type]}/{LIMITS[type]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Title (optional)"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 150 } }}
          />
          <Button
            startIcon={<CloudUploadOutlined />}
            onClick={() => fileInput.current?.click()}
            loading={upload.isPending}
            disabled={atLimit || busy}
          >
            Choose file
          </Button>
          <input
            ref={fileInput}
            type="file"
            hidden
            accept={ACCEPT[mediaType]}
            aria-label="File to upload"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              void onFile(file);
            }}
          />
        </div>
        {atLimit && (
          <Typography variant="caption" color="warning.main" component="p" className="mt-2">
            The limit for this file type is reached. Remove one to upload another.
          </Typography>
        )}
        {fileError && (
          <Alert severity="error" className="mt-3">
            {fileError}
          </Alert>
        )}
      </section>

      <section aria-labelledby="media-heading" className="mt-5">
        <Typography id="media-heading" variant="subtitle1" component="h3" fontWeight={600}>
          Uploaded media ({property.media.length})
        </Typography>
        {property.media.length === 0 ? (
          <Alert severity="info" className="mt-2">
            No media yet. Upload at least one photo to complete this step.
          </Alert>
        ) : (
          <ul className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2">
            {property.media.map((media) => (
              <MediaItem
                key={media.id}
                media={media}
                busy={busy}
                onCover={
                  media.mediaType === 'photo' && !media.primary
                    ? () =>
                        setCover.mutate({ ...write, body: media.id }, { onError: setActionError })
                    : undefined
                }
                onDelete={() => setRemoving(media)}
              />
            ))}
          </ul>
        )}
      </section>

      <form
        className="mt-5 grid grid-cols-1 items-start gap-3 md:grid-cols-[2fr_1fr_auto]"
        onSubmit={(event) => void videoForm.handleSubmit(onAddVideo)(event)}
        noValidate
        aria-label="Link an external video"
      >
        <FormTextField
          control={videoForm.control}
          name="url"
          label="YouTube or Vimeo link"
          size="small"
          slotProps={{ htmlInput: { maxLength: 2048 } }}
        />
        <FormTextField
          control={videoForm.control}
          name="title"
          label="Title (optional)"
          size="small"
          slotProps={{ htmlInput: { maxLength: 150 } }}
        />
        <Button
          type="submit"
          variant="outlined"
          loading={addVideo.isPending}
          disabled={counts.video >= LIMITS.video}
        >
          Link video
        </Button>
      </form>

      <form
        onSubmit={(event) => void tourForm.handleSubmit(onContinue)(event)}
        noValidate
        className="mt-5"
      >
        <FormTextField
          control={tourForm.control}
          name="threeDTourUrl"
          label="3D tour link"
          fullWidth
          helperText={`Optional. https link on ${TOUR_HOSTS.join(', ')}`}
          slotProps={{ htmlInput: { maxLength: 2048 } }}
        />
        <StepActions onBack={onBack} saving={updateSettings.isPending} submitLabel="Continue" />
      </form>

      <ConfirmDialog
        open={removing !== null}
        title="Remove this file?"
        description={`“${removing?.title ?? removing?.originalFilename ?? 'This file'}” will be deleted from the property.`}
        confirmLabel="Remove"
        destructive
        loading={deleteMedia.isPending}
        onConfirm={() =>
          removing &&
          deleteMedia.mutate(
            { ...write, body: removing.id },
            {
              onSuccess: () => setRemoving(null),
              onError: (error) => {
                setRemoving(null);
                setActionError(error);
              },
            },
          )
        }
        onCancel={() => setRemoving(null)}
      />
    </StepCard>
  );
}
