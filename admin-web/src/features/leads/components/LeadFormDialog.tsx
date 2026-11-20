import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { toApiError } from '@/services/api/apiError';
import { applyServerErrors } from '@/utils/helpers';

import { useCreateLead, useLeadAmenities, useUpdateLead } from '../hooks/useLeads';
import { useLeadPermissions } from '../hooks/useLeadPermissions';
import { type LeadFormValues, leadFormSchema } from '../schemas/leadSchema';
import type { Lead } from '../types/lead.types';
import {
  EMPTY_LEAD_FORM,
  LEAD_FORM_FIELDS,
  toCreateRequest,
  toLeadFormValues,
  toUpdateRequest,
} from '../utils/leadForm';

import {
  LeadContactFields,
  LeadEnquiryFields,
  LeadPreferenceFields,
  LeadRequirementFields,
} from './LeadFormFields';

const resolver = zodResolver(leadFormSchema);

interface LeadFormDialogProps {
  open: boolean;
  /** Edit this lead; create a new one when absent. */
  lead?: Lead | null;
  onClose: () => void;
  /** Called with the saved lead after a successful create or update. */
  onSaved?: (lead: Lead) => void;
}

/** Mounted only while open, so every opening starts from fresh values. */
export function LeadFormDialog({ open, lead, onClose, onSaved }: LeadFormDialogProps) {
  const isEdit = Boolean(lead);
  const permissions = useLeadPermissions();
  const amenities = useLeadAmenities({ enabled: permissions.canPickAmenities });
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const isSaving = createLead.isPending || updateLead.isPending;
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError } = useForm<LeadFormValues>({
    resolver,
    defaultValues: lead ? toLeadFormValues(lead) : EMPTY_LEAD_FORM,
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async (values) => {
    if (isSaving) return;
    setFormError(null);
    try {
      let saved: Lead | undefined = lead ?? undefined;
      if (lead) {
        const request = toUpdateRequest(lead, values);
        if (Object.keys(request).length > 0) {
          saved = await updateLead.mutateAsync({ id: lead.id, request });
        }
      } else {
        saved = await createLead.mutateAsync(
          toCreateRequest(values, { includeAmenities: permissions.canPickAmenities }),
        );
      }
      if (saved) onSaved?.(saved);
      onClose();
    } catch (error) {
      // The API names the assignee `assignedTo`; the form field is `assignee`.
      const { fieldErrors } = toApiError(error);
      const assigneeError = fieldErrors.assignedTo;
      if (assigneeError) {
        setError('assignee', { type: 'server', message: assigneeError });
      }
      const message = applyServerErrors(error, setError, LEAD_FORM_FIELDS);
      const onlyAssignee = assigneeError && Object.keys(fieldErrors).length === 1;
      setFormError(onlyAssignee ? null : message);
    }
  });

  const formId = isEdit ? 'edit-lead-form' : 'create-lead-form';
  const amenityOptions = permissions.canPickAmenities ? (amenities.data ?? []) : undefined;

  return (
    <Modal
      open={open}
      title={isEdit ? `Edit ${lead?.leadName ?? 'lead'}` : 'Add new lead'}
      onClose={isSaving ? () => undefined : onClose}
      maxWidth="md"
      scroll="paper"
      actions={
        <>
          <Button variant="text" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={isSaving}>
            {isEdit ? 'Save changes' : 'Create lead'}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={onSubmit}
        noValidate
        aria-label={isEdit ? 'Edit lead' : 'Add new lead'}
        className="grid grid-cols-1 gap-6 pt-2 sm:grid-cols-2"
      >
        {formError && (
          <Alert severity="error" className="sm:col-span-2">
            {formError}
          </Alert>
        )}
        {amenities.isError && (
          <Alert severity="warning" className="sm:col-span-2">
            Could not load amenities. {amenities.error.message}
          </Alert>
        )}
        <LeadContactFields control={control} />
        <LeadEnquiryFields
          control={control}
          statusLocked={lead?.status === 'converted'}
          showAssignee={!isEdit && permissions.canAssign}
        />
        <LeadRequirementFields control={control} />
        <LeadPreferenceFields
          control={control}
          amenityOptions={amenityOptions}
          amenitiesLoading={amenities.isPending && permissions.canPickAmenities}
        />
      </form>
    </Modal>
  );
}
