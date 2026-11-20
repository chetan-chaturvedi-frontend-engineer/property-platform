import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { toApiError } from '@/services/api/apiError';
import { applyServerErrors } from '@/utils/helpers';

import { useCreatePlan, useUpdatePlan } from '../hooks/useSubscriptionPlans';
import { type PlanFormValues, planFormSchema } from '../schemas/planSchema';
import type { SubscriptionPlan } from '../types/subscriptionPlan.types';
import {
  duplicateFormValues,
  emptyPlanForm,
  PLAN_FORM_FIELDS,
  toCreateRequest,
  toPlanFormValues,
  toUpdateRequest,
} from '../utils/planForm';

import { PlanFormFields } from './PlanFormFields';

/** What the dialog does: create from scratch, copy an existing plan, or edit one. */
export type PlanFormMode =
  | { kind: 'create' }
  | { kind: 'duplicate'; source: SubscriptionPlan }
  | { kind: 'edit'; plan: SubscriptionPlan };

interface PlanFormDialogProps {
  mode: PlanFormMode;
  onClose: () => void;
  /** Called with the saved plan after a successful create or update. */
  onSaved?: (plan: SubscriptionPlan) => void;
}

const TITLES: Record<PlanFormMode['kind'], string> = {
  create: 'Add new plan',
  duplicate: 'Duplicate plan',
  edit: 'Edit plan',
};

function defaultValues(mode: PlanFormMode): PlanFormValues {
  switch (mode.kind) {
    case 'create':
      return emptyPlanForm();
    case 'duplicate':
      return duplicateFormValues(mode.source);
    case 'edit':
      return toPlanFormValues(mode.plan);
  }
}

/** Mounted only while open, so every opening starts from fresh values. */
export function PlanFormDialog({ mode, onClose, onSaved }: PlanFormDialogProps) {
  const createPlan = useCreatePlan({
    successMessage: mode.kind === 'duplicate' ? 'Plan duplicated as a draft.' : 'Plan created.',
  });
  const updatePlan = useUpdatePlan();
  const isSaving = createPlan.isPending || updatePlan.isPending;
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: defaultValues(mode),
    mode: 'onTouched',
  });
  const { handleSubmit, setError } = form;

  const onSubmit = handleSubmit(async (values) => {
    if (isSaving) return;
    setFormError(null);
    try {
      let saved: SubscriptionPlan;
      if (mode.kind === 'edit') {
        const request = toUpdateRequest(mode.plan, values);
        saved =
          Object.keys(request).length > 0
            ? await updatePlan.mutateAsync({ id: mode.plan.id, request })
            : mode.plan;
      } else {
        saved = await createPlan.mutateAsync(toCreateRequest(values));
      }
      onSaved?.(saved);
      onClose();
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.code === 'subscription_plan_slug_taken') {
        setError('slug', { type: 'server', message: apiError.message });
        return;
      }
      // Errors on one entry ("features[2]") belong to the feature list as a whole.
      for (const [field, message] of Object.entries(apiError.fieldErrors)) {
        if (field.startsWith('features[')) setError('features', { type: 'server', message });
      }
      const listOnly = Object.keys(apiError.fieldErrors).every((field) =>
        field.startsWith('features['),
      );
      const message = applyServerErrors(error, setError, PLAN_FORM_FIELDS);
      setFormError(listOnly && Object.keys(apiError.fieldErrors).length > 0 ? null : message);
    }
  });

  const formId = `plan-form-${mode.kind}`;

  return (
    <Modal
      open
      title={mode.kind === 'edit' ? `Edit ${mode.plan.title}` : TITLES[mode.kind]}
      onClose={isSaving ? () => undefined : onClose}
      maxWidth="md"
      scroll="paper"
      actions={
        <>
          <Button variant="text" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={isSaving}>
            {mode.kind === 'edit' ? 'Save changes' : 'Create plan'}
          </Button>
        </>
      }
    >
      <FormProvider {...form}>
        <form
          id={formId}
          onSubmit={onSubmit}
          noValidate
          aria-label={TITLES[mode.kind]}
          className="flex flex-col gap-4 pt-2"
        >
          {formError && <Alert severity="error">{formError}</Alert>}
          {mode.kind === 'duplicate' && (
            <Alert severity="info">
              The copy is saved as a draft with a new slug. Review it before activating it.
            </Alert>
          )}
          {mode.kind === 'edit' && (
            <Alert severity="info">
              Existing subscribers keep the terms they signed up with; changes apply to new
              subscriptions only.
            </Alert>
          )}
          <PlanFormFields isEdit={mode.kind === 'edit'} />
        </form>
      </FormProvider>
    </Modal>
  );
}
