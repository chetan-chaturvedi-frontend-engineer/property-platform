import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';

import { ConfirmDialog } from '@/components/common/Modal';
import { useSequentialRun } from '@/hooks/useSequentialRun';
import { notify } from '@/store/notificationStore';

import { useChangeBlogStatus } from '../hooks/useBlogs';
import type { BlogStatus, BlogSummary } from '../types/blog.types';

interface BlogStatusDialogProps {
  blogs: readonly BlogSummary[];
  /** `publish` = publish now, `draft` = unpublish. */
  status: BlogStatus;
  onClose: () => void;
  onDone?: (ids: number[]) => void;
}

const plural = (count: number) => `${count} blog${count === 1 ? '' : 's'}`;

/**
 * Publishes (now) or unpublishes one or more blogs. Publishing needs a category, so blogs without
 * one are skipped up front instead of failing. There is no bulk endpoint: one `PATCH` per blog.
 */
export function BlogStatusDialog({ blogs, status, onClose, onDone }: BlogStatusDialogProps) {
  const publishing = status === 'publish';
  // Only blogs whose status actually changes; publishing also needs a category.
  const changing = blogs.filter((blog) => blog.status !== status);
  const eligible = publishing ? changing.filter((blog) => blog.category !== null) : changing;
  const withoutCategory = changing.length - eligible.length;
  const unchanged = blogs.length - changing.length;

  const isBulk = blogs.length > 1;
  const change = useChangeBlogStatus({ quiet: isBulk });
  const sequence = useSequentialRun<BlogSummary>();
  const busy = sequence.isRunning || change.isPending;
  const [single] = eligible;

  const confirm = async () => {
    if (busy || eligible.length === 0) return;
    if (!isBulk && single) {
      change.mutate(
        { id: single.id, status },
        {
          onSuccess: () => {
            onDone?.([single.id]);
            onClose();
          },
        },
      );
      return;
    }
    const { succeeded, failed } = await sequence.run(eligible, (blog) =>
      change.mutateAsync({ id: blog.id, status }),
    );
    const verb = publishing ? 'published' : 'unpublished';
    notify(
      failed === 0
        ? `${plural(succeeded.length)} ${verb}.`
        : `${succeeded.length} ${verb}, ${failed} failed. Refresh and try again.`,
      failed === 0 ? 'success' : 'warning',
    );
    onDone?.(succeeded.map((blog) => blog.id));
    onClose();
  };

  const title = publishing
    ? isBulk
      ? `Publish ${plural(blogs.length)}`
      : 'Publish blog'
    : isBulk
      ? `Unpublish ${plural(blogs.length)}`
      : 'Unpublish blog';

  return (
    <ConfirmDialog
      open
      title={title}
      confirmLabel={publishing ? 'Publish now' : 'Unpublish'}
      destructive={!publishing}
      loading={busy}
      onCancel={onClose}
      onConfirm={() => void confirm()}
      description={
        <div className="flex flex-col gap-3">
          {!isBulk && blogs[0] && (
            <Typography variant="body2" fontWeight={600}>
              {blogs[0].title}
            </Typography>
          )}
          <Typography variant="body2">
            {publishing
              ? 'Published blogs go live on the website and app immediately (within a minute).'
              : 'Unpublished blogs are hidden from the website and app at once and become drafts. Their publication date is kept.'}
          </Typography>
          {withoutCategory > 0 && (
            <Alert severity="warning">
              {isBulk
                ? `${plural(withoutCategory)} without a category will be skipped: a category is required to publish.`
                : 'This blog has no category. Edit it and choose a category before publishing.'}
            </Alert>
          )}
          {unchanged > 0 && isBulk && (
            <Alert severity="info">
              {plural(unchanged)} already {publishing ? 'published' : 'drafts'}; they are left as
              they are.
            </Alert>
          )}
          {sequence.done !== null && (
            <LinearProgress
              variant="determinate"
              value={(sequence.done / Math.max(1, eligible.length)) * 100}
              aria-label="Progress"
            />
          )}
        </div>
      }
    />
  );
}
