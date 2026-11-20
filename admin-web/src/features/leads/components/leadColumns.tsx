import AssignmentIndOutlined from '@mui/icons-material/AssignmentIndOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import EditOutlined from '@mui/icons-material/EditOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';

import type { DataTableColumn } from '@/components/common/DataTable/DataTable';
import { formatDateTime } from '@/utils/formatters';
import { getInitials } from '@/utils/helpers';

import type { LeadSortField, LeadSummary } from '../types/lead.types';
import {
  bhkLabel,
  formatBudget,
  LEAD_PROPERTY_TYPE_LABELS,
  LEAD_PURPOSE_LABELS,
  LEAD_SOURCE_LABELS,
  userName,
} from '../utils/leadDisplay';

import { LeadRowAction } from './LeadRowAction';
import { LeadPriorityChip, LeadStatusChip } from './LeadStatusChip';

export interface LeadRowActions {
  onView?: (lead: LeadSummary) => void;
  onEdit?: (lead: LeadSummary) => void;
  onAssign?: (lead: LeadSummary) => void;
  onDelete?: (lead: LeadSummary) => void;
  /** Row-level checks (e.g. own leads only); every row by default. */
  canEdit?: (lead: LeadSummary) => boolean;
  canDelete?: (lead: LeadSummary) => boolean;
}

type LeadColumn = DataTableColumn<LeadSummary> & { sortField?: LeadSortField };

function requirement(lead: LeadSummary): string {
  const parts = [
    lead.bhk ? bhkLabel(lead.bhk) : null,
    lead.propertyType ? LEAD_PROPERTY_TYPE_LABELS[lead.propertyType] : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' ') : LEAD_PURPOSE_LABELS[lead.purpose];
}

/** Only the actions the viewer is permitted to use are passed in, so only those are rendered. */
export function buildLeadColumns({
  onView,
  onEdit,
  onAssign,
  onDelete,
  canEdit = () => true,
  canDelete = () => true,
}: LeadRowActions): LeadColumn[] {
  const columns: LeadColumn[] = [
    {
      id: 'lead',
      header: 'Lead',
      sortField: 'leadName',
      cell: (lead) => (
        <div className="flex min-w-44 items-center gap-3">
          <Avatar
            aria-hidden
            className="bg-primary-100 text-sm font-semibold text-primary-800 dark:bg-primary-500/15 dark:text-primary-300"
            sx={{ width: 36, height: 36 }}
          >
            {getInitials(lead.leadName)}
          </Avatar>
          <div className="min-w-0">
            <Typography variant="body2" fontWeight={600} noWrap>
              {lead.leadName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              LID-{lead.id}
            </Typography>
          </div>
        </div>
      ),
    },
    {
      id: 'contact',
      header: 'Contact',
      cell: (lead) => (
        <div className="min-w-0">
          <Typography variant="body2" className="whitespace-nowrap">
            {lead.phone}
          </Typography>
          <Typography variant="caption" color="text.secondary" className="break-all">
            {lead.email ?? 'No email'}
          </Typography>
        </div>
      ),
    },
    {
      id: 'source',
      header: 'Source',
      cell: (lead) => (
        <span className="inline-flex rounded-md bg-primary-50 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-primary-800 dark:bg-primary-500/15 dark:text-primary-300">
          {LEAD_SOURCE_LABELS[lead.source]}
        </span>
      ),
    },
    {
      id: 'requirement',
      header: 'Interested in',
      cell: (lead) => (
        <div className="min-w-36">
          <Typography variant="body2" noWrap>
            {requirement(lead)}
          </Typography>
          <Typography variant="caption" color="text.secondary" className="line-clamp-1">
            {lead.preferredLocation ?? `To ${LEAD_PURPOSE_LABELS[lead.purpose].toLowerCase()}`}
          </Typography>
        </div>
      ),
    },
    {
      id: 'budget',
      header: 'Budget',
      sortField: 'budgetMax',
      cell: (lead) => (
        <span className="whitespace-nowrap">
          {formatBudget(lead.budgetMin, lead.budgetMax, lead.budgetCurrency)}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sortField: 'status',
      cell: (lead) => <LeadStatusChip status={lead.status} />,
    },
    {
      id: 'priority',
      header: 'Priority',
      cell: (lead) => <LeadPriorityChip priority={lead.priority} />,
    },
    {
      id: 'assignedTo',
      header: 'Assigned to',
      cell: (lead) => (
        <span className={lead.assignedTo ? 'whitespace-nowrap' : 'text-muted whitespace-nowrap'}>
          {userName(lead.assignedTo, 'Unassigned')}
        </span>
      ),
    },
    {
      id: 'nextFollowUpAt',
      header: 'Next follow-up',
      sortField: 'nextFollowUpAt',
      cell: (lead) => (
        <span className="whitespace-nowrap">{formatDateTime(lead.nextFollowUpAt)}</span>
      ),
    },
    {
      id: 'createdAt',
      header: 'Created',
      sortField: 'createdAt',
      cell: (lead) => <span className="whitespace-nowrap">{formatDateTime(lead.createdAt)}</span>,
    },
  ];

  if (onView || onEdit || onAssign || onDelete) {
    columns.push({
      id: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (lead) => (
        <div className="flex justify-end gap-0.5">
          {onView && (
            <LeadRowAction label={`View ${lead.leadName}`} onClick={() => onView(lead)}>
              <VisibilityOutlined fontSize="small" />
            </LeadRowAction>
          )}
          {onEdit && canEdit(lead) && (
            <LeadRowAction label={`Edit ${lead.leadName}`} onClick={() => onEdit(lead)}>
              <EditOutlined fontSize="small" />
            </LeadRowAction>
          )}
          {onAssign && (
            <LeadRowAction label={`Assign ${lead.leadName}`} onClick={() => onAssign(lead)}>
              <AssignmentIndOutlined fontSize="small" />
            </LeadRowAction>
          )}
          {onDelete && canDelete(lead) && (
            <LeadRowAction
              label={`Delete ${lead.leadName}`}
              color="error"
              onClick={() => onDelete(lead)}
            >
              <DeleteOutline fontSize="small" />
            </LeadRowAction>
          )}
        </div>
      ),
    });
  }
  return columns;
}
