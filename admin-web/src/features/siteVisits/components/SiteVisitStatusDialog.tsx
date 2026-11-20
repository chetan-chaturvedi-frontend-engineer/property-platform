import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/common/Button';
import { FormTextField } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { toApiError } from '@/services/api/apiError';
import { notify } from '@/store/notificationStore';
import { applyServerErrors } from '@/utils/helpers';

import { useChangeSiteVisitStatus } from '../hooks/useSiteVisits';
import {
  SITE_VISIT_LIMITS,
  type SiteVisitStatusValues,
  siteVisitStatusSchema,
} from '../schemas/siteVisitSchema';
import { REQUESTABLE_STATUSES, type SiteVisitStatusRequest } from '../types/siteVisit.types';
import { fromLocalInput, SITE_VISIT_STATUS_META } from '../utils/siteVisitDisplay';
import { type StatusTarget, statusOptionsFor, transitionBlocker } from '../utils/siteVisitStatus';

const resolver = zodResolver(siteVisitStatusSchema);

interface SiteVisitStatusDialogProps {
  /** One visit, or the bulk selection. Visits the new status does not apply to are skipped. */
  visits: readonly StatusTarget[];
  onClose: () => void;
  /** Called after a bulk run with the ids that changed. */
  onDone?: (changedIds: number[]) => void;
}

/** Moves visits along the lifecycle; cancelling needs a reason. Mounted only while open. */
export function SiteVisitStatusDialog({ visits, onClose, onDone }: SiteVisitStatusDialogProps) {
  const isBulk = visits.length > 1;
  const changeStatus = useChangeSiteVisitStatus({ quiet: isBulk });
  const [formError, setFormError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const isSaving = changeStatus.isPending || progress !== null;
  const options = statusOptionsFor(visits, REQUESTABLE_STATUSES);
  const { control, handleSubmit, setError } = useForm<SiteVisitStatusValues>({
    resolver,
    defaultValues: { status: '', cancellationReason: '', actualVisitDate: '' },
  });
  const status = useWatch({ control, name: 'status' });

  const onSubmit = handleSubmit(async (values) => {
    if (isSaving || !values.status) return;
    const next = values.status;
    setFormError(null);
    const request: SiteVisitStatusRequest = {
      status: next,
      ...(next === 'cancelled' ? { cancellationReason: values.cancellationReason } : {}),
      ...(next === 'completed' && values.actualVisitDate
        ? { actualVisitDate: fromLocalInput(values.actualVisitDate) ?? undefined }
        : {}),
    };

    if (!isBulk) {
      const [visit] = visits;
      if (!visit) return;
      try {
        await changeStatus.mutateAsync({ id: visit.id, request });
        onClose();
      } catch (error) {
        setFormError(
          applyServerErrors(error, setError, ['status', 'cancellationReason', 'actualVisitDate']),
        );
      }
      return;
    }

    // No bulk endpoint exists, so each visit is updated on its own and the outcome summarized.
    const eligible = visits.filter((visit) => transitionBlocker(visit, next) === null);
    const changed: number[] = [];
    const failures: string[] = [];
    setProgress(0);
    for (const [index, visit] of eligible.entries()) {
      try {
        await changeStatus.mutateAsync({ id: visit.id, request });
        changed.push(visit.id);
      } catch (error) {
        failures.push(`${visit.visitCode}: ${toApiError(error).message}`);
      }
      setProgress(((index + 1) / eligible.length) * 100);
    }
    setProgress(null);
    const skipped = visits.length - eligible.length;
    const label = SITE_VISIT_STATUS_META[next].label.toLowerCase();
    const summary = [
      `${changed.length} visit${changed.length === 1 ? '' : 's'} marked ${label}`,
      skipped ? `${skipped} skipped (status not applicable)` : null,
      failures.length ? `${failures.length} failed` : null,
    ]
      .filter(Boolean)
      .join(', ');
    notify(`${summary}.`, failures.length ? 'warning' : 'success');
    onDone?.(changed);
    if (failures.length) {
      setFormError(failures.join('\n'));
    } else {
      onClose();
    }
  });

  const selected = options.find((option) => option.status === status);

  return (
    <Modal
      open
      title={
        isBulk
          ? `Change status of ${visits.length} visits`
          : `Change status of ${visits[0]?.visitCode ?? 'visit'}`
      }
      onClose={isSaving ? () => undefined : onClose}
      maxWidth="xs"
      actions={
        <>
          <Button variant="text" onClick={onClose} disabled={isSaving}>
            {formError && isBulk ? 'Close' : 'Cancel'}
          </Button>
          <Button
            type="submit"
            form="site-visit-status-form"
            color={status === 'cancelled' ? 'error' : 'primary'}
            loading={isSaving}
            disabled={!selected || selected.eligible === 0}
          >
            {status === 'cancelled' ? 'Cancel visit' : 'Save status'}
          </Button>
        </>
      }
    >
      <form
        id="site-visit-status-form"
        onSubmit={onSubmit}
        noValidate
        aria-label="Change status"
        className="flex flex-col gap-4 pt-2"
      >
        {formError && (
          <Alert severity="error" className="whitespace-pre-line">
            {formError}
          </Alert>
        )}
        {progress !== null && (
          <LinearProgress variant="determinate" value={progress} aria-label="Updating visits" />
        )}
        <FormTextField control={control} name="status" label="New status" select required>
          {options.map((option) => (
            <MenuItem key={option.status} value={option.status} disabled={option.eligible === 0}>
              <ListItemText
                primary={SITE_VISIT_STATUS_META[option.status].label}
                secondary={
                  option.blocker ??
                  (isBulk && option.eligible < visits.length
                    ? `Applies to ${option.eligible} of ${visits.length}`
                    : undefined)
                }
              />
            </MenuItem>
          ))}
        </FormTextField>
        {(status === 'completed' || status === 'cancelled' || status === 'no_show') && (
          <Alert severity="info">This status is final; the visit cannot change afterwards.</Alert>
        )}
        {status === 'cancelled' && (
          <FormTextField
            control={control}
            name="cancellationReason"
            label="Cancellation reason"
            required
            multiline
            minRows={3}
            slotProps={{ htmlInput: { maxLength: SITE_VISIT_LIMITS.cancellationReason } }}
          />
        )}
        {status === 'completed' && (
          <FormTextField
            control={control}
            name="actualVisitDate"
            label="Visited at"
            type="datetime-local"
            helperText="Leave empty to use the current time."
            slotProps={{ inputLabel: { shrink: true } }}
          />
        )}
      </form>
    </Modal>
  );
}
