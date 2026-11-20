import ApartmentOutlined from '@mui/icons-material/ApartmentOutlined';
import AssignmentIndOutlined from '@mui/icons-material/AssignmentIndOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import EditCalendarOutlined from '@mui/icons-material/EditCalendarOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import RateReviewOutlined from '@mui/icons-material/RateReviewOutlined';
import SyncAltOutlined from '@mui/icons-material/SyncAltOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';

import type { DataTableColumn } from '@/components/common/DataTable/DataTable';
import { getInitials } from '@/utils/helpers';

import type { SiteVisitSortField, SiteVisitSummary } from '../types/siteVisit.types';
import {
  canBeAssigned,
  formatVisitDate,
  formatVisitTime,
  isUpcoming,
  propertyPlace,
  userName,
} from '../utils/siteVisitDisplay';

import { type RowMenuAction, SiteVisitRowMenu } from './SiteVisitRowMenu';
import { SiteVisitStatusChip, SiteVisitTypeChip } from './SiteVisitStatusChip';

/** Handlers for the row menu; only the actions the viewer is permitted to use are passed in. */
export interface SiteVisitRowActions {
  onView?: (visit: SiteVisitSummary) => void;
  onEdit?: (visit: SiteVisitSummary) => void;
  onReschedule?: (visit: SiteVisitSummary) => void;
  onChangeStatus?: (visit: SiteVisitSummary) => void;
  onAssign?: (visit: SiteVisitSummary) => void;
  onReport?: (visit: SiteVisitSummary) => void;
  onDelete?: (visit: SiteVisitSummary) => void;
}

type SiteVisitColumn = DataTableColumn<SiteVisitSummary> & { sortField?: SiteVisitSortField };

const avatarClass =
  'bg-primary-100 text-xs font-semibold text-primary-800 dark:bg-primary-500/15 dark:text-primary-300';

/** The menu entries that apply to this visit's state (e.g. only upcoming visits can be moved). */
export function rowActions(
  visit: SiteVisitSummary,
  handlers: SiteVisitRowActions,
): RowMenuAction[] {
  const upcoming = isUpcoming(visit.status);
  const actions: Array<RowMenuAction | false | undefined> = [
    handlers.onView && {
      key: 'view',
      label: 'View details',
      icon: <VisibilityOutlined fontSize="small" />,
      onSelect: () => handlers.onView?.(visit),
    },
    handlers.onEdit && {
      key: 'edit',
      label: upcoming ? 'Edit' : 'Edit follow-up',
      icon: <EditOutlined fontSize="small" />,
      onSelect: () => handlers.onEdit?.(visit),
    },
    upcoming &&
      handlers.onReschedule && {
        key: 'reschedule',
        label: 'Reschedule',
        icon: <EditCalendarOutlined fontSize="small" />,
        onSelect: () => handlers.onReschedule?.(visit),
      },
    upcoming &&
      handlers.onChangeStatus && {
        key: 'status',
        label: 'Change status',
        icon: <SyncAltOutlined fontSize="small" />,
        onSelect: () => handlers.onChangeStatus?.(visit),
      },
    canBeAssigned(visit.status) &&
      handlers.onAssign && {
        key: 'assign',
        label: visit.assignee ? 'Reassign agent' : 'Assign agent',
        icon: <AssignmentIndOutlined fontSize="small" />,
        onSelect: () => handlers.onAssign?.(visit),
      },
    visit.status === 'completed' &&
      handlers.onReport && {
        key: 'report',
        label: visit.interest ? 'Update visit report' : 'Submit visit report',
        icon: <RateReviewOutlined fontSize="small" />,
        onSelect: () => handlers.onReport?.(visit),
      },
    handlers.onDelete && {
      key: 'delete',
      label: 'Delete',
      icon: <DeleteOutline fontSize="small" />,
      tone: 'danger',
      onSelect: () => handlers.onDelete?.(visit),
    },
  ];
  return actions.filter((action): action is RowMenuAction => Boolean(action));
}

/** Columns of the reference design. Only API-sortable columns get a sort toggle. */
export function buildSiteVisitColumns(handlers: SiteVisitRowActions): SiteVisitColumn[] {
  return [
    {
      id: 'visitCode',
      header: 'Visit ID',
      cell: (visit) => (
        <Typography variant="body2" fontWeight={600} className="whitespace-nowrap">
          {visit.visitCode}
        </Typography>
      ),
    },
    {
      id: 'visitor',
      header: 'Lead name',
      cell: (visit) => (
        <div className="flex min-w-44 items-center gap-3">
          <Avatar aria-hidden className={avatarClass} sx={{ width: 34, height: 34 }}>
            {getInitials(visit.name)}
          </Avatar>
          <div className="min-w-0">
            <Typography variant="body2" fontWeight={600} noWrap>
              {visit.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" className="whitespace-nowrap">
              {visit.mobile}
            </Typography>
          </div>
        </div>
      ),
    },
    {
      id: 'property',
      header: 'Property',
      cell: (visit) => (
        <div className="flex min-w-44 items-center gap-3">
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300"
          >
            <ApartmentOutlined fontSize="small" />
          </span>
          <div className="min-w-0">
            <Typography variant="body2" fontWeight={600} noWrap>
              {visit.property.projectName ?? 'Deleted property'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap component="p">
              {propertyPlace(visit.property) ?? '—'}
            </Typography>
          </div>
        </div>
      ),
    },
    {
      id: 'visitDate',
      header: 'Visit date & time',
      sortField: 'visitDate',
      cell: (visit) => (
        <div className="whitespace-nowrap">
          <Typography variant="body2">{formatVisitDate(visit.visitDate)}</Typography>
          <Typography variant="caption" color="text.secondary">
            {formatVisitTime(visit.visitTime)}
          </Typography>
        </div>
      ),
    },
    {
      id: 'agent',
      header: 'Agent',
      cell: (visit) =>
        visit.assignee ? (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <Avatar aria-hidden className={avatarClass} sx={{ width: 28, height: 28 }}>
              {getInitials(userName(visit.assignee))}
            </Avatar>
            <Typography variant="body2">{userName(visit.assignee)}</Typography>
          </div>
        ) : (
          <span className="text-muted whitespace-nowrap">Unassigned</span>
        ),
    },
    {
      id: 'status',
      header: 'Status',
      sortField: 'status',
      cell: (visit) => <SiteVisitStatusChip status={visit.status} />,
    },
    {
      id: 'visitType',
      header: 'Type',
      cell: (visit) => <SiteVisitTypeChip visitType={visit.visitType} />,
    },
    {
      id: 'actions',
      header: 'Action',
      align: 'right',
      cell: (visit) => (
        <SiteVisitRowMenu
          label={`Actions for ${visit.visitCode}`}
          actions={rowActions(visit, handlers)}
        />
      ),
    },
  ];
}
