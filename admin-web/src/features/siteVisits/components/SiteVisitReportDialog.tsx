import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import Rating from '@mui/material/Rating';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/components/common/Button';
import { FormTextField } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { applyServerErrors } from '@/utils/helpers';

import { useSubmitSiteVisitReport } from '../hooks/useSiteVisits';
import {
  SITE_VISIT_LIMITS,
  type SiteVisitReportValues,
  siteVisitReportSchema,
} from '../schemas/siteVisitSchema';
import { SITE_VISIT_INTERESTS, type SiteVisit } from '../types/siteVisit.types';
import { SITE_VISIT_INTEREST_META } from '../utils/siteVisitDisplay';
import { toReportRequest, toReportValues } from '../utils/siteVisitForm';

const resolver = zodResolver(siteVisitReportSchema);
const FIELDS = [
  'interest',
  'visitNote',
  'duration',
  'visitedWith',
  'feedback',
  'rating',
  'nextFollowUp',
  'followUpNote',
] as const;

interface SiteVisitReportDialogProps {
  visit: SiteVisit;
  onClose: () => void;
}

/** Submits or replaces the report of a completed visit. */
export function SiteVisitReportDialog({ visit, onClose }: SiteVisitReportDialogProps) {
  const submit = useSubmitSiteVisitReport();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError } = useForm<SiteVisitReportValues>({
    resolver,
    defaultValues: toReportValues(visit),
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async (values) => {
    if (submit.isPending) return;
    setFormError(null);
    try {
      await submit.mutateAsync({ id: visit.id, request: toReportRequest(values) });
      onClose();
    } catch (error) {
      setFormError(applyServerErrors(error, setError, FIELDS));
    }
  });

  return (
    <Modal
      open
      title={`${visit.report ? 'Update' : 'Submit'} report for ${visit.visitCode}`}
      onClose={submit.isPending ? () => undefined : onClose}
      maxWidth="sm"
      scroll="paper"
      actions={
        <>
          <Button variant="text" onClick={onClose} disabled={submit.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="site-visit-report-form" loading={submit.isPending}>
            Save report
          </Button>
        </>
      }
    >
      <form
        id="site-visit-report-form"
        onSubmit={onSubmit}
        noValidate
        aria-label="Visit report"
        className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2"
      >
        {formError && (
          <Alert severity="error" className="sm:col-span-2">
            {formError}
          </Alert>
        )}
        {visit.report && (
          <Alert severity="info" className="sm:col-span-2">
            Saving replaces the whole report; empty fields are cleared.
          </Alert>
        )}
        <FormTextField
          control={control}
          name="interest"
          label="Interest"
          select
          required
          size="small"
        >
          {SITE_VISIT_INTERESTS.map((value) => (
            <MenuItem key={value} value={value}>
              {SITE_VISIT_INTEREST_META[value].label}
            </MenuItem>
          ))}
        </FormTextField>
        <Controller
          control={control}
          name="rating"
          render={({ field }) => (
            <div className="flex flex-col">
              <Typography
                variant="caption"
                color="text.secondary"
                component="label"
                id="report-rating"
              >
                Rating
              </Typography>
              <Rating
                value={field.value}
                onChange={(_, value) => field.onChange(value)}
                aria-labelledby="report-rating"
              />
            </div>
          )}
        />
        <FormTextField
          control={control}
          name="duration"
          label="Duration (minutes)"
          size="small"
          slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 4 } }}
        />
        <FormTextField
          control={control}
          name="visitedWith"
          label="Visited with"
          size="small"
          slotProps={{ htmlInput: { maxLength: SITE_VISIT_LIMITS.visitedWith } }}
        />
        <FormTextField
          control={control}
          name="visitNote"
          label="Visit note"
          size="small"
          multiline
          minRows={2}
          className="sm:col-span-2"
          slotProps={{ htmlInput: { maxLength: SITE_VISIT_LIMITS.note } }}
        />
        <FormTextField
          control={control}
          name="feedback"
          label="Customer feedback"
          size="small"
          multiline
          minRows={2}
          className="sm:col-span-2"
          slotProps={{ htmlInput: { maxLength: SITE_VISIT_LIMITS.note } }}
        />
        <FormTextField
          control={control}
          name="nextFollowUp"
          label="Next follow-up"
          type="datetime-local"
          size="small"
          helperText="Must be after the visit."
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <FormTextField
          control={control}
          name="followUpNote"
          label="Follow-up remarks"
          size="small"
          slotProps={{ htmlInput: { maxLength: SITE_VISIT_LIMITS.note } }}
        />
      </form>
    </Modal>
  );
}
