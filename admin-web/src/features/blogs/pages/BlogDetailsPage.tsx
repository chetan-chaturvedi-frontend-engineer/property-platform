import Add from '@mui/icons-material/Add';
import ArrowBack from '@mui/icons-material/ArrowBack';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import EditOutlined from '@mui/icons-material/EditOutlined';
import LinkOutlined from '@mui/icons-material/LinkOutlined';
import PublishOutlined from '@mui/icons-material/PublishOutlined';
import UnpublishedOutlined from '@mui/icons-material/UnpublishedOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import { useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/common/Button';
import { ErrorState } from '@/components/common/Feedback/ErrorState';
import { notify } from '@/store/notificationStore';
import { blogRoutes, ROUTES } from '@/utils/constants';
import { formatDateTime } from '@/utils/formatters';

import { type ActiveBlogDialog, BlogDialogs } from '../components/BlogDialogs';
import { PageHeading } from '@/components/common/PageHeading';
import { BlogStateChip } from '../components/BlogStateChip';
import { type BlogAction, BlogActionsCard } from '../components/details/BlogActionsCard';
import { BlogDetailsView } from '../components/details/BlogDetailsView';
import { BlogInfoTable, TagList } from '../components/details/BlogInfoTable';
import { BlogSeoCard } from '../components/details/BlogSeoCard';
import type { BlogArticleData } from '../components/preview/BlogArticle';
import { BlogPreviewDialog } from '../components/preview/BlogPreviewDialog';
import { useBlogPermissions } from '../hooks/useBlogPermissions';
import { useBlog } from '../hooks/useBlogs';
import type { Blog } from '../types/blog.types';
import { countWords, htmlToText, readingTimeLabel } from '../utils/blogDisplay';
import { parseBlogId } from '../utils/blogForm';

const crumbs = [
  { label: 'Dashboard', to: ROUTES.dashboard },
  { label: 'Blogs', to: ROUTES.blogs },
  { label: 'Blog details' },
];
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

