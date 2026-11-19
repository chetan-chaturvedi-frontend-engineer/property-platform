import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useState } from 'react';

import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';

import { useChangeLegalStatus } from '../hooks/useProperties';
import { LEGAL_APPROVAL_STATUSES, type LegalApprovalStatus } from '../types/property.types';
import { LEGAL_STATUS_META } from '../utils/propertyDisplay';

import { REASON_MAX_LENGTH, type WorkflowTarget } from './WorkflowActionDialog';

interface LegalReviewDialogProps {
  target: WorkflowTarget;
  onClose: () => void;
}

/** `PATCH /admin/properties/{id}/legal-status` (PROPERTY_LEGAL_REVIEW). A rejection needs a reason. */
export function LegalReviewDialog({ target, onClose }: LegalReviewDialogProps) {
  const [status, setStatus] = useState<LegalApprovalStatus>(
    target.legalApprovalStatus === 'pending' ? 'approved' : target.legalApprovalStatus,
  );
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const mutation = useChangeLegalStatus();
  const reasonMissing = status === 'rejected' && !reason.trim();

  const confirm = () => {
    setTouched(true);
    if (reasonMissing || mutation.isPending) {
      return;
    }
    mutation.mutate(
      {
        id: target.id,
        version: target.version,
        body: { status, ...(reason.trim() ? { reason: reason.trim() } : {}) },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal
      open
      title={`Legal review: ${target.projectName}`}
      onClose={mutation.isPending ? () => undefined : onClose}
      maxWidth="xs"
      actions={
        <>
          <Button variant="text" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={confirm} loading={mutation.isPending}>
            Save decision
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 pt-1">
        <TextField
          select
          label="Legal approval status"
          value={status}
          onChange={(event) => setStatus(event.target.value as LegalApprovalStatus)}
        >
          {LEGAL_APPROVAL_STATUSES.map((value) => (
            <MenuItem key={value} value={value}>
              {LEGAL_STATUS_META[value].label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label={status === 'rejected' ? 'Reason (required)' : 'Note (optional)'}
          multiline
          minRows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          onBlur={() => setTouched(true)}
          error={touched && reasonMissing}
          helperText={
            touched && reasonMissing
              ? 'A reason is required to reject.'
              : `${reason.length} / ${REASON_MAX_LENGTH}`
          }
          slotProps={{ htmlInput: { maxLength: REASON_MAX_LENGTH } }}
        />
        {mutation.error && (
          <Alert severity="error" role="alert">
            {mutation.error.message}
          </Alert>
        )}
      </div>
    </Modal>
  );
}
