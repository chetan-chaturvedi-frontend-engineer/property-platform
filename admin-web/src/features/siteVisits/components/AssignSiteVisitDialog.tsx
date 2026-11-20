import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { toApiError } from '@/services/api/apiError';

import { useAssignSiteVisit } from '../hooks/useSiteVisits';
import type { PickerOption, SiteVisitSummary } from '../types/siteVisit.types';
import { userName } from '../utils/siteVisitDisplay';

import { UserPicker } from './Pickers';

interface AssignSiteVisitDialogProps {
  visit: Pick<SiteVisitSummary, 'id' | 'visitCode' | 'assignee'>;
  onClose: () => void;
}

/** Sets, changes or clears a visit's agent. Mounted only while open. */
export function AssignSiteVisitDialog({ visit, onClose }: AssignSiteVisitDialogProps) {
  const assign = useAssignSiteVisit();
  const current = visit.assignee
    ? { id: visit.assignee.id, label: userName(visit.assignee) }
    : null;
  const [agent, setAgent] = useState<PickerOption | null>(current);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const unchanged = (agent?.id ?? null) === (current?.id ?? null);

  const save = (assignId: number | null) => {
    if (assign.isPending) return;
    setFieldError(null);
    setFormError(null);
    assign.mutate(
      { id: visit.id, assignId },
      {
        onSuccess: onClose,
        onError: (error) => {
          const apiError = toApiError(error);
          if (apiError.fieldErrors.assignId) setFieldError(apiError.fieldErrors.assignId);
          else setFormError(apiError.message);
        },
      },
    );
  };

  return (
    <Modal
      open
      title={`${current ? 'Reassign' : 'Assign'} agent for ${visit.visitCode}`}
      onClose={assign.isPending ? () => undefined : onClose}
      maxWidth="xs"
      actions={
        <>
          {current && (
            <Button
              variant="text"
              color="error"
              onClick={() => save(null)}
              disabled={assign.isPending}
              className="mr-auto"
            >
              Unassign
            </Button>
          )}
          <Button variant="text" onClick={onClose} disabled={assign.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => agent && save(agent.id)}
            loading={assign.isPending}
            disabled={!agent || unchanged}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 pt-2">
        {formError && <Alert severity="error">{formError}</Alert>}
        <Typography variant="body2" color="text.secondary">
          Currently {current ? `assigned to ${current.label}` : 'unassigned'}. The agent must be an
          active user who can work on site visits (the builder, an admin, or a field agent).
        </Typography>
        <UserPicker
          label="Agent"
          size="medium"
          value={agent}
          onChange={(value) => setAgent(value)}
          error={Boolean(fieldError)}
          helperText={fieldError ?? undefined}
        />
      </div>
    </Modal>
  );
}
