import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import EditOutlined from '@mui/icons-material/EditOutlined';
import HighlightOff from '@mui/icons-material/HighlightOff';
import PublicOutlined from '@mui/icons-material/PublicOutlined';
import RestoreFromTrash from '@mui/icons-material/RestoreFromTrash';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import type { DataTableColumn } from '@/components/common/DataTable/DataTable';

import type {
  PropertySortField,
  PropertySummary,
  PublicationAction,
} from '../types/property.types';
import { isEditable } from '../utils/propertyDisplay';

import {
  LocationCell,
  PriceCell,
  PropertyInfoCell,
  StatusCell,
  SubmittedOnCell,
} from './PropertyTableCells';
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
  // Columns hide on narrower screens instead of scrolling; their content then shows in the property cell
  // (keep these breakpoints in step with `PropertyInfoCell`).
  const columns: PropertyColumn[] = [
    {
      id: 'property',
      header: 'Property',
      sortField: 'projectName',
      cell: (p) => <PropertyInfoCell property={p} />,
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
      className: 'hidden xl:table-cell',
      cell: (p) => <LocationCell property={p} />,
    },
    {
      id: 'price',
      header: 'Price',
      className: 'hidden sm:table-cell',
      cell: (p) => <PriceCell property={p} />,
    },
    {
      id: 'createdAt',
      header: 'Submitted on',
      sortField: 'createdAt',
      className: 'hidden lg:table-cell',
      cell: (p) => <SubmittedOnCell property={p} />,
    },
    {
      id: 'status',
      header: 'Status',
      className: 'hidden sm:table-cell',
      cell: (p) => <StatusCell property={p} />,
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
          <div className="ml-auto flex max-w-[96px] flex-wrap justify-end gap-0.5 xl:max-w-none xl:flex-nowrap">
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
