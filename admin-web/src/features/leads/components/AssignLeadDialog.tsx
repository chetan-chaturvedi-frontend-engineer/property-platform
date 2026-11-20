import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { toApiError } from '@/services/api/apiError';

import { useAssignLead } from '../hooks/useLeads';
import type { AssigneeValue, LeadSummary } from '../types/lead.types';
import { userName } from '../utils/leadDisplay';

import { AssigneeAutocomplete } from './AssigneeAutocomplete';

interface AssignLeadDialogProps {
  lead: Pick<LeadSummary, 'id' | 'leadName' | 'assignedTo'>;
  onClose: () => void;
}

/** Sets, changes or clears a lead's assignee. Mounted only while open. */
export function AssignLeadDialog({ lead, onClose }: AssignLeadDialogProps) {
  const assignLead = useAssignLead();
  const current = lead.assignedTo
    ? { id: lead.assignedTo.id, fullName: userName(lead.assignedTo) }
    : null;
  const [assignee, setAssignee] = useState<AssigneeValue | null>(current);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const unchanged = (assignee?.id ?? null) === (current?.id ?? null);

  const save = (assignedTo: number | null) => {
    if (assignLead.isPending) return;
    setFieldError(null);
    setFormError(null);
    assignLead.mutate(
      { id: lead.id, assignedTo },
      {
        onSuccess: onClose,
        onError: (error) => {
          const apiError = toApiError(error);
          if (apiError.fieldErrors.assignedTo) {
            setFieldError(apiError.fieldErrors.assignedTo);
          } else {
            setFormError(apiError.message);
          }
        },
      },
    );
  };

  return (
    <Modal
      open
      title={`Assign ${lead.leadName}`}
      onClose={assignLead.isPending ? () => undefined : onClose}
      maxWidth="xs"
      actions={
        <>
          {current && (
            <Button
              variant="text"
              color="error"
              onClick={() => save(null)}
              disabled={assignLead.isPending}
              className="mr-auto"
            >
              Unassign
            </Button>
          )}
          <Button variant="text" onClick={onClose} disabled={assignLead.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => assignee && save(assignee.id)}
            loading={assignLead.isPending}
            disabled={!assignee || unchanged}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 pt-2">
        {formError && <Alert severity="error">{formError}</Alert>}
        <Typography variant="body2" color="text.secondary">
          Currently {current ? `assigned to ${current.fullName}` : 'unassigned'}. The assignee must
          be an active user whose role can work on leads.
        </Typography>
        <AssigneeAutocomplete
          value={assignee}
          onChange={setAssignee}
          label="Assign to"
          size="medium"
          error={Boolean(fieldError)}
          helperText={fieldError ?? undefined}
        />
      </div>
    </Modal>
  );
}
