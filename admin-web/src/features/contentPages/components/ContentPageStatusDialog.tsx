import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';

import { ConfirmDialog } from '@/components/common/Modal';
import { useSequentialRun } from '@/hooks/useSequentialRun';
import { notify } from '@/store/notificationStore';

import { useChangeContentPageStatus } from '../hooks/useContentPages';
import type { ContentPageStatus, ContentPageSummary } from '../types/contentPage.types';

type PageRef = Pick<ContentPageSummary, 'id' | 'heading' | 'status' | 'type'>;

interface ContentPageStatusDialogProps {
  pages: readonly PageRef[];
  /** `publish` = publish, `draft` = unpublish. */
  status: ContentPageStatus;
  onClose: () => void;
  onDone?: (ids: number[]) => void;
}

const plural = (count: number) => `${count} page${count === 1 ? '' : 's'}`;

/** Publishes or unpublishes one or more pages. There is no bulk endpoint: one `PATCH` per page. */
export function ContentPageStatusDialog({
  pages,
  status,
  onClose,
  onDone,
}: ContentPageStatusDialogProps) {
  const publishing = status === 'publish';
  const changing = pages.filter((page) => page.status !== status);
  const unchanged = pages.length - changing.length;
  const hidingSystem = publishing ? 0 : changing.filter((page) => page.type === 'system').length;

  const isBulk = pages.length > 1;
  const change = useChangeContentPageStatus({ quiet: isBulk });
  const sequence = useSequentialRun<PageRef>();
  const busy = sequence.isRunning || change.isPending;
  const [single] = changing;

  const confirm = async () => {
    if (busy || changing.length === 0) return;
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
    const { succeeded, failed } = await sequence.run(changing, (page) =>
      change.mutateAsync({ id: page.id, status }),
    );
    const verb = publishing ? 'published' : 'unpublished';
    notify(
      failed === 0
        ? `${plural(succeeded.length)} ${verb}.`
        : `${succeeded.length} ${verb}, ${failed} failed. Refresh and try again.`,
      failed === 0 ? 'success' : 'warning',
    );
    onDone?.(succeeded.map((page) => page.id));
    onClose();
  };

  const action = publishing ? 'Publish' : 'Unpublish';
  return (
    <ConfirmDialog
      open
      title={isBulk ? `${action} ${plural(pages.length)}` : `${action} page`}
      confirmLabel={action}
      destructive={!publishing}
      loading={busy}
      onCancel={onClose}
      onConfirm={() => void confirm()}
      description={
        <div className="flex flex-col gap-3">
          {!isBulk && pages[0] && (
            <Typography variant="body2" fontWeight={600} className="break-words">
              {pages[0].heading}
            </Typography>
          )}
          <Typography variant="body2">
            {publishing
              ? 'Published pages are public on the website and app within a minute.'
              : 'Unpublished pages become drafts and disappear from the website and app within a minute.'}
          </Typography>
          {hidingSystem > 0 && (
            <Alert severity="warning">
              {isBulk
                ? `${plural(hidingSystem)} ${hidingSystem === 1 ? 'is a system page' : 'are system pages'}`
                : 'This is a system page'}
              ; links to it from the website and app will show “not found” until it is published
              again.
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
              value={(sequence.done / Math.max(1, changing.length)) * 100}
              aria-label="Progress"
            />
          )}
        </div>
      }
    />
  );
}
