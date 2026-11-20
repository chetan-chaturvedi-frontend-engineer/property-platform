import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/common/Modal';
import { toApiError } from '@/services/api/apiError';
import { notify } from '@/store/notificationStore';
import type { EntityId } from '@/types/common.types';

import { useDeleteSiteVisit } from '../hooks/useSiteVisits';
import type { SiteVisitSummary } from '../types/siteVisit.types';

import { AssignSiteVisitDialog } from './AssignSiteVisitDialog';
import { RescheduleSiteVisitDialog } from './RescheduleSiteVisitDialog';
import { SiteVisitDetailsDrawer } from './SiteVisitDetailsDrawer';
import { SiteVisitFormDialog } from './SiteVisitFormDialog';
import { SiteVisitLoader } from './SiteVisitLoader';
import { SiteVisitReportDialog } from './SiteVisitReportDialog';
import { SiteVisitStatusDialog } from './SiteVisitStatusDialog';

/** The one dialog (or drawer) open on the page. */
export type ActiveDialog =
  | { kind: 'create' }
  | { kind: 'view'; id: EntityId }
  | { kind: 'edit'; id: EntityId }
  | { kind: 'report'; id: EntityId }
  | { kind: 'reschedule'; visit: SiteVisitSummary }
  | { kind: 'assign'; visit: SiteVisitSummary }
  | { kind: 'status'; visits: SiteVisitSummary[] }
  | { kind: 'delete'; visits: SiteVisitSummary[] };

interface SiteVisitDialogsProps {
  dialog: ActiveDialog | null;
  onChange: (dialog: ActiveDialog | null) => void;
  /** Edit is offered from the details drawer only when allowed. */
  canEdit?: boolean;
  /** Called with the ids that were changed or deleted by a bulk action. */
  onBulkDone?: (ids: number[]) => void;
  /** Called after visits were deleted, e.g. to step back from an emptied last page. */
  onDeleted?: (count: number) => void;
}

export function SiteVisitDialogs({
  dialog,
  onChange,
  canEdit = false,
  onBulkDone,
  onDeleted,
}: SiteVisitDialogsProps) {
  const close = () => onChange(null);
  if (!dialog) return null;

  switch (dialog.kind) {
    case 'create':
      return <SiteVisitFormDialog onClose={close} />;
    case 'view':
      return (
        <SiteVisitDetailsDrawer
          visitId={dialog.id}
          onClose={close}
          onEdit={canEdit ? (visit) => onChange({ kind: 'edit', id: visit.id }) : undefined}
        />
      );
    case 'edit':
      return (
        <SiteVisitLoader visitId={dialog.id} title="Edit site visit" onClose={close}>
          {(visit) => <SiteVisitFormDialog visit={visit} onClose={close} />}
        </SiteVisitLoader>
      );
    case 'report':
      return (
        <SiteVisitLoader visitId={dialog.id} title="Visit report" onClose={close}>
          {(visit) => <SiteVisitReportDialog visit={visit} onClose={close} />}
        </SiteVisitLoader>
      );
    case 'reschedule':
      return <RescheduleSiteVisitDialog visit={dialog.visit} onClose={close} />;
    case 'assign':
      return <AssignSiteVisitDialog visit={dialog.visit} onClose={close} />;
    case 'status':
      return <SiteVisitStatusDialog visits={dialog.visits} onClose={close} onDone={onBulkDone} />;
    case 'delete':
      return (
        <DeleteSiteVisitsDialog
          visits={dialog.visits}
          onClose={close}
          onDeleted={(ids) => {
            onDeleted?.(ids.length);
            if (dialog.visits.length > 1) onBulkDone?.(ids);
          }}
        />
      );
  }
}

interface DeleteSiteVisitsDialogProps {
  visits: readonly SiteVisitSummary[];
  onClose: () => void;
  onDeleted: (ids: number[]) => void;
}

/** Confirms and soft-deletes one or more visits (one request each; there is no bulk endpoint). */
function DeleteSiteVisitsDialog({ visits, onClose, onDeleted }: DeleteSiteVisitsDialogProps) {
  const isBulk = visits.length > 1;
  const remove = useDeleteSiteVisit({ quiet: isBulk });
  const [progress, setProgress] = useState<number | null>(null);
  const [visit] = visits;

  const confirm = async () => {
    if (progress !== null || remove.isPending) return;
    if (!isBulk) {
      if (!visit) return;
      remove.mutate(visit.id, {
        onSuccess: () => {
          onDeleted([visit.id]);
          onClose();
        },
      });
      return;
    }
    const deleted: number[] = [];
    const failures: string[] = [];
    setProgress(0);
    for (const [index, item] of visits.entries()) {
      try {
        await remove.mutateAsync(item.id);
        deleted.push(item.id);
      } catch (error) {
        failures.push(`${item.visitCode}: ${toApiError(error).message}`);
      }
      setProgress(((index + 1) / visits.length) * 100);
    }
    setProgress(null);
    notify(
      failures.length
        ? `${deleted.length} deleted, ${failures.length} failed. ${failures.slice(0, 3).join('; ')}`
        : `${deleted.length} site visits deleted.`,
      failures.length ? 'warning' : 'success',
    );
    onDeleted(deleted);
    onClose();
  };

  return (
    <ConfirmDialog
      open
      title={isBulk ? `Delete ${visits.length} site visits?` : 'Delete site visit?'}
      description={
        <span className="flex flex-col gap-3">
          <Typography component="span">
            {isBulk ? (
              <>The selected visits will be removed from every list.</>
            ) : (
              <>
                <strong>{visit?.visitCode}</strong> ({visit?.name}) will be removed from every list.
              </>
            )}{' '}
            This cannot be undone from the dashboard.
          </Typography>
          {progress !== null && (
            <LinearProgress variant="determinate" value={progress} aria-label="Deleting visits" />
          )}
        </span>
      }
      confirmLabel={isBulk ? `Delete ${visits.length} visits` : 'Delete visit'}
      destructive
      loading={remove.isPending || progress !== null}
      onConfirm={() => void confirm()}
      onCancel={onClose}
    />
  );
}
