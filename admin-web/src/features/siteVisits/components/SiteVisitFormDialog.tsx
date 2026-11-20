import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { toApiError } from '@/services/api/apiError';
import { applyServerErrors } from '@/utils/helpers';

import { useCreateSiteVisit, useUpdateSiteVisit } from '../hooks/useSiteVisits';
import { useSiteVisitPermissions } from '../hooks/useSiteVisitPermissions';
import { type SiteVisitFormValues, siteVisitFormSchema } from '../schemas/siteVisitSchema';
import type { LeadPickerOption, SiteVisit } from '../types/siteVisit.types';
import { isUpcoming, shortTime } from '../utils/siteVisitDisplay';
import {
  emptySiteVisitForm,
  SITE_VISIT_FORM_FIELDS,
  SITE_VISIT_REFERENCE_FIELDS,
  toCreateRequest,
  toSiteVisitFormValues,
  toUpdateRequest,
} from '../utils/siteVisitForm';

import { SiteVisitFormFields } from './SiteVisitFormFields';

interface SiteVisitFormDialogProps {
  /** Edit this visit; schedule a new one when absent. */
  visit?: SiteVisit | null;
  onClose: () => void;
  /** Called with the saved visit after a successful create or update. */
  onSaved?: (visit: SiteVisit) => void;
}

/** Schedules or edits a visit. Mounted only while open, so every opening starts from fresh values. */
export function SiteVisitFormDialog({ visit, onClose, onSaved }: SiteVisitFormDialogProps) {
  const permissions = useSiteVisitPermissions();
  const createVisit = useCreateSiteVisit();
  const updateVisit = useUpdateSiteVisit();
  const isSaving = createVisit.isPending || updateVisit.isPending;
  const [formError, setFormError] = useState<string | null>(null);
  const detailsLocked = visit ? !isUpcoming(visit.status) : false;

  const resolver = useMemo(
    () =>
      zodResolver(
        siteVisitFormSchema({
          requireProperty: !visit,
          originalSchedule: visit
            ? { visitDate: visit.visitDate, visitTime: shortTime(visit.visitTime) }
            : undefined,
        }),
      ),
    [visit],
  );
  const { control, handleSubmit, setError, getValues, setValue } = useForm<SiteVisitFormValues>({
    resolver,
    defaultValues: visit ? toSiteVisitFormValues(visit) : emptySiteVisitForm(),
    mode: 'onTouched',
  });
  const [visitDate, visitTime] = useWatch({ control, name: ['visitDate', 'visitTime'] });
  const willReschedule =
    visit &&
    !detailsLocked &&
    (visitDate !== visit.visitDate || shortTime(visitTime) !== shortTime(visit.visitTime));

  const handleLeadPicked = (lead: LeadPickerOption) => {
    const fill = (field: 'name' | 'mobile' | 'email', value: string | null) => {
      if (value && !getValues(field).trim()) setValue(field, value, { shouldValidate: true });
    };
    fill('name', lead.label);
    fill('mobile', lead.phone);
    fill('email', lead.email);
  };

  const onSubmit = handleSubmit(async (values) => {
    if (isSaving) return;
    setFormError(null);
    try {
      let saved: SiteVisit | undefined = visit ?? undefined;
      if (visit) {
        const request = toUpdateRequest(visit, values);
        if (Object.keys(request).length > 0) {
          saved = await updateVisit.mutateAsync({ id: visit.id, request });
        }
      } else {
        saved = await createVisit.mutateAsync(
          toCreateRequest(values, { includeAgent: permissions.canAssign }),
        );
      }
      if (saved) onSaved?.(saved);
      onClose();
    } catch (error) {
      // References are picked, so their API names differ from the form fields.
      const { fieldErrors } = toApiError(error);
      let onlyReferences = Object.keys(fieldErrors).length > 0;
      for (const [apiField, message] of Object.entries(fieldErrors)) {
        const formField = SITE_VISIT_REFERENCE_FIELDS[apiField];
        if (formField) setError(formField, { type: 'server', message });
        else onlyReferences = false;
      }
      const message = applyServerErrors(error, setError, SITE_VISIT_FORM_FIELDS);
      setFormError(onlyReferences ? null : message);
    }
  });

  const formId = visit ? 'edit-site-visit-form' : 'create-site-visit-form';

  return (
    <Modal
      open
      title={visit ? `Edit ${visit.visitCode}` : 'Schedule site visit'}
      onClose={isSaving ? () => undefined : onClose}
      maxWidth="md"
      scroll="paper"
      actions={
        <>
          <Button variant="text" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={isSaving}>
            {visit ? 'Save changes' : 'Schedule visit'}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={onSubmit}
        noValidate
        aria-label={visit ? 'Edit site visit' : 'Schedule site visit'}
        className="grid grid-cols-1 gap-6 pt-2 sm:grid-cols-2"
      >
        {formError && (
          <Alert severity="error" className="sm:col-span-2">
            {formError}
          </Alert>
        )}
        {detailsLocked && (
          <Alert severity="info" className="sm:col-span-2">
            This visit is no longer upcoming, so only the lead, customer account and follow-up can
            change.
          </Alert>
        )}
        {willReschedule && (
          <Alert severity="info" className="sm:col-span-2">
            Saving a new date or time marks the visit as rescheduled.
          </Alert>
        )}
        <SiteVisitFormFields
          control={control}
          mode={visit ? 'edit' : 'create'}
          detailsLocked={detailsLocked}
          propertyLabel={visit?.property.projectName ?? 'Deleted property'}
          showLead={permissions.canPickLeads}
          showCustomer={permissions.canPickUsers}
          showAgent={!visit && permissions.canAssign}
          onLeadPicked={visit ? undefined : handleLeadPicked}
        />
      </form>
    </Modal>
  );
}
