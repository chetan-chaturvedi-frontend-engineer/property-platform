import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import EditOutlined from '@mui/icons-material/EditOutlined';
import PublishOutlined from '@mui/icons-material/PublishOutlined';
import UnpublishedOutlined from '@mui/icons-material/UnpublishedOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import type { DataTableColumn } from '@/components/common/DataTable/DataTable';
import { ImageThumbnail } from '@/components/common/ImageThumbnail';
import { RowMenu, type RowMenuAction } from '@/components/common/RowMenu';
import { formatDateTime } from '@/utils/formatters';

import type { BlogSortField, BlogStatus, BlogSummary } from '../types/blog.types';
import { publicationNote } from '../utils/blogDisplay';

import { BlogStateChip } from './BlogStateChip';

/** Handlers for the row actions; only the actions the viewer is permitted to use are passed in. */
export interface BlogRowActions {
  onView?: (blog: BlogSummary) => void;
  onEdit?: (blog: BlogSummary) => void;
  onDuplicate?: (blog: BlogSummary) => void;
  onChangeStatus?: (blog: BlogSummary, status: BlogStatus) => void;
  onDelete?: (blog: BlogSummary) => void;
}

type BlogColumn = DataTableColumn<BlogSummary> & { sortField?: BlogSortField };

export function blogRowActions(blog: BlogSummary, handlers: BlogRowActions): RowMenuAction[] {
  const actions: Array<RowMenuAction | false | undefined> = [
    handlers.onView && {
      key: 'view',
      label: 'View details',
      icon: <VisibilityOutlined fontSize="small" />,
      onSelect: () => handlers.onView?.(blog),
    },
    handlers.onEdit && {
      key: 'edit',
      label: 'Edit',
      icon: <EditOutlined fontSize="small" />,
      onSelect: () => handlers.onEdit?.(blog),
    },
    handlers.onDuplicate && {
      key: 'duplicate',
      label: 'Duplicate',
      icon: <ContentCopyOutlined fontSize="small" />,
      onSelect: () => handlers.onDuplicate?.(blog),
    },
    handlers.onChangeStatus &&
      (blog.status === 'draft'
        ? {
            key: 'publish',
            label: 'Publish now',
            icon: <PublishOutlined fontSize="small" />,
            onSelect: () => handlers.onChangeStatus?.(blog, 'publish'),
          }
        : {
            key: 'unpublish',
            label: 'Unpublish',
            icon: <UnpublishedOutlined fontSize="small" />,
            onSelect: () => handlers.onChangeStatus?.(blog, 'draft'),
          }),
    handlers.onDelete && {
      key: 'delete',
      label: 'Delete',
      icon: <DeleteOutline fontSize="small" />,
      tone: 'danger',
      onSelect: () => handlers.onDelete?.(blog),
    },
  ];
  return actions.filter((action): action is RowMenuAction => Boolean(action));
}

/** Only API-sortable columns get a sort toggle. */
export function buildBlogColumns(handlers: BlogRowActions): BlogColumn[] {
  return [
    {
      id: 'blog',
      header: 'Blog',
      sortField: 'title',
      cell: (blog) => (
        <div className="flex min-w-80 items-center gap-3 py-2">
          <ImageThumbnail
            src={blog.featureImageUrl}
            alt={blog.title}
            aspectClassName="aspect-[40/21]"
            className="w-28 shrink-0"
          />
          <div className="min-w-0">
            <Typography
              variant="body2"
              fontWeight={600}
              className="line-clamp-2"
              title={blog.title}
            >
              {blog.title}
            </Typography>
            {blog.shortDescription && (
              <Typography variant="caption" color="text.secondary" className="line-clamp-2">
                {blog.shortDescription}
              </Typography>
            )}
            <Typography variant="caption" color="text.disabled" className="block truncate">
              #{blog.id} · /{blog.slug}
            </Typography>
          </div>
        </div>
      ),
    },
    {
      id: 'category',
      header: 'Category',
      cell: (blog) =>
        blog.category ? (
          <Chip
            size="small"
            label={blog.category.title}
            className="font-medium"
            sx={{
              bgcolor: 'rgba(var(--mui-palette-primary-mainChannel) / 0.1)',
              color: 'primary.main',
            }}
          />
        ) : (
          <Typography variant="caption" color="text.secondary">
            No category
          </Typography>
        ),
    },
    {
      id: 'tags',
      header: 'Tags',
      cell: (blog) =>
        blog.tags.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            —
          </Typography>
        ) : (
          <div className="flex max-w-48 flex-wrap gap-1">
            {blog.tags.slice(0, 2).map((tag) => (
              <Chip key={tag} size="small" variant="outlined" label={tag} />
            ))}
            {blog.tags.length > 2 && (
              <Tooltip title={blog.tags.slice(2).join(', ')}>
                <Chip size="small" variant="outlined" label={`+${blog.tags.length - 2}`} />
              </Tooltip>
            )}
          </div>
        ),
    },
    {
      id: 'status',
      header: 'Status',
      sortField: 'status',
      cell: (blog) => <BlogStateChip state={blog.publicState} />,
    },
    {
      id: 'publishedAt',
      header: 'Published date',
      sortField: 'publishedAt',
      cell: (blog) => (
        <div className="whitespace-nowrap">
          <Typography variant="body2">
            {blog.publishedAt ? formatDateTime(blog.publishedAt) : '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {publicationNote(blog)}
          </Typography>
        </div>
      ),
    },
    {
      id: 'updatedAt',
      header: 'Last updated',
      sortField: 'updatedAt',
      cell: (blog) => (
        <span className="whitespace-nowrap text-sm">{formatDateTime(blog.updatedAt)}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (blog) => (
        <div className="flex items-center justify-end gap-1.5">
          {handlers.onView && (
            <Tooltip title="View">
              <IconButton
                size="small"
                aria-label={`View ${blog.title}`}
                onClick={() => handlers.onView?.(blog)}
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
                aria-label={`Edit ${blog.title}`}
                onClick={() => handlers.onEdit?.(blog)}
                className="rounded-lg border"
                color="primary"
              >
                <EditOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <RowMenu label={`Actions for ${blog.title}`} actions={blogRowActions(blog, handlers)} />
        </div>
      ),
    },
  ];
}
