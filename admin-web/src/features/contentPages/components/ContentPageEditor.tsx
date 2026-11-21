import ArrowBack from '@mui/icons-material/ArrowBack';
import ArticleOutlined from '@mui/icons-material/ArticleOutlined';
import TravelExploreOutlined from '@mui/icons-material/TravelExploreOutlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { type ReactNode, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/common/Button';
import { EditorActions, type SaveIntent } from '@/components/common/EditorActions';
import { FormSection } from '@/components/common/FormSection';
import { ConfirmDialog } from '@/components/common/Modal';
import { useDebounce } from '@/hooks/useDebounce';
import { useUnsavedChangesPrompt } from '@/hooks/useUnsavedChangesPrompt';
import { notify } from '@/store/notificationStore';
import { ROUTES, SEARCH_DEBOUNCE_MS } from '@/utils/constants';
import { SLUG_PATTERN, slugify } from '@/utils/slug';

import { useContentPagePermissions } from '../hooks/useContentPagePermissions';
import {
  useContentPageBySlug,
  useCreateContentPage,
  useUpdateContentPage,
} from '../hooks/useContentPages';
import { contentPageFormSchema, type ContentPageFormValues } from '../schemas/contentPageSchema';
import type { ContentPage, ContentPageStatus } from '../types/contentPage.types';
import {
  applyContentPageServerErrors,
  emptyContentPageForm,
  toContentPageFormValues,
  toCreateContentPageRequest,
  toUpdateContentPageRequest,
} from '../utils/contentPageForm';

import { ContentPagePreviewDialog } from './ContentPagePreviewDialog';
import { ContentPageContentFields } from './form/ContentPageContentFields';
import { ContentPageSeoFields } from './form/ContentPageSeoFields';
import { ContentPageSettingsFields } from './form/ContentPageSettingsFields';

/** Create a page or edit a saved one. */
export type ContentPageEditorMode = { kind: 'create' } | { kind: 'edit'; page: ContentPage };

interface ContentPageEditorProps {
  mode: ContentPageEditorMode;
  /** Page heading with breadcrumb, rendered next to the back button. */
  heading: ReactNode;
}

/**
 * The page form: content on the left; settings and SEO on the right. Create sends one `POST`;
 * edit sends only the changed fields (`PATCH`).
 */
export function ContentPageEditor({ mode, heading }: ContentPageEditorProps) {
  const navigate = useNavigate();
  const { canPublish } = useContentPagePermissions();
  const saved = mode.kind === 'edit' ? mode.page : undefined;
  const createPage = useCreateContentPage();
  const updatePage = useUpdateContentPage();
  const [saving, setSaving] = useState<SaveIntent | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const form = useForm<ContentPageFormValues>({
    resolver: zodResolver(contentPageFormSchema),
    defaultValues: saved ? toContentPageFormValues(saved) : emptyContentPageForm(),
    mode: 'onTouched',
  });
  const { control, handleSubmit, setError, formState, getValues } = form;
  const [title = '', slugEdited = false, slug = ''] = useWatch({
    control,
    name: ['heading', 'slugEdited', 'slug'],
  });
  const { blocker, allowNavigation } = useUnsavedChangesPrompt(formState.isDirty);

  // Slug availability hint: the list search matches slugs, so an exact match means it is taken.
  const slugCandidate = slugEdited ? slug : slugify(title);
  const debouncedSlug = useDebounce(slugCandidate, SEARCH_DEBOUNCE_MS);
  const checkSlug =
    SLUG_PATTERN.test(debouncedSlug) &&
    debouncedSlug !== saved?.slug &&
    debouncedSlug === slugCandidate;
  const slugOwner = useContentPageBySlug(checkSlug ? debouncedSlug : '');
  const conflictHeading =
    checkSlug && slugOwner.data && slugOwner.data.id !== saved?.id ? slugOwner.data.heading : null;

  const leave = () => void navigate(ROUTES.pages);

  /** The status to save: "draft", or the form's choice when the user may change it. */
  const statusFor = (intent: SaveIntent, values: ContentPageFormValues): ContentPageStatus => {
    if (!canPublish) return saved?.status ?? 'draft';
    return intent === 'draft' ? 'draft' : values.status;
  };

  const save = (intent: SaveIntent) => {
    void handleSubmit(
      async (values) => {
        if (saving) return;
        setSaving(intent);
        setFormError(null);
        const status = statusFor(intent, values);
        try {
          if (saved) {
            const request = toUpdateContentPageRequest(saved, values, status);
            if (Object.keys(request).length === 0) {
              notify('No changes to save.', 'info');
            } else {
              await updatePage.mutateAsync({ id: saved.id, request });
              notify('Page updated.', 'success');
            }
          } else {
            const created = await createPage.mutateAsync(
              toCreateContentPageRequest(values, status),
            );
            notify(
              created.status === 'publish' ? 'Page published.' : 'Page saved as draft.',
              'success',
            );
          }
          allowNavigation();
          leave();
        } catch (error) {
          setFormError(applyContentPageServerErrors(error, setError));
        } finally {
          setSaving(null);
        }
      },
      () => setFormError('Check the highlighted fields.'),
    )();
  };

  const busy = saving !== null;
  const preview = previewOpen ? getValues() : null;
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Tooltip title="Back">
            <IconButton aria-label="Back" onClick={leave} className="mt-1 rounded-lg border">
              <ArrowBack />
            </IconButton>
          </Tooltip>
          {heading}
        </div>
        <div className="flex flex-wrap gap-2 self-end sm:self-auto">
          <Button
            variant="text"
            size="large"
            startIcon={<VisibilityOutlined />}
            onClick={() => setPreviewOpen(true)}
            disabled={busy}
          >
            Preview
          </Button>
          <EditorActions
            showDraft={canPublish}
            saveLabel={canPublish ? 'Save page' : saved ? 'Save changes' : 'Save as draft'}
            saving={saving}
            onCancel={leave}
            onSave={save}
          />
        </div>
      </header>

      <FormProvider {...form}>
        <form
          // Saving is explicit (the header buttons); Enter in a field must not save.
          onSubmit={(event) => event.preventDefault()}
          noValidate
          aria-label="Page form"
          className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)]"
        >
          <FormSection
            title="Page content"
            icon={<ArticleOutlined fontSize="small" />}
            className="min-w-0"
          >
            {formError && <Alert severity="error">{formError}</Alert>}
            <ContentPageContentFields
              slug={{
                conflictHeading,
                publishedSlug: saved?.status === 'publish' ? saved.slug : undefined,
                canFollowTitle: !saved,
              }}
              disabled={busy}
            />
          </FormSection>
          <div className="flex min-w-0 flex-col gap-6">
            <FormSection title="Settings" icon={<TuneOutlined fontSize="small" />}>
              <ContentPageSettingsFields canChangeStatus={canPublish} disabled={busy} />
            </FormSection>
            <FormSection
              title="SEO settings"
              icon={<TravelExploreOutlined fontSize="small" />}
              description="Optional. Used for the browser title and search engines."
            >
              <ContentPageSeoFields siteLabel="Website" disabled={busy} />
            </FormSection>
          </div>
        </form>
      </FormProvider>

      {preview && (
        <ContentPagePreviewDialog
          open
          onClose={() => setPreviewOpen(false)}
          heading={preview.heading}
          subHeading={preview.subHeading}
          content={preview.content}
        />
      )}

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Discard changes?"
        description="You have unsaved changes to this page. Leave without saving?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
    </div>
  );
}
