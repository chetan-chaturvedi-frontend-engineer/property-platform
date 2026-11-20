import ArrowBack from '@mui/icons-material/ArrowBack';
import AssignmentIndOutlined from '@mui/icons-material/AssignmentIndOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import EditOutlined from '@mui/icons-material/EditOutlined';
import HighlightOffOutlined from '@mui/icons-material/HighlightOffOutlined';
import NavigateNext from '@mui/icons-material/NavigateNext';
import SyncAltOutlined from '@mui/icons-material/SyncAltOutlined';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/common/Button';
import { ErrorState } from '@/components/common/Feedback/ErrorState';
import { ConfirmDialog } from '@/components/common/Modal';
import { ROUTES } from '@/utils/constants';

import { AssignLeadDialog } from '../components/AssignLeadDialog';
import {
  LeadContactCard,
  LeadNotesCard,
  LeadPreferencesCard,
  LeadRecordCard,
  LeadRequirementsCard,
} from '../components/details/LeadDetailSections';
import { LeadProfileCard } from '../components/details/LeadProfileCard';
import { LeadFormDialog } from '../components/LeadFormDialog';
import { LeadStatusDialog } from '../components/LeadStatusDialog';
import { useLeadPermissions } from '../hooks/useLeadPermissions';
import { useDeleteLead, useLead, useLeadAmenities } from '../hooks/useLeads';
import type { LeadStatus } from '../types/lead.types';
import { parseLeadId } from '../utils/leadDisplay';

type OpenDialog =
  | { kind: 'edit' }
  | { kind: 'assign' }
  | { kind: 'status'; initialStatus?: LeadStatus }
  | { kind: 'delete' }
  | null;

export function LeadDetailsPage() {
  const params = useParams();
  const id = parseLeadId(params.id);
  const navigate = useNavigate();
  const permissions = useLeadPermissions();
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const { data: lead, isPending, error, refetch } = useLead(id);
  const amenities = useLeadAmenities({ enabled: permissions.canPickAmenities });
  const deleteLead = useDeleteLead();
  const amenityNames = useMemo(
    () => new Map((amenities.data ?? []).map((a) => [a.slug, a.name])),
    [amenities.data],
  );

  const canEdit = Boolean(lead && permissions.canEdit(lead));
  const canDelete = Boolean(lead && permissions.canDelete(lead));
  // A converted lead keeps its status (backend rule).
  const canChangeStatus = canEdit && lead?.status !== 'converted';

  const back = () => {
    // Back to the list keeps its filters (they live in its URL) when we came from there.
    if (window.history.length > 1) {
      void navigate(-1);
    } else {
      void navigate(ROUTES.leads);
    }
  };

  const confirmDelete = () => {
    if (!lead || deleteLead.isPending) return;
    deleteLead.mutate(lead.id, {
      onSuccess: () => void navigate(ROUTES.leads, { replace: true }),
    });
  };

  const header = (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <Typography variant="h1">Lead details</Typography>
        <Breadcrumbs
          aria-label="Breadcrumb"
          separator={<NavigateNext fontSize="small" />}
          className="mt-1"
        >
          <Link component={RouterLink} to={ROUTES.dashboard} underline="hover">
            Dashboard
          </Link>
          <Link component={RouterLink} to={ROUTES.leads} underline="hover">
            Leads
          </Link>
          <Typography color="text.secondary" aria-current="page" noWrap>
            {lead ? `LID-${lead.id}` : 'Lead'}
          </Typography>
        </Breadcrumbs>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outlined" startIcon={<ArrowBack />} onClick={back}>
          Back to list
        </Button>
        {canEdit && (
          <Button startIcon={<EditOutlined />} onClick={() => setDialog({ kind: 'edit' })}>
            Edit lead
          </Button>
        )}
      </div>
    </header>
  );

  if (id === null || error?.status === 404) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorState
          title="Lead not found"
          message="This lead does not exist or has been deleted."
        />
      </div>
    );
  }

  if (error && !lead) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      </div>
    );
  }

  if (isPending || !lead) {
    return (
      <div className="flex flex-col gap-6" aria-busy aria-label="Loading lead">
        {header}
        <Skeleton variant="rounded" height={200} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Skeleton variant="rounded" height={320} />
          <Skeleton variant="rounded" height={320} />
        </div>
      </div>
    );
  }

  const hasActions = canChangeStatus || permissions.canAssign || canDelete;

  return (
    <div className="flex flex-col gap-6">
      {header}
      <LeadProfileCard lead={lead} />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
          <LeadRequirementsCard lead={lead} />
          <LeadPreferencesCard lead={lead} amenityNames={amenityNames} />
          <div className="2xl:col-span-2">
            <LeadNotesCard lead={lead} />
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <LeadContactCard lead={lead} />
          <LeadRecordCard lead={lead} />
        </div>
      </div>

      {hasActions && (
        <Paper
          className="flex flex-col gap-2 p-3 sm:flex-row sm:flex-wrap"
          aria-label="Lead actions"
          component="section"
        >
          {canChangeStatus && (
            <Button
              variant="outlined"
              startIcon={<SyncAltOutlined />}
              onClick={() => setDialog({ kind: 'status' })}
            >
              Change status
            </Button>
          )}
          {permissions.canAssign && (
            <Button
              variant="outlined"
              startIcon={<AssignmentIndOutlined />}
              onClick={() => setDialog({ kind: 'assign' })}
            >
              {lead.assignedTo ? 'Reassign' : 'Assign'}
            </Button>
          )}
          {canChangeStatus && lead.status !== 'lost' && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<HighlightOffOutlined />}
              onClick={() => setDialog({ kind: 'status', initialStatus: 'lost' })}
            >
              Mark as lost
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteOutline />}
              onClick={() => setDialog({ kind: 'delete' })}
              className="sm:ml-auto"
            >
              Delete lead
            </Button>
          )}
        </Paper>
      )}

      {dialog?.kind === 'edit' && (
        <LeadFormDialog open lead={lead} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'assign' && (
        <AssignLeadDialog lead={lead} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'status' && (
        <LeadStatusDialog
          lead={lead}
          initialStatus={dialog.initialStatus}
          onClose={() => setDialog(null)}
        />
      )}
      <ConfirmDialog
        open={dialog?.kind === 'delete'}
        title="Delete lead?"
        description={
          <Typography component="span">
            <strong>{lead.leadName}</strong> (LID-{lead.id}, {lead.phone}) will be removed from
            every list. Its schedules and interactions are kept with it.
          </Typography>
        }
        confirmLabel="Delete lead"
        destructive
        loading={deleteLead.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}
