import ArrowBack from '@mui/icons-material/ArrowBack';
import ArticleOutlined from '@mui/icons-material/ArticleOutlined';
import EventOutlined from '@mui/icons-material/EventOutlined';
import TravelExploreOutlined from '@mui/icons-material/TravelExploreOutlined';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { type ReactNode, useDeferredValue, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { FormSection } from '@/components/common/FormSection';
import { ConfirmDialog } from '@/components/common/Modal';
import { useDebounce } from '@/hooks/useDebounce';
import { type PickedImage, useImagePicker } from '@/hooks/useImagePicker';
import { useUnsavedChangesPrompt } from '@/hooks/useUnsavedChangesPrompt';
import { toApiError } from '@/services/api/apiError';
import { notify } from '@/store/notificationStore';
import { blogRoutes, ROUTES, SEARCH_DEBOUNCE_MS, UPLOAD_LIMITS } from '@/utils/constants';
import { formatBytes } from '@/utils/formatters';

import { useBlogPermissions } from '../hooks/useBlogPermissions';
import {
  useBlogBySlug,
  useBlogCategories,
  useBlogTagSuggestions,
  useCreateBlog,
  useRemoveBlogImage,
  useReplaceBlogImage,
  useUpdateBlog,
} from '../hooks/useBlogs';
import {
  blogFormSchema,
  type BlogFormValues,
  hasVisibleContent,
  type SaveIntent,
} from '../schemas/blogSchema';
import type { Blog } from '../types/blog.types';
import { countWords, htmlToText, readingTimeLabel } from '../utils/blogDisplay';
import {
  emptyBlogForm,
  fromLocalInput,
  isPublishedNow,
  publishModesFor,
  toBlogFormValues,
  toCreateRequest,
  toUpdateRequest,
} from '../utils/blogForm';
import { applyBlogServerErrors } from '../utils/blogFormErrors';
import { SLUG_PATTERN, slugify } from '../utils/blogSlug';

import { BlogCategoryDialog } from './form/BlogCategoryDialog';
import { BlogContentFields } from './form/BlogContentFields';
import { BlogEditorActions } from './form/BlogEditorActions';
import { BlogPublishingFields } from './form/BlogPublishingFields';
import { BlogReadinessCard } from './form/BlogReadinessCard';
import { BlogSeoFields } from './form/BlogSeoFields';
import type { BlogArticleData } from './preview/BlogArticle';
import { BlogPreviewCard } from './preview/BlogPreviewCard';
import { BlogPreviewDialog } from './preview/BlogPreviewDialog';

/** What the editor does: create from scratch, copy an existing blog, or edit one. */
export type BlogEditorMode =
  | { kind: 'create' }
  | { kind: 'duplicate'; source: Blog; image: PickedImage | null }
  | { kind: 'edit'; blog: Blog };

interface BlogEditorProps {
  mode: BlogEditorMode;
  /** Page heading with breadcrumb, rendered next to the back button. */
  heading: ReactNode;
  /** Shown above the form, e.g. what a copy contains. */
  notice?: ReactNode;
}

const MAX_IMAGE_LABEL = formatBytes(UPLOAD_LIMITS.maxImageBytes);
const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

function defaultValues(mode: BlogEditorMode): BlogFormValues {
  switch (mode.kind) {
    case 'create':
      return emptyBlogForm();
    case 'duplicate':
      // A copy is a new draft: own slug (generated), no publication time, image re-uploaded.
      return {
        ...emptyBlogForm(),
        ...toBlogFormValues(mode.source),
        title: `Copy of ${mode.source.title}`.slice(0, 255),
        slugEdited: false,
        slug: '',
        intent: 'draft',
        publishMode: 'now',
        publishAt: emptyBlogForm().publishAt,
        image: mode.image?.file ?? null,
      };
    case 'edit':
      return toBlogFormValues(mode.blog);
  }
}

/**
 * The blog form for add, duplicate and edit: content and SEO on the left; preview, publishing and a
 * checklist on the right. Create sends one multipart request; edit sends the changed fields
 * (`PATCH`), then replaces or removes the feature image if asked.
 */
export function BlogEditor({ mode, heading, notice }: BlogEditorProps) {
  const navigate = useNavigate();
  const permissions = useBlogPermissions();
  const saved = mode.kind === 'edit' ? mode.blog : undefined;

  const createBlog = useCreateBlog({
    successMessage: mode.kind === 'duplicate' ? 'Blog duplicated.' : undefined,
  });
  const updateBlog = useUpdateBlog();
  const replaceImage = useReplaceBlogImage();
  const removeImage = useRemoveBlogImage();
  const categories = useBlogCategories({ enabled: permissions.canViewCategories });
  const tagSuggestions = useBlogTagSuggestions();
  const image = useImagePicker(mode.kind === 'duplicate' ? mode.image : null);
  const [progress, setProgress] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState<SaveIntent | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

  const form = useForm<BlogFormValues>({
    resolver: zodResolver(blogFormSchema),
    defaultValues: defaultValues(mode),
    mode: 'onTouched',
  });
  const { control, handleSubmit, setError, setValue, clearErrors, formState } = form;
  const values = useWatch({ control });
  const title = values.title ?? '';
  const content = useDeferredValue(values.content ?? '');
  const removingImage = values.removeImage ?? false;

  // A copy is unsaved work from the start; after a save, `allowNavigation` lets the redirect through.
  const { blocker, allowNavigation } = useUnsavedChangesPrompt(
    formState.isDirty || mode.kind === 'duplicate',
  );

  // Slug availability: the list search matches slugs, so an exact match means it is taken.
  const slugCandidate = values.slugEdited ? (values.slug ?? '') : slugify(title);
  const debouncedSlug = useDebounce(slugCandidate, SEARCH_DEBOUNCE_MS);
  const checkSlug =
    SLUG_PATTERN.test(debouncedSlug) &&
    debouncedSlug !== saved?.slug &&
    debouncedSlug === slugCandidate;
  const slugOwner = useBlogBySlug(checkSlug ? debouncedSlug : '');
  const conflictTitle =
    checkSlug && slugOwner.data && slugOwner.data.id !== saved?.id ? slugOwner.data.title : null;

  const leave = () => void navigate(saved ? blogRoutes.detail(saved.id) : ROUTES.blogs);

  const handleSelectImage = async (file: File) => {
    clearErrors('image');
    const error = await image.select(file);
    if (error) {
      setError('image', { type: 'validate', message: error });
      return;
    }
    setValue('image', file, { shouldDirty: true });
    setValue('removeImage', false, { shouldDirty: true });
  };
  const handleRemoveImage = () => {
    if (image.picked) {
      image.remove();
      setValue('image', null, { shouldDirty: true });
    } else if (saved?.featureImageUrl) {
      setValue('removeImage', true, { shouldDirty: true });
    }
  };

  const saveEdits = async (blog: Blog, current: BlogFormValues, intent: SaveIntent) => {
    const request = toUpdateRequest(blog, current, intent);
    const hasFieldChanges = Object.keys(request).length > 0;
    if (hasFieldChanges) await updateBlog.mutateAsync({ id: blog.id, request });
    try {
      if (current.image) {
        await replaceImage.mutateAsync({
          id: blog.id,
          image: current.image,
          onProgress: setProgress,
        });
      } else if (current.removeImage && blog.featureImageUrl) {
        await removeImage.mutateAsync(blog.id);
      }
    } catch (error) {
      if (!hasFieldChanges) throw error;
      // The details are saved; only the image failed. Keep the user here to retry it.
      setFormError(
        `The changes were saved, but the featured image could not be updated: ${toApiError(error).message}`,
      );
      return false;
    }
    const changed = hasFieldChanges || current.image !== null || current.removeImage;
    notify(changed ? 'Blog updated.' : 'No changes to save.', changed ? 'success' : 'info');
    return true;
  };

  const save = (intent: SaveIntent) => {
    setValue('intent', intent);
    void handleSubmit(
      async (current) => {
        if (saving) return;
        setSaving(intent);
        setFormError(null);
        try {
          if (saved) {
            if (!(await saveEdits(saved, current, intent))) return;
            allowNavigation();
            void navigate(blogRoutes.detail(saved.id));
          } else {
            const created = await createBlog.mutateAsync({
              request: toCreateRequest(current, intent),
              featureImage: current.image,
              onProgress: setProgress,
            });
            if (mode.kind === 'create') {
              notify(
                created.publicState === 'scheduled'
                  ? 'Blog scheduled.'
                  : created.status === 'publish'
                    ? 'Blog published.'
                    : 'Draft saved.',
                'success',
              );
            }
            allowNavigation();
            void navigate(blogRoutes.detail(created.id));
          }
        } catch (error) {
          setFormError(applyBlogServerErrors(error, setError, { maxImageLabel: MAX_IMAGE_LABEL }));
        } finally {
          setSaving(null);
          setProgress(null);
        }
      },
      () => setFormError('Check the highlighted fields.'),
    )();
  };

  const categoryOptions = categories.data;
  const selectedCategory =
    categoryOptions?.find((category) => category.id === values.categoryId) ??
    (saved?.category?.id === values.categoryId ? saved?.category : null);
  const words = countWords(htmlToText(content));
  const publishMode = values.publishMode ?? 'now';
  const isPublished = saved ? saved.status === 'publish' : false;
  const scheduledTime = fromLocalInput(values.publishAt ?? '');
  const previewDate =
    publishMode === 'schedule' && scheduledTime
      ? `${dateFormatter.format(new Date(scheduledTime))} (scheduled)`
      : publishMode === 'keep' && saved?.publishedAt
        ? dateFormatter.format(new Date(saved.publishedAt))
        : dateFormatter.format(new Date());
  const previewSrc = image.picked?.url ?? (removingImage ? null : (saved?.featureImageUrl ?? null));
  const article: BlogArticleData = {
    title: title.trim(),
    shortDescription: values.shortDescription?.trim() ?? '',
    categoryTitle: selectedCategory?.title ?? null,
    imageSrc: previewSrc,
    dateLabel: previewDate,
    readingLabel: readingTimeLabel(words),
    tags: values.tags ?? [],
    content,
  };

  const categoryNote = !permissions.canViewCategories
    ? 'Categories are not listed (no permission to view categories).'
    : categories.error
      ? 'Categories could not be loaded. Reload the page to try again.'
      : undefined;

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
        <BlogEditorActions
          publishKind={
            publishMode === 'schedule'
              ? 'schedule'
              : saved && isPublishedNow(saved)
                ? 'update'
                : 'publish'
          }
          isPublished={isPublished}
          saving={saving}
          onCancel={leave}
          onSave={save}
        />
      </header>

      {notice}

      <FormProvider {...form}>
        <form
          // Saving is explicit (draft or publish buttons); Enter in a field must not save.
          onSubmit={(event) => event.preventDefault()}
          noValidate
          aria-label="Blog editor"
          className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)]"
        >
          <div className="flex min-w-0 flex-col gap-6">
            <FormSection title="Blog information" icon={<ArticleOutlined fontSize="small" />}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <BlogContentFields
                categories={{
                  options: categoryOptions,
                  isLoading: categories.isLoading,
                  unavailableNote: categoryNote,
                  saved: saved?.category,
                  onAdd: permissions.canCreateCategories
                    ? () => setCategoryDialogOpen(true)
                    : undefined,
                }}
                slug={{
                  conflictTitle,
                  publishedSlug: isPublished ? saved?.slug : undefined,
                  canFollowTitle: !saved,
                }}
                image={{
                  previewSrc,
                  fileInfo: image.picked?.file,
                  dimensions: image.picked?.dimensions,
                  maxSizeLabel: MAX_IMAGE_LABEL,
                  progress,
                  onSelect: (file) => void handleSelectImage(file),
                  onRemove:
                    image.picked || (saved?.featureImageUrl && !removingImage)
                      ? handleRemoveImage
                      : undefined,
                }}
                tagSuggestions={tagSuggestions.data ?? []}
                contentFooter={`${words.toLocaleString()} words · ${readingTimeLabel(words)}`}
                disabled={saving !== null}
              />
            </FormSection>
            <FormSection
              title="SEO settings"
              icon={<TravelExploreOutlined fontSize="small" />}
              description="Optional. Empty fields fall back to the title and short description."
            >
              <BlogSeoFields siteLabel="Website" disabled={saving !== null} />
            </FormSection>
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            <BlogPreviewCard data={article} onOpenFull={() => setPreviewOpen(true)} />
            <FormSection title="Publishing options" icon={<EventOutlined fontSize="small" />}>
              <BlogPublishingFields
                modes={publishModesFor(saved)}
                saved={saved}
                timeZone={TIME_ZONE}
                disabled={saving !== null}
              />
            </FormSection>
            <BlogReadinessCard
              items={[
                { key: 'title', label: 'Title', done: title.trim() !== '', required: true },
                {
                  key: 'content',
                  label: 'Content',
                  done: hasVisibleContent(content),
                  required: true,
                },
                {
                  key: 'category',
                  label: 'Category (to publish)',
                  done: values.categoryId != null,
                  required: true,
                },
                { key: 'image', label: 'Featured image', done: previewSrc !== null },
                {
                  key: 'excerpt',
                  label: 'Short description',
                  done: (values.shortDescription ?? '').trim() !== '',
                },
                { key: 'tags', label: 'At least one tag', done: (values.tags ?? []).length > 0 },
                {
                  key: 'seo',
                  label: 'Meta description',
                  done: (values.metaDescription ?? '').trim() !== '',
                },
              ]}
            />
          </div>
        </form>
      </FormProvider>

      <BlogPreviewDialog open={previewOpen} data={article} onClose={() => setPreviewOpen(false)} />
      {categoryDialogOpen && (
        <BlogCategoryDialog
          open
          onClose={() => setCategoryDialogOpen(false)}
          onCreated={(category) =>
            setValue('categoryId', category.id, { shouldDirty: true, shouldValidate: true })
          }
        />
      )}
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Discard changes?"
        description="You have unsaved changes to this blog. Leave without saving?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
    </div>
  );
}
