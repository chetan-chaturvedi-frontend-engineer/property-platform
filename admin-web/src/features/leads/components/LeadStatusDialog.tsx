import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/common/Button';
import { FormTextField } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { applyServerErrors } from '@/utils/helpers';

import { useUpdateLead } from '../hooks/useLeads';
import { LEAD_LIMITS, type LeadStatusValues, leadStatusSchema } from '../schemas/leadSchema';
import { LEAD_STATUSES, type LeadStatus, type LeadSummary } from '../types/lead.types';
import { LEAD_STATUS_META } from '../utils/leadDisplay';

const resolver = zodResolver(leadStatusSchema);

interface LeadStatusDialogProps {
  lead: Pick<LeadSummary, 'id' | 'leadName' | 'status'>;
  /** Preselected status, e.g. `lost` for "Mark as lost". */
  initialStatus?: LeadStatus;
  onClose: () => void;
}

/** Moves a lead along the pipeline; a lost lead needs a reason. Mounted only while open. */
export function LeadStatusDialog({ lead, initialStatus, onClose }: LeadStatusDialogProps) {
  const updateLead = useUpdateLead({ successMessage: 'Status updated.' });
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError } = useForm<LeadStatusValues>({
    resolver,
    defaultValues: { status: initialStatus ?? lead.status, lostReason: '' },
  });
  const status = useWatch({ control, name: 'status' });

  const onSubmit = handleSubmit(async (values) => {
    if (updateLead.isPending) return;
    setFormError(null);
    try {
      await updateLead.mutateAsync({
        id: lead.id,
        request: {
          status: values.status,
          ...(values.status === 'lost' ? { lostReason: values.lostReason } : {}),
        },
      });
      onClose();
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['status', 'lostReason']));
    }
  });

  return (
    <Modal
      open
      title={`Change status of ${lead.leadName}`}
      onClose={updateLead.isPending ? () => undefined : onClose}
      maxWidth="xs"
      actions={
        <>
          <Button variant="text" onClick={onClose} disabled={updateLead.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="lead-status-form"
            color={status === 'lost' ? 'error' : 'primary'}
            loading={updateLead.isPending}
            disabled={status === lead.status && status !== 'lost'}
          >
            {status === 'lost' ? 'Mark as lost' : 'Save status'}
          </Button>
        </>
      }
    >
      <form
        id="lead-status-form"
        onSubmit={onSubmit}
        noValidate
        aria-label="Change status"
        className="flex flex-col gap-4 pt-2"
      >
        {formError && <Alert severity="error">{formError}</Alert>}
        <FormTextField control={control} name="status" label="Status" select required>
          {LEAD_STATUSES.map((value) => (
            <MenuItem key={value} value={value}>
              {LEAD_STATUS_META[value].label}
            </MenuItem>
          ))}
        </FormTextField>
        {status === 'converted' && status !== lead.status && (
          <Alert severity="info">
            A converted lead keeps this status; it cannot be changed later.
          </Alert>
        )}
        {status === 'lost' && (
          <FormTextField
            control={control}
            name="lostReason"
            label="Lost reason"
            required
            multiline
            minRows={3}
            slotProps={{ htmlInput: { maxLength: LEAD_LIMITS.lostReason } }}
          />
        )}
      </form>
    </Modal>
  );
}
