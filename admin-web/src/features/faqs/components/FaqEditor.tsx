import ArrowBack from '@mui/icons-material/ArrowBack';
import QuizOutlined from '@mui/icons-material/QuizOutlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { type ReactNode, useDeferredValue, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { FormSection } from '@/components/common/FormSection';
import { ConfirmDialog } from '@/components/common/Modal';
import { useUnsavedChangesPrompt } from '@/hooks/useUnsavedChangesPrompt';
import { toApiError } from '@/services/api/apiError';
import { notify } from '@/store/notificationStore';
import { ROUTES } from '@/utils/constants';
import { applyServerErrors } from '@/utils/helpers';

import { useFaqPermissions } from '../hooks/useFaqPermissions';
import { useCreateFaq, useFaqCategories, useUpdateFaq } from '../hooks/useFaqs';
import { faqFormSchema, type FaqFormValues } from '../schemas/faqSchema';
import type { Faq, FaqStatus } from '../types/faq.types';
import {
  emptyFaqForm,
  FAQ_FORM_FIELDS,
  toCreateFaqRequest,
  toFaqFormValues,
  toUpdateFaqRequest,
} from '../utils/faqForm';

import { FaqContentFields } from './form/FaqContentFields';
import { FaqEditorActions, type FaqSaveIntent } from './form/FaqEditorActions';
import { FaqPreviewCard } from './form/FaqPreviewCard';
import { FaqSettingsFields } from './form/FaqSettingsFields';

/** Create a FAQ (with a suggested display order) or edit a saved one. */
export type FaqEditorMode = { kind: 'create'; sortOrder: number } | { kind: 'edit'; faq: Faq };

interface FaqEditorProps {
  mode: FaqEditorMode;
  /** Page heading with breadcrumb, rendered next to the back button. */
  heading: ReactNode;
}

/** The message for a failed save that could not be placed on a field, or null. */
function saveErrorMessage(error: unknown, placed: string | null): string | null {
  const apiError = toApiError(error);
  if (apiError.code === 'faq_publish_forbidden') {
    return 'You do not have permission to publish or unpublish FAQs. Save it as a draft instead.';
  }
  if (apiError.code === 'faq_not_found')
    return 'This FAQ no longer exists; it may have been deleted.';
  return placed;
}

/**
 * The FAQ form: question and answer on the left; settings and a live preview on the right. Create
 * sends one `POST`; edit sends only the changed fields (`PATCH`).
 */
export function FaqEditor({ mode, heading }: FaqEditorProps) {
  const navigate = useNavigate();
  const { canPublish } = useFaqPermissions();
  const saved = mode.kind === 'edit' ? mode.faq : undefined;
  const createFaq = useCreateFaq();
  const updateFaq = useUpdateFaq();
  const categories = useFaqCategories();
  const [saving, setSaving] = useState<FaqSaveIntent | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<FaqFormValues>({
    resolver: zodResolver(faqFormSchema),
    defaultValues: saved
      ? toFaqFormValues(saved)
      : emptyFaqForm(mode.kind === 'create' ? mode.sortOrder : 0),
    mode: 'onTouched',
  });
  const { control, handleSubmit, setError, formState } = form;
  const [question = '', answer = '', category = ''] = useWatch({
    control,
    name: ['question', 'answer', 'category'],
  });
  const previewAnswer = useDeferredValue(answer);
  const { blocker, allowNavigation } = useUnsavedChangesPrompt(formState.isDirty);

  const categoryList = categories.data ?? [];
  const removedCategory =
    saved && !categories.isPending && !categoryList.some((c) => c.key === saved.category)
      ? saved.category
      : undefined;
  const categoryLabel =
    categoryList.find((c) => c.key === category)?.label ??
    (saved?.category === category ? saved.categoryLabel : null);

  const leave = () => void navigate(ROUTES.faqs);

  /** The status to save: "draft", or the form's choice when the user may change it. */
  const statusFor = (intent: FaqSaveIntent, values: FaqFormValues): FaqStatus => {
    if (!canPublish) return saved?.status ?? 'draft';
    return intent === 'draft' ? 'draft' : values.status;
  };

  const save = (intent: FaqSaveIntent) => {
    void handleSubmit(
      async (values) => {
        if (saving) return;
        setSaving(intent);
        setFormError(null);
        const status = statusFor(intent, values);
        try {
          if (saved) {
            const request = toUpdateFaqRequest(saved, values, status);
            if (Object.keys(request).length === 0) {
              notify('No changes to save.', 'info');
            } else {
              await updateFaq.mutateAsync({ id: saved.id, request });
              notify('FAQ updated.', 'success');
            }
          } else {
            const created = await createFaq.mutateAsync(toCreateFaqRequest(values, status));
            notify(
              created.status === 'publish' ? 'FAQ published.' : 'FAQ saved as draft.',
              'success',
            );
          }
          allowNavigation();
          leave();
        } catch (error) {
          const placed = applyServerErrors(error, setError, FAQ_FORM_FIELDS);
          setFormError(saveErrorMessage(error, placed));
        } finally {
          setSaving(null);
        }
      },
      () => setFormError('Check the highlighted fields.'),
    )();
  };

  const busy = saving !== null;
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
        <FaqEditorActions
          showDraft={canPublish}
          saveLabel={canPublish ? 'Save FAQ' : saved ? 'Save changes' : 'Save as draft'}
          saving={saving}
          onCancel={leave}
          onSave={save}
        />
      </header>

      <FormProvider {...form}>
        <form
          // Saving is explicit (the header buttons); Enter in a field must not save.
          onSubmit={(event) => event.preventDefault()}
          noValidate
          aria-label="FAQ form"
          className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)]"
        >
          <FormSection
            title="FAQ content"
            icon={<QuizOutlined fontSize="small" />}
            className="min-w-0"
          >
            {formError && <Alert severity="error">{formError}</Alert>}
            <FaqContentFields disabled={busy} />
          </FormSection>
          <div className="flex min-w-0 flex-col gap-6">
            <FormSection title="Settings" icon={<TuneOutlined fontSize="small" />}>
              <FaqSettingsFields
                categories={categoryList}
                isCategoriesLoading={categories.isPending}
                categoriesNote={
                  categories.error
                    ? 'Categories could not be loaded. Reload the page to try again.'
                    : undefined
                }
                removedCategory={removedCategory}
                canChangeStatus={canPublish}
                disabled={busy}
              />
            </FormSection>
            <FaqPreviewCard
              question={question}
              answer={previewAnswer}
              categoryLabel={categoryLabel}
            />
          </div>
        </form>
      </FormProvider>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Discard changes?"
        description="You have unsaved changes to this FAQ. Leave without saving?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
    </div>
  );
}
