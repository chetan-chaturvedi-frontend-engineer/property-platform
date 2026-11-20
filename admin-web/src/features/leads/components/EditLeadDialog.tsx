import Skeleton from '@mui/material/Skeleton';

import { Button } from '@/components/common/Button';
import { ErrorState } from '@/components/common/Feedback/ErrorState';
import { Modal } from '@/components/common/Modal';
import type { EntityId } from '@/types/common.types';

import { useLead } from '../hooks/useLeads';

import { LeadFormDialog } from './LeadFormDialog';

interface EditLeadDialogProps {
  leadId: EntityId;
  onClose: () => void;
}

/** Loads the full lead (list rows carry a summary only), then opens the edit form. */
export function EditLeadDialog({ leadId, onClose }: EditLeadDialogProps) {
  const { data: lead, isPending, error, refetch } = useLead(leadId);

  if (lead) {
    return <LeadFormDialog open lead={lead} onClose={onClose} />;
  }

  return (
    <Modal
      open
      title="Edit lead"
      onClose={onClose}
      maxWidth="md"
      actions={
        <Button variant="text" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      {isPending ? (
        <div className="flex flex-col gap-3 pt-2" aria-busy aria-label="Loading lead">
          <Skeleton variant="rounded" height={48} />
          <Skeleton variant="rounded" height={48} />
          <Skeleton variant="rounded" height={48} />
        </div>
      ) : (
        <ErrorState
          message={
            error?.status === 404
              ? 'This lead does not exist or has been deleted.'
              : (error?.message ?? 'Could not load the lead.')
          }
          onRetry={error?.status === 404 ? undefined : () => void refetch()}
        />
      )}
    </Modal>
  );
}
