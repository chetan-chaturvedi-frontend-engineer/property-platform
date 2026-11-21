import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';

import { ConfirmDialog } from '@/components/common/Modal';
import { useSequentialRun } from '@/hooks/useSequentialRun';
import { notify } from '@/store/notificationStore';

import { useDeleteContentPage } from '../hooks/useContentPages';
import type { ContentPageSummary } from '../types/contentPage.types';

type PageRef = Pick<ContentPageSummary, 'id' | 'heading' | 'status' | 'type'>;

interface ContentPageDeleteDialogProps {
  pages: readonly PageRef[];
  onClose: () => void;
  /** Called after deleting with the ids that were deleted. */
  onDone?: (ids: number[]) => void;
}

const plural = (count: number) => `${count} page${count === 1 ? '' : 's'}`;

/**
 * Confirms deleting one or more pages. The delete is permanent (pages have no trash), and there is
 * no bulk endpoint, so a bulk delete sends one request per page and reports once. System pages get
 * a stronger warning because the website and app may link to them.
 */
export function ContentPageDeleteDialog({ pages, onClose, onDone }: ContentPageDeleteDialogProps) {
  const isBulk = pages.length > 1;
  const remove = useDeleteContentPage({ quiet: isBulk });
  const sequence = useSequentialRun<PageRef>();
  const busy = sequence.isRunning || remove.isPending;
  const [single] = pages;
  const systemCount = pages.filter((page) => page.type === 'system').length;
  const publishedCount = pages.filter((page) => page.status === 'publish').length;

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
    const { succeeded, failed } = await sequence.run(pages, (page) => remove.mutateAsync(page.id));
    notify(
      failed === 0
        ? `${plural(succeeded.length)} deleted.`
        : `${succeeded.length} deleted, ${failed} failed. Refresh and try again.`,
      failed === 0 ? 'success' : 'warning',
    );
    onDone?.(succeeded.map((page) => page.id));
    onClose();
  };

  return (
    <ConfirmDialog
      open
      title={isBulk ? `Delete ${plural(pages.length)}` : 'Delete page'}
      confirmLabel={isBulk ? `Delete ${plural(pages.length)}` : 'Delete permanently'}
      destructive
      loading={busy}
      onCancel={onClose}
      onConfirm={() => void confirm()}
      description={
        <div className="flex flex-col gap-3">
          {!isBulk && single && (
            <Typography variant="body2" fontWeight={600} className="break-words">
              “{single.heading}”
            </Typography>
          )}
          <Typography variant="body2">
            {isBulk
              ? `Permanently delete ${plural(pages.length)}?`
              : 'Permanently delete this page?'}{' '}
            Pages have no trash, so this cannot be undone.
          </Typography>
          {systemCount > 0 && (
            <Alert severity="error">
              {isBulk
                ? `${plural(systemCount)} ${systemCount === 1 ? 'is a system page' : 'are system pages'}.`
                : 'This is a system page.'}{' '}
              The website and app may link to it (for example in the footer or during sign-up);
              those links will stop working.
            </Alert>
          )}
          {publishedCount > 0 && (
            <Alert severity="warning">
              {isBulk
                ? `${publishedCount} of them ${publishedCount === 1 ? 'is' : 'are'} published and will disappear from the website and app.`
                : 'This page is published and will disappear from the website and app.'}{' '}
              Unpublish instead if you may need {isBulk ? 'them' : 'it'} again.
            </Alert>
          )}
          {sequence.done !== null && (
            <LinearProgress
              variant="determinate"
              value={(sequence.done / Math.max(1, pages.length)) * 100}
              aria-label="Delete progress"
            />
          )}
        </div>
      }
    />
  );
}
