import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import EditOutlined from '@mui/icons-material/EditOutlined';
import HighlightOff from '@mui/icons-material/HighlightOff';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import PublicOutlined from '@mui/icons-material/PublicOutlined';
import RestoreFromTrash from '@mui/icons-material/RestoreFromTrash';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import type { DataTableColumn } from '@/components/common/DataTable/DataTable';
import { formatDateTime } from '@/utils/formatters';

import type {
  PropertySortField,
  PropertySummary,
  PublicationAction,
} from '../types/property.types';
import {
  APARTMENT_TYPE_LABELS,
  formatDate,
  formatPlace,
  formatPrice,
  isEditable,
  PROPERTY_TYPE_LABELS,
} from '../utils/propertyDisplay';

import { LegalStatusChip, PublicationStatusChip } from './PropertyStatusChips';
import { PropertyThumbnail } from './PropertyThumbnail';
import { RowActionButton as ActionButton } from './RowActionButton';

export interface PropertyRowActions {
  onView?: (property: PropertySummary) => void;
  onEdit?: (property: PropertySummary) => void;
  onDelete?: (property: PropertySummary) => void;
  onRestore?: (property: PropertySummary) => void;
  /** Quick workflow actions; only those the viewer may perform are passed in. */
  onAction?: (property: PropertySummary, action: PublicationAction) => void;
  availableActions?: (property: PropertySummary) => PublicationAction[];
}

type PropertyColumn = DataTableColumn<PropertySummary> & { sortField?: PropertySortField };

/** Actions shown as row buttons in the list; the rest live on the details page. */
const QUICK_ACTIONS: ReadonlyArray<{
  action: PublicationAction;
  label: string;
  icon: ReactNode;
  color: 'success' | 'error' | 'primary';
}> = [
  {
    action: 'approve',
    label: 'Approve',
    icon: <CheckCircleOutline fontSize="small" />,
    color: 'success',
  },
  { action: 'reject', label: 'Reject', icon: <HighlightOff fontSize="small" />, color: 'error' },
  {
    action: 'publish',
    label: 'Publish',
    icon: <PublicOutlined fontSize="small" />,
    color: 'primary',
  },
];

export function buildPropertyColumns({
  onView,
  onEdit,
  onDelete,
  onRestore,
  onAction,
  availableActions = () => [],
}: PropertyRowActions): PropertyColumn[] {
  const columns: PropertyColumn[] = [
    {
      id: 'property',
      header: 'Property',
      sortField: 'projectName',
      cell: (p) => (
        <div className="flex min-w-64 items-center gap-3">
          <PropertyThumbnail url={p.coverUrl} alt={p.projectName} className="h-14 w-20 shrink-0" />
          <div className="min-w-0">
            <Typography variant="body2" fontWeight={600} className="line-clamp-2">
              {p.projectName}
            </Typography>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="rounded bg-primary-50 px-1.5 py-0.5 text-xs font-semibold text-primary-800 dark:bg-primary-500/15 dark:text-primary-300">
                {PROPERTY_TYPE_LABELS[p.propertyType]}
              </span>
              <Typography variant="caption" color="text.secondary">
                ID {p.id}
              </Typography>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'builder',
      header: 'Builder',
      cell: (p) => (
        <Typography variant="body2" className="min-w-32">
          {p.builderCompanyName}
        </Typography>
      ),
    },
    {
      id: 'location',
      header: 'Location',
      sortField: 'city',
      cell: (p) => (
        <div className="flex min-w-36 items-start gap-1">
          <LocationOnOutlined fontSize="small" className="mt-0.5 text-muted" aria-hidden />
          <div>
            <Typography variant="body2">{formatPlace([p.locality, p.city])}</Typography>
            {p.state && (
              <Typography variant="caption" color="text.secondary">
                {p.state}
              </Typography>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'price',
      header: 'Starting price',
      cell: (p) => (
        <div className="min-w-28">
          <Typography variant="body2" fontWeight={600}>
            {formatPrice(p.startingPrice)}
          </Typography>
          {p.apartmentTypes && p.apartmentTypes.length > 0 && (
            <Typography variant="caption" color="text.secondary">
              {p.apartmentTypes.map((type) => APARTMENT_TYPE_LABELS[type]).join(', ')}
            </Typography>
          )}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (p) => (
        <div className="flex min-w-32 flex-col items-start gap-1">
          <PublicationStatusChip status={p.publicationStatus} />
          <LegalStatusChip status={p.legalApprovalStatus} />
          {p.deletedAt && (
            <Typography variant="caption" color="error">
              Deleted {formatDate(p.deletedAt)}
            </Typography>
          )}
        </div>
      ),
    },
    {
      id: 'createdAt',
      header: 'Created',
      sortField: 'createdAt',
      cell: (p) => (
        <span title={formatDateTime(p.createdAt)} className="whitespace-nowrap">
          {formatDate(p.createdAt)}
        </span>
      ),
    },
    {
      id: 'updatedAt',
      header: 'Updated',
      sortField: 'updatedAt',
      cell: (p) => <span className="whitespace-nowrap">{formatDateTime(p.updatedAt)}</span>,
    },
  ];

  if (onView || onEdit || onDelete || onRestore || onAction) {
    columns.push({
      id: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (p) => {
        if (p.deletedAt) {
          return onRestore ? (
            <div className="flex justify-end">
              <ActionButton label={`Restore ${p.projectName}`} onClick={() => onRestore(p)}>
                <RestoreFromTrash fontSize="small" />
              </ActionButton>
            </div>
          ) : null;
        }
        const quick = onAction
          ? QUICK_ACTIONS.filter(({ action }) => availableActions(p).includes(action))
          : [];
        const isDraft = p.publicationStatus === 'draft' && p.wizardStep < 7;
        return (
          <div className="flex justify-end gap-0.5">
            {onView && (
              <ActionButton label={`View ${p.projectName}`} onClick={() => onView(p)}>
                <VisibilityOutlined fontSize="small" />
              </ActionButton>
            )}
            {quick.map(({ action, label, icon, color }) => (
              <ActionButton
                key={action}
                label={`${label} ${p.projectName}`}
                color={color}
                onClick={() => onAction?.(p, action)}
              >
                {icon}
              </ActionButton>
            ))}
            {onEdit && isEditable(p.publicationStatus) && (
              <ActionButton
                label={`${isDraft ? 'Continue draft' : 'Edit'} ${p.projectName}`}
                onClick={() => onEdit(p)}
              >
                <EditOutlined fontSize="small" />
              </ActionButton>
            )}
            {onDelete && (
              <ActionButton
                label={`Delete ${p.projectName}`}
                color="error"
                onClick={() => onDelete(p)}
              >
                <DeleteOutline fontSize="small" />
              </ActionButton>
            )}
          </div>
        );
      },
    });
  }
  return columns;
}
