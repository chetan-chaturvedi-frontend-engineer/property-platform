import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { toApiError } from '@/services/api/apiError';

import { useUpdateSiteVisit } from '../hooks/useSiteVisits';
import type { SiteVisitSummary } from '../types/siteVisit.types';
import {
  addDays,
  formatVisitDate,
  formatVisitTime,
  MAX_ADVANCE_DAYS,
  propertyNow,
  scheduleError,
  shortTime,
  SITE_VISIT_TIME_ZONE,
} from '../utils/siteVisitDisplay';

interface RescheduleSiteVisitDialogProps {
  visit: Pick<SiteVisitSummary, 'id' | 'visitCode' | 'name' | 'visitDate' | 'visitTime'>;
  onClose: () => void;
}

/** Moves an upcoming visit to a new slot; the backend then marks it rescheduled. */
export function RescheduleSiteVisitDialog({ visit, onClose }: RescheduleSiteVisitDialogProps) {
  const update = useUpdateSiteVisit({ successMessage: 'Site visit rescheduled.' });
  const [date, setDate] = useState(visit.visitDate);
  const [time, setTime] = useState(shortTime(visit.visitTime));
  const [touched, setTouched] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const unchanged = date === visit.visitDate && time === shortTime(visit.visitTime);
  const localError = date && time && !unchanged ? scheduleError(date, time) : null;
  const today = propertyNow().date;

  const fieldError = (field: 'visitDate' | 'visitTime') =>
    (touched && localError?.field === field ? localError.message : null) ?? serverErrors[field];

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (update.isPending || unchanged || localError || !date || !time) return;
    setServerErrors({});
    setFormError(null);
    const request = {
      ...(date !== visit.visitDate ? { visitDate: date } : {}),
      ...(time !== shortTime(visit.visitTime) ? { visitTime: time } : {}),
    };
    update.mutate(
      { id: visit.id, request },
      {
        onSuccess: onClose,
        onError: (error) => {
          const apiError = toApiError(error);
          const { visitDate, visitTime } = apiError.fieldErrors;
          setServerErrors({
            ...(visitDate ? { visitDate } : {}),
            ...(visitTime ? { visitTime } : {}),
          });
          if (!visitDate && !visitTime) setFormError(apiError.message);
        },
      },
    );
  };

  return (
    <Modal
      open
      title={`Reschedule ${visit.visitCode}`}
      onClose={update.isPending ? () => undefined : onClose}
      maxWidth="xs"
      actions={
        <>
          <Button variant="text" onClick={onClose} disabled={update.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="reschedule-site-visit-form"
            loading={update.isPending}
            disabled={unchanged}
          >
            Reschedule
          </Button>
        </>
      }
    >
      <form
        id="reschedule-site-visit-form"
        onSubmit={handleSubmit}
        noValidate
        aria-label="Reschedule visit"
        className="flex flex-col gap-4 pt-2"
      >
        {formError && <Alert severity="error">{formError}</Alert>}
        <Typography variant="body2" color="text.secondary">
          {visit.name}&apos;s visit is on {formatVisitDate(visit.visitDate)} at{' '}
          {formatVisitTime(visit.visitTime)}. Times are local to the property (
          {SITE_VISIT_TIME_ZONE}).
        </Typography>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="New date"
            type="date"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
            error={Boolean(fieldError('visitDate'))}
            helperText={fieldError('visitDate')}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { min: today, max: addDays(today, MAX_ADVANCE_DAYS) },
            }}
          />
          <TextField
            label="New time"
            type="time"
            required
            value={time}
            onChange={(event) => setTime(event.target.value)}
            error={Boolean(fieldError('visitTime'))}
            helperText={fieldError('visitTime')}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 300 } }}
          />
        </div>
      </form>
    </Modal>
  );
}
