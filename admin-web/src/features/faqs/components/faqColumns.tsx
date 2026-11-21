import DeleteOutline from '@mui/icons-material/DeleteOutline';
import EditOutlined from '@mui/icons-material/EditOutlined';
import PublishOutlined from '@mui/icons-material/PublishOutlined';
import UnpublishedOutlined from '@mui/icons-material/UnpublishedOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import type { DataTableColumn } from '@/components/common/DataTable/DataTable';
import { RowMenu, type RowMenuAction } from '@/components/common/RowMenu';
import { formatDateTime } from '@/utils/formatters';

import type { FaqCategory, FaqSortField, FaqStatus, FaqSummary } from '../types/faq.types';
import { categoryTone } from '../utils/faqDisplay';

import { FaqCategoryChip } from './FaqCategoryChip';
import { FaqStatusChip } from './FaqStatusChip';

/** Handlers for the row actions; only the actions the viewer is permitted to use are passed in. */
export interface FaqRowActions {
  onView?: (faq: FaqSummary) => void;
  onEdit?: (faq: FaqSummary) => void;
  onChangeStatus?: (faq: FaqSummary, status: FaqStatus) => void;
  onDelete?: (faq: FaqSummary) => void;
}

type FaqColumn = DataTableColumn<FaqSummary> & { sortField?: FaqSortField };

export function faqRowActions(faq: FaqSummary, handlers: FaqRowActions): RowMenuAction[] {
  const actions: Array<RowMenuAction | false | undefined> = [
    handlers.onView && {
      key: 'view',
      label: 'View details',
      icon: <VisibilityOutlined fontSize="small" />,
      onSelect: () => handlers.onView?.(faq),
    },
    handlers.onEdit && {
      key: 'edit',
      label: 'Edit',
      icon: <EditOutlined fontSize="small" />,
      onSelect: () => handlers.onEdit?.(faq),
    },
    handlers.onChangeStatus &&
      (faq.status === 'draft'
        ? {
            key: 'publish',
            label: 'Publish',
            icon: <PublishOutlined fontSize="small" />,
            onSelect: () => handlers.onChangeStatus?.(faq, 'publish'),
          }
        : {
            key: 'unpublish',
            label: 'Unpublish',
            icon: <UnpublishedOutlined fontSize="small" />,
            onSelect: () => handlers.onChangeStatus?.(faq, 'draft'),
          }),
    handlers.onDelete && {
      key: 'delete',
      label: 'Delete',
      icon: <DeleteOutline fontSize="small" />,
      tone: 'danger',
      onSelect: () => handlers.onDelete?.(faq),
    },
  ];
  return actions.filter((action): action is RowMenuAction => Boolean(action));
}

/** Every column is API-sortable except the actions. */
export function buildFaqColumns(
  handlers: FaqRowActions,
  categories: readonly FaqCategory[],
): FaqColumn[] {
  return [
    {
      id: 'question',
      header: 'Question',
      sortField: 'question',
      cell: (faq) => (
        <Typography
          variant="body2"
          fontWeight={500}
          className="line-clamp-2 min-w-64 py-1"
          title={faq.question}
        >
          {faq.question}
        </Typography>
      ),
    },
    {
      id: 'category',
      header: 'Category',
      sortField: 'category',
      cell: (faq) => (
        <FaqCategoryChip label={faq.categoryLabel} tone={categoryTone(faq.category, categories)} />
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sortField: 'status',
      cell: (faq) => <FaqStatusChip status={faq.status} />,
    },
    {
      id: 'sortOrder',
      header: 'Order',
      sortField: 'sortOrder',
      align: 'center',
      cell: (faq) => <span className="tabular-nums">{faq.sortOrder}</span>,
    },
    {
      id: 'updatedAt',
      header: 'Updated on',
      sortField: 'updatedAt',
      cell: (faq) => (
        <span className="whitespace-nowrap text-sm">{formatDateTime(faq.updatedAt)}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (faq) => (
        <div className="flex items-center justify-end gap-1.5">
          {handlers.onView && (
            <Tooltip title="View">
              <IconButton
                size="small"
                aria-label={`View ${faq.question}`}
                onClick={() => handlers.onView?.(faq)}
                className="rounded-lg border"
                color="primary"
              >
                <VisibilityOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {handlers.onEdit && (
            <Tooltip title="Edit">
              <IconButton
                size="small"
                aria-label={`Edit ${faq.question}`}
                onClick={() => handlers.onEdit?.(faq)}
                className="rounded-lg border"
                color="primary"
              >
                <EditOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <RowMenu label={`Actions for ${faq.question}`} actions={faqRowActions(faq, handlers)} />
        </div>
      ),
    },
  ];
}
