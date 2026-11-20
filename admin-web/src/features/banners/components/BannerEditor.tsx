import ArrowBack from '@mui/icons-material/ArrowBack';
import WebOutlined from '@mui/icons-material/WebOutlined';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { type ReactNode, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/Modal';
import { toApiError } from '@/services/api/apiError';
import { notify } from '@/store/notificationStore';
import { ROUTES, UPLOAD_LIMITS } from '@/utils/constants';
import { formatBytes } from '@/utils/formatters';
import { applyServerErrors } from '@/utils/helpers';

import { useBannerImagePicker, type PickedImage } from '../hooks/useBannerImagePicker';
import { useBannerPermissions } from '../hooks/useBannerPermissions';
import {
  useContentPages,
  useCreateBanner,
  useReplaceBannerImage,
  useUpdateBanner,
} from '../hooks/useBanners';
import { useUnsavedChangesPrompt } from '../hooks/useUnsavedChangesPrompt';
import { bannerFormSchema, type BannerFormValues, CUSTOM_PATH } from '../schemas/bannerSchema';
import type { Banner } from '../types/banner.types';
import { linkLabel } from '../utils/bannerDisplay';
import {
  BANNER_FORM_FIELDS,
  emptyBannerForm,
  formLink,
  toBannerFormValues,
  toCreateRequest,
  toUpdateRequest,
} from '../utils/bannerForm';
import { RECOMMENDED_BANNER_SIZE } from '../utils/bannerImage';
import {
  BANNER_PLACEMENT_OPTIONS,
  BANNER_TYPE_OPTIONS,
  bannerPlacementLabel,
  bannerTypeLabel,
  withSavedOption,
} from '../utils/bannerOptions';

import { BannerImageUpload } from './BannerImageUpload';
import { BannerInfoFields, BannerStatusField } from './BannerInfoFields';
import { BannerLinkFields } from './BannerLinkFields';
import { BannerLivePreview } from './BannerLivePreview';
import { BannerScheduleFields } from './BannerScheduleFields';
import { BannerSidePanels } from './BannerSidePanels';
import { FormSection } from './FormSection';

/** What the editor does: create from scratch, copy an existing banner, or edit one. */
export type BannerEditorMode =
  | { kind: 'create' }
  | { kind: 'duplicate'; source: Banner; image: PickedImage | null }
  | { kind: 'edit'; banner: Banner };

interface BannerEditorProps {
  mode: BannerEditorMode;
  /** Page heading with breadcrumb, rendered next to the back button. */
  heading: ReactNode;
  /** Shown above the form, e.g. why a copied image is missing. */
  notice?: ReactNode;
}

const MAX_IMAGE_LABEL = formatBytes(UPLOAD_LIMITS.maxImageBytes);
const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const FORM_ID = 'banner-form';

function defaultValues(mode: BannerEditorMode, canChangeStatus: boolean): BannerFormValues {
  switch (mode.kind) {
    case 'create':
      return { ...emptyBannerForm(), status: canChangeStatus ? 'active' : 'inactive' };
    case 'duplicate':
      return {
        ...toBannerFormValues(mode.source),
        title: `Copy of ${mode.source.title}`.slice(0, 255),
        // A copy starts switched off, so it is reviewed before it goes live.
        status: 'inactive',
        image: mode.image?.file ?? null,
      };
    case 'edit':
      return toBannerFormValues(mode.banner);
  }
}

/**
 * The banner form used for add, duplicate and edit: fields on the left, live preview, guidelines
 * and tips on the right. Create sends one multipart request; edit sends the changed fields
 * (`PATCH`) and, if a new image was picked, replaces the image.
 */
export function BannerEditor({ mode, heading, notice }: BannerEditorProps) {
  const navigate = useNavigate();
  const permissions = useBannerPermissions();
  const { canChangeStatus, canPickContentPages } = permissions;
  const isEdit = mode.kind === 'edit';
  const saved = isEdit ? mode.banner : undefined;

  const createBanner = useCreateBanner({
    successMessage: mode.kind === 'duplicate' ? 'Banner duplicated.' : 'Banner created.',
  });
  const updateBanner = useUpdateBanner();
  const replaceImage = useReplaceBannerImage();
  const contentPages = useContentPages({ enabled: canPickContentPages });
  const image = useBannerImagePicker(mode.kind === 'duplicate' ? mode.image : null);
  const [progress, setProgress] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const isSaving = createBanner.isPending || updateBanner.isPending || replaceImage.isPending;

  const form = useForm<BannerFormValues>({
    resolver: zodResolver(bannerFormSchema({ requireImage: !isEdit, rejectPastEnd: !isEdit })),
    defaultValues: defaultValues(mode, canChangeStatus),
    mode: 'onTouched',
  });
  const { control, handleSubmit, setError, setValue, clearErrors, formState } = form;
  const [title, placement, linkType, internalTarget, internalPath, externalUrl] = useWatch({
    control,
    name: ['title', 'placement', 'linkType', 'internalTarget', 'internalPath', 'externalUrl'],
  });
  // A copy is unsaved work from the start; after a save, `allowNavigation` lets the redirect through.
  const { blocker, allowNavigation } = useUnsavedChangesPrompt(
    formState.isDirty || mode.kind === 'duplicate',
  );

  const leave = () => void navigate(ROUTES.banners);

  const handleSelectImage = async (file: File) => {
    clearErrors('image');
    const error = await image.select(file);
    if (error) {
      setError('image', { type: 'validate', message: error });
      return;
    }
    setValue('image', file, { shouldDirty: true, shouldValidate: true });
  };
  const handleRemoveImage = () => {
    image.remove();
    setValue('image', null, { shouldDirty: true, shouldValidate: formState.isSubmitted });
  };

  /** The backend reports link problems on `link`/`linkType`; they belong to whichever input is shown. */
  const applyLinkErrors = (fieldErrors: Record<string, string>, current: BannerFormValues) => {
    const message = fieldErrors.link ?? fieldErrors.linkType;
    if (!message) return false;
    const target =
      current.linkType === 'external'
        ? 'externalUrl'
        : current.internalTarget === CUSTOM_PATH
          ? 'internalPath'
          : 'internalTarget';
    setError(target, { type: 'server', message });
    return true;
  };

  const onSubmit = handleSubmit(async (current) => {
    if (isSaving) return;
    setFormError(null);
    const onProgress = (percent: number) => setProgress(percent);
    try {
      if (!saved) {
        const file = current.image;
        if (!file) return;
        await createBanner.mutateAsync({
          request: toCreateRequest(current, { canChangeStatus }),
          image: file,
          onProgress,
        });
      } else {
        const request = toUpdateRequest(saved, current, { canChangeStatus });
        const hasFieldChanges = Object.keys(request).length > 0;
        if (hasFieldChanges) await updateBanner.mutateAsync({ id: saved.id, request });
        if (current.image) {
          try {
            await replaceImage.mutateAsync({ id: saved.id, image: current.image, onProgress });
          } catch (error) {
            if (hasFieldChanges) {
              // The details are saved; only the image failed. Keep the user here to retry it.
              setFormError(
                `The details were saved, but the image could not be replaced: ${toApiError(error).message}`,
              );
              return;
            }
            throw error;
          }
        }
        notify(
          hasFieldChanges || current.image ? 'Banner updated.' : 'No changes to save.',
          hasFieldChanges || current.image ? 'success' : 'info',
        );
      }
      allowNavigation();
      leave();
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.status === 413 || apiError.fieldErrors.image) {
        setError('image', {
          type: 'server',
          message: apiError.fieldErrors.image ?? `The image is larger than ${MAX_IMAGE_LABEL}.`,
        });
        return;
      }
      const linkHandled = applyLinkErrors(apiError.fieldErrors, current);
      const message = applyServerErrors(error, setError, BANNER_FORM_FIELDS);
      const onlyLink = Object.keys(apiError.fieldErrors).every((field) =>
        ['link', 'linkType'].includes(field),
      );
      setFormError(linkHandled && onlyLink ? null : message);
    } finally {
      setProgress(null);
    }
  });

  const typeOptions = withSavedOption(BANNER_TYPE_OPTIONS, saved?.type, bannerTypeLabel);
  const placementOptions = withSavedOption(
    BANNER_PLACEMENT_OPTIONS,
    saved?.placement,
    bannerPlacementLabel,
  );
  const previewSrc = image.picked?.url ?? saved?.imageUrl ?? null;
  const previewLink = linkLabel(formLink({ linkType, internalTarget, internalPath, externalUrl }));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Tooltip title="Back to banners">
            <IconButton
              aria-label="Back to banners"
              onClick={leave}
              className="mt-1 rounded-lg border"
            >
              <ArrowBack />
            </IconButton>
          </Tooltip>
          <div>{heading}</div>
        </div>
        <div className="flex gap-2 self-end sm:self-auto">
          <Button variant="outlined" size="large" onClick={leave} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} size="large" loading={isSaving}>
            {isEdit ? 'Save changes' : 'Save banner'}
          </Button>
        </div>
      </header>

      {notice}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <FormProvider {...form}>
          <form
            id={FORM_ID}
            onSubmit={(event) => void onSubmit(event)}
            noValidate
            aria-label="Banner information"
          >
            <FormSection title="Banner information" icon={<WebOutlined fontSize="small" />}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <BannerInfoFields
                typeOptions={typeOptions}
                placementOptions={placementOptions}
                disabled={isSaving}
              />
              <BannerLinkFields
                contentPages={contentPages.data}
                contentPagesNote={
                  !canPickContentPages
                    ? 'Content pages are not listed (no permission to view pages); use a custom path such as /pages/about-us.'
                    : contentPages.error
                      ? 'Content pages could not be loaded; use a custom path such as /pages/about-us.'
                      : undefined
                }
                disabled={isSaving}
              />
              <BannerImageUpload
                label="Banner image"
                required={!isEdit}
                previewSrc={previewSrc}
                fileInfo={image.picked?.file}
                dimensions={image.picked?.dimensions}
                recommended={RECOMMENDED_BANNER_SIZE}
                maxSizeLabel={MAX_IMAGE_LABEL}
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                onSelect={(file) => void handleSelectImage(file)}
                // An edit keeps its saved image, so only a newly picked one can be removed.
                onRemove={image.picked ? handleRemoveImage : undefined}
                error={formState.errors.image?.message}
                progress={progress}
                disabled={isSaving}
              />
              <BannerStatusField
                canChangeStatus={canChangeStatus}
                lockedNote={
                  isEdit
                    ? 'You do not have permission to change the status.'
                    : 'New banners you create are saved as inactive; an administrator activates them.'
                }
                disabled={isSaving}
              />
              <Divider />
              <BannerScheduleFields timeZone={TIME_ZONE} disabled={isSaving} />
            </FormSection>
          </form>
        </FormProvider>

        <BannerSidePanels
          maxSizeLabel={MAX_IMAGE_LABEL}
          preview={
            <BannerLivePreview
              title={title}
              imageSrc={previewSrc}
              placementLabel={placement ? bannerPlacementLabel(placement) : undefined}
              linkLabel={previewLink}
            />
          }
        />
      </div>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Discard changes?"
        description="You have unsaved changes to this banner. Leave without saving?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
    </div>
  );
}