function BlogDetails({ blog }: { blog: Blog }) {
  const navigate = useNavigate();
  const { canCreate, canEdit, canDuplicate, canChangeStatus, canDelete } = useBlogPermissions();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [dialog, setDialog] = useState<ActiveBlogDialog | null>(null);

  const words = countWords(htmlToText(blog.content));
  const readingLabel = readingTimeLabel(words);
  const article: BlogArticleData = {
    title: blog.title,
    shortDescription: blog.shortDescription ?? '',
    categoryTitle: blog.category?.title ?? null,
    imageSrc: blog.featureImageUrl,
    dateLabel: blog.publishedAt
      ? dateFormatter.format(new Date(blog.publishedAt))
      : 'Not published yet',
    readingLabel,
    tags: blog.tags,
    content: blog.content,
  };

  const copySlug = () => {
    void navigator.clipboard
      ?.writeText(`/blog/${blog.slug}`)
      .then(() => notify('URL path copied.', 'success'))
      .catch(() => notify('Could not copy to the clipboard.', 'error'));
  };

  const actions: BlogAction[] = [
    ...(canEdit
      ? [
          {
            key: 'edit',
            label: 'Edit blog',
            icon: <EditOutlined />,
            tone: 'primary' as const,
            onClick: () => void navigate(blogRoutes.edit(blog.id)),
          },
        ]
      : []),
    ...(canDuplicate
      ? [
          {
            key: 'duplicate',
            label: 'Duplicate',
            icon: <ContentCopyOutlined />,
            onClick: () => void navigate(blogRoutes.duplicate(blog.id)),
          },
        ]
      : []),
    {
      key: 'preview',
      label: 'Preview',
      icon: <VisibilityOutlined />,
      onClick: () => setPreviewOpen(true),
    },
    { key: 'copy', label: 'Copy URL', icon: <LinkOutlined />, onClick: copySlug },
    ...(canChangeStatus
      ? [
          blog.status === 'draft'
            ? {
                key: 'publish',
                label: 'Publish now',
                icon: <PublishOutlined />,
                onClick: () => setDialog({ kind: 'status', blogs: [blog], status: 'publish' }),
              }
            : {
                key: 'unpublish',
                label: 'Unpublish',
                icon: <UnpublishedOutlined />,
                tone: 'warning' as const,
                onClick: () => setDialog({ kind: 'status', blogs: [blog], status: 'draft' }),
              },
        ]
      : []),
    ...(canDelete
      ? [
          {
            key: 'delete',
            label: 'Delete',
            icon: <DeleteOutline />,
            tone: 'danger' as const,
            onClick: () => setDialog({ kind: 'delete', blogs: [blog] }),
          },
        ]
      : []),
  ];

  const info = (
    <BlogInfoTable
      label="Blog information"
      rows={[
        { key: 'id', label: 'Blog ID', value: `#${blog.id}` },
        { key: 'updated', label: 'Last updated', value: formatDateTime(blog.updatedAt) },
        {
          key: 'category',
          label: 'Category',
          value: blog.category
            ? `${blog.category.title}${blog.category.status === 'inactive' ? ' (inactive)' : ''}`
            : 'No category',
        },
        { key: 'created', label: 'Created', value: formatDateTime(blog.createdAt) },
        { key: 'status', label: 'Status', value: <BlogStateChip state={blog.publicState} /> },
        { key: 'reading', label: 'Reading time', value: `${readingLabel} · ${words} words` },
        {
          key: 'published',
          label: blog.publicState === 'scheduled' ? 'Goes live' : 'Published on',
          value: blog.publishedAt ? formatDateTime(blog.publishedAt) : '—',
        },
        { key: 'slug', label: 'Blog slug', value: <span className="break-all">{blog.slug}</span> },
        { key: 'tags', label: 'Tags', value: <TagList tags={blog.tags} /> },
      ]}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Tooltip title="Back to blogs">
            <IconButton
              aria-label="Back to blogs"
              onClick={() => void navigate(ROUTES.blogs)}
              className="mt-1 rounded-lg border"
            >
              <ArrowBack />
            </IconButton>
          </Tooltip>
          <PageHeading title="Blog details" crumbs={crumbs} />
        </div>
        <div className="flex flex-wrap gap-2 self-start lg:self-auto">
          <Button
            variant="outlined"
            size="large"
            startIcon={<ArrowBack />}
            onClick={() => void navigate(ROUTES.blogs)}
          >
            Back to blogs
          </Button>
          {canEdit && (
            <Button
              variant="outlined"
              size="large"
              startIcon={<EditOutlined />}
              onClick={() => void navigate(blogRoutes.edit(blog.id))}
            >
              Edit blog
            </Button>
          )}
          {canCreate && (
            <Button size="large" startIcon={<Add />} onClick={() => void navigate(ROUTES.blogNew)}>
              Add new blog
            </Button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)]">
        <BlogDetailsView
          blog={blog}
          readingLabel={readingLabel}
          onPreview={() => setPreviewOpen(true)}
          info={info}
        />
        <div className="flex min-w-0 flex-col gap-6">
          <BlogActionsCard actions={actions} />
          <BlogSeoCard
            metaTitle={blog.metaTitle}
            metaDescription={blog.metaDescription}
            fallbackTitle={blog.title}
            fallbackDescription={blog.shortDescription}
            slug={blog.slug}
            tags={blog.tags}
          />
        </div>
      </div>

      <BlogPreviewDialog open={previewOpen} data={article} onClose={() => setPreviewOpen(false)} />
      <BlogDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onDone={() => {
          if (dialog?.kind === 'delete') void navigate(ROUTES.blogs);
        }}
      />
    </div>
  );
}

/** `/blogs/:id`: the stored blog with its metadata and actions. */
export function BlogDetailsPage() {
  const params = useParams();
  const id = parseBlogId(params.id);
  const { data: blog, error, refetch } = useBlog(id);

  if (blog) return <BlogDetails blog={blog} />;
  if (id === null || error) {
    const missing = id === null || error?.status === 404;
    return (
      <div className="flex flex-col gap-6">
        <PageHeading title="Blog details" crumbs={crumbs} />
        <Paper>
          <ErrorState
            message={missing ? 'This blog does not exist or was deleted.' : (error?.message ?? '')}
            onRetry={missing ? undefined : () => void refetch()}
          />
          <div className="flex justify-center pb-6">
            <Link component={RouterLink} to={ROUTES.blogs}>
              Back to blogs
            </Link>
          </div>
        </Paper>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Loading blog">
      <PageHeading title="Blog details" crumbs={crumbs} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)]">
        <Paper className="flex flex-col gap-4 p-5">
          <Skeleton variant="text" width="60%" height={40} />
          <Skeleton variant="rounded" className="aspect-[40/21] h-auto" />
          <Skeleton variant="text" />
          <Skeleton variant="text" />
        </Paper>
        <Paper className="flex flex-col gap-3 p-5">
          <Skeleton variant="rounded" height={120} />
          <Skeleton variant="rounded" height={160} />
        </Paper>
      </div>
    </div>
  );
}
