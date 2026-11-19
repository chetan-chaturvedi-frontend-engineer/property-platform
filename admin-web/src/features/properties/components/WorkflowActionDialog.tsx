import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import type { EntityId } from '@/types/common.types';

import {
  useChangePropertyStatus,
  usePublishProperty,
  useSubmitProperty,
} from '../hooks/useProperties';
import type { LegalApprovalStatus, PublicationAction } from '../types/property.types';
import { ACTION_META, ACTIONS_NEEDING_REASON, LEGAL_STATUS_META } from '../utils/propertyDisplay';

export const REASON_MAX_LENGTH = 1000;

export interface WorkflowTarget {
  id: EntityId;
  version: number;
  projectName: string;
  legalApprovalStatus: LegalApprovalStatus;
}

interface WorkflowActionDialogProps {
  target: WorkflowTarget;
  action: PublicationAction;
  onClose: () => void;
}

/**
 * Confirms one publication workflow action. Submit and publish use their own endpoints; the others go
 * through `PATCH /status`. The backend decides whether the transition is allowed (409 otherwise) and
 * whether the property is complete (422), and the dialog shows its answer.
 */
export function WorkflowActionDialog({ target, action, onClose }: WorkflowActionDialogProps) {
  const meta = ACTION_META[action];
  const needsReason = ACTIONS_NEEDING_REASON.includes(action);
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const submit = useSubmitProperty();
  const publish = usePublishProperty();
  const changeStatus = useChangePropertyStatus();
  const mutation = action === 'submit' ? submit : action === 'publish' ? publish : changeStatus;
  const reasonMissing = needsReason && !reason.trim();

  const confirm = () => {
    setTouched(true);
    if (reasonMissing || mutation.isPending) {
      return;
    }
    const write = { id: target.id, version: target.version };
    const options = { onSuccess: onClose };
    if (action === 'submit') {
      submit.mutate(write, options);
    } else if (action === 'publish') {
      publish.mutate(write, options);
    } else {
      changeStatus.mutate(
        { ...write, body: { action, ...(reason.trim() ? { reason: reason.trim() } : {}) } },
        options,
      );
    }
  };

  const legalNotApproved =
    action === 'publish' &&
    target.legalApprovalStatus !== 'approved' &&
    target.legalApprovalStatus !== 'not_applicable';

  return (
    <Modal
      open
      title={`${meta.label}: ${target.projectName}`}
      onClose={mutation.isPending ? () => undefined : onClose}
      maxWidth="xs"
      actions={
        <>
          <Button variant="text" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            color={meta.destructive ? 'error' : 'primary'}
            onClick={confirm}
            loading={mutation.isPending}
          >
            {meta.label}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Typography variant="body2">{meta.description}</Typography>
        {legalNotApproved && (
          <Alert severity="warning">
            Legal review status is “{LEGAL_STATUS_META[target.legalApprovalStatus].label}”. Make
            sure the legal checks are done before the listing goes live.
          </Alert>
        )}
        {(needsReason || action === 'approve' || action === 'archive') && (
          <TextField
            label={needsReason ? 'Reason (shown to the owner)' : 'Note (optional)'}
            multiline
            minRows={3}
            required={needsReason}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            onBlur={() => setTouched(true)}
            error={touched && reasonMissing}
            helperText={
              touched && reasonMissing
                ? 'A reason is required.'
                : `${reason.length} / ${REASON_MAX_LENGTH}`
            }
            slotProps={{ htmlInput: { maxLength: REASON_MAX_LENGTH } }}
          />
        )}
        {mutation.error && (
          <Alert severity="error" role="alert">
            {mutation.error.message}
          </Alert>
        )}
      </div>
    </Modal>
  );
}
