import DeleteOutline from '@mui/icons-material/DeleteOutline';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
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

import type {
  ContentPageSortField,
  ContentPageStatus,
  ContentPageSummary,
} from '../types/contentPage.types';
import { contentPagePath } from '../utils/contentPageDisplay';

import { ContentPageStatusChip } from './ContentPageStatusChip';
import { ContentPageTypeChip } from './ContentPageTypeChip';

/** Handlers for the row actions; only the actions the viewer is permitted to use are passed in. */
export interface ContentPageRowActions {
  onView?: (page: ContentPageSummary) => void;
  onEdit?: (page: ContentPageSummary) => void;
  onChangeStatus?: (page: ContentPageSummary, status: ContentPageStatus) => void;
  onDelete?: (page: ContentPageSummary) => void;
}

type ContentPageColumn = DataTableColumn<ContentPageSummary> & {
  sortField?: ContentPageSortField;
};

export function contentPageRowActions(
  page: ContentPageSummary,
  handlers: ContentPageRowActions,
): RowMenuAction[] {
  const actions: Array<RowMenuAction | false | undefined> = [
    handlers.onView && {
      key: 'view',
      label: 'View details',
      icon: <VisibilityOutlined fontSize="small" />,
      onSelect: () => handlers.onView?.(page),
    },
    handlers.onEdit && {
      key: 'edit',
      label: 'Edit',
      icon: <EditOutlined fontSize="small" />,
      onSelect: () => handlers.onEdit?.(page),
    },
    handlers.onChangeStatus &&
      (page.status === 'draft'
        ? {
            key: 'publish',
            label: 'Publish',
            icon: <PublishOutlined fontSize="small" />,
            onSelect: () => handlers.onChangeStatus?.(page, 'publish'),
          }
        : {
            key: 'unpublish',
            label: 'Unpublish',
            icon: <UnpublishedOutlined fontSize="small" />,
            onSelect: () => handlers.onChangeStatus?.(page, 'draft'),
          }),
    handlers.onDelete && {
      key: 'delete',
      label: 'Delete',
      icon: <DeleteOutline fontSize="small" />,
      tone: 'danger',
      onSelect: () => handlers.onDelete?.(page),
    },
  ];
  return actions.filter((action): action is RowMenuAction => Boolean(action));
}

/** Every column is API-sortable except the actions. */
export function buildContentPageColumns(handlers: ContentPageRowActions): ContentPageColumn[] {
  return [
    {
      id: 'heading',
      header: 'Page title',
      sortField: 'heading',
      cell: (page) => (
        <div className="flex min-w-64 items-center gap-3 py-1">
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--mui-palette-action-hover)] text-muted"
          >
            <DescriptionOutlined fontSize="small" />
          </span>
          <div className="min-w-0">
            <Typography variant="body2" fontWeight={600} className="truncate" title={page.heading}>
              {page.heading}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              className="block truncate"
              title={contentPagePath(page.slug)}
            >
              /{page.slug}
            </Typography>
          </div>
        </div>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      sortField: 'type',
      cell: (page) => <ContentPageTypeChip type={page.type} />,
    },
    {
      id: 'status',
      header: 'Status',
      sortField: 'status',
      cell: (page) => <ContentPageStatusChip status={page.status} />,
    },
    {
      id: 'updatedAt',
      header: 'Updated on',
      sortField: 'updatedAt',
      cell: (page) => (
        <span className="whitespace-nowrap text-sm">{formatDateTime(page.updatedAt)}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (page) => (
        <div className="flex items-center justify-end gap-1.5">
          {handlers.onView && (
            <Tooltip title="View">
              <IconButton
                size="small"
                aria-label={`View ${page.heading}`}
                onClick={() => handlers.onView?.(page)}
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
                aria-label={`Edit ${page.heading}`}
                onClick={() => handlers.onEdit?.(page)}
                className="rounded-lg border"
                color="primary"
              >
                <EditOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <RowMenu
            label={`Actions for ${page.heading}`}
            actions={contentPageRowActions(page, handlers)}
          />
        </div>
      ),
    },
  ];
}
