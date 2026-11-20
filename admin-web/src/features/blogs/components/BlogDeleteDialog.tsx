import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';

import { ImageThumbnail } from '@/components/common/ImageThumbnail';
import { ConfirmDialog } from '@/components/common/Modal';
import { useSequentialRun } from '@/hooks/useSequentialRun';
import { notify } from '@/store/notificationStore';

import { useDeleteBlog } from '../hooks/useBlogs';
import type { BlogSummary } from '../types/blog.types';

interface BlogDeleteDialogProps {
  blogs: readonly Pick<BlogSummary, 'id' | 'title' | 'slug' | 'featureImageUrl' | 'publicState'>[];
  onClose: () => void;
  /** Called after deleting with the ids that were deleted. */
  onDone?: (ids: number[]) => void;
}

const plural = (count: number) => `${count} blog${count === 1 ? '' : 's'}`;

/**
 * Confirms deleting one or more blogs (a soft delete on the backend: the slug stays reserved). There
 * is no bulk endpoint, so a bulk delete sends one request per blog and reports once.
 */
export function BlogDeleteDialog({ blogs, onClose, onDone }: BlogDeleteDialogProps) {
  const isBulk = blogs.length > 1;
  const remove = useDeleteBlog({ quiet: isBulk });
  const sequence = useSequentialRun<BlogDeleteDialogProps['blogs'][number]>();
  const busy = sequence.isRunning || remove.isPending;
  const [single] = blogs;
  const liveCount = blogs.filter((blog) => blog.publicState === 'live').length;
  const scheduledCount = blogs.filter((blog) => blog.publicState === 'scheduled').length;

  const confirm = async () => {
    if (busy || !single) return;
    if (!isBulk) {
      remove.mutate(single.id, {
        onSuccess: () => {
          onDone?.([single.id]);
          onClose();
        },
      });
      return;
    }
    const { succeeded, failed } = await sequence.run(blogs, (blog) => remove.mutateAsync(blog.id));
    notify(
      failed === 0
        ? `${plural(succeeded.length)} deleted.`
        : `${succeeded.length} deleted, ${failed} failed. Refresh and try again.`,
      failed === 0 ? 'success' : 'warning',
    );
    onDone?.(succeeded.map((blog) => blog.id));
    onClose();
  };

  return (
    <ConfirmDialog
      open
      title={isBulk ? `Delete ${plural(blogs.length)}` : 'Delete blog'}
      confirmLabel="Delete"
      destructive
      loading={busy}
      onCancel={onClose}
      onConfirm={() => void confirm()}
      description={
        <div className="flex flex-col gap-3">
          {!isBulk && single && (
            <div className="flex items-center gap-3">
              <ImageThumbnail
                src={single.featureImageUrl}
                alt={single.title}
                aspectClassName="aspect-[40/21]"
                className="w-24 shrink-0"
              />
              <div className="min-w-0">
                <Typography variant="body2" fontWeight={600}>
                  {single.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  #{single.id} · /{single.slug}
                </Typography>
              </div>
            </div>
          )}
          <Typography variant="body2">
            {isBulk ? `Delete ${plural(blogs.length)}?` : 'Delete this blog?'} Deleted blogs
            disappear from this list, the website and the app. Their URLs stay reserved and cannot
            be reused. This cannot be undone here.
          </Typography>
          {(liveCount > 0 || scheduledCount > 0) && (
            <Alert severity="warning">
              {isBulk
                ? `${liveCount} live, ${scheduledCount} scheduled: they will no longer be shown.`
                : liveCount > 0
                  ? 'This blog is live and its page will stop working immediately.'
                  : 'This blog is scheduled and will never go live.'}{' '}
              Unpublish instead if you may need {isBulk ? 'them' : 'it'} again.
            </Alert>
          )}
          {sequence.done !== null && (
            <LinearProgress
              variant="determinate"
              value={(sequence.done / Math.max(1, blogs.length)) * 100}
              aria-label="Delete progress"
            />
          )}
        </div>
      }
    />
  );
}
