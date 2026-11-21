import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';

import { ConfirmDialog } from '@/components/common/Modal';
import { useSequentialRun } from '@/hooks/useSequentialRun';
import { notify } from '@/store/notificationStore';

import { useChangeFaqStatus } from '../hooks/useFaqs';
import type { FaqStatus, FaqSummary } from '../types/faq.types';

type FaqRef = Pick<FaqSummary, 'id' | 'question' | 'status' | 'categoryLabel'>;

interface FaqStatusDialogProps {
  faqs: readonly FaqRef[];
  /** `publish` = publish, `draft` = unpublish. */
  status: FaqStatus;
  onClose: () => void;
  onDone?: (ids: number[]) => void;
}

const plural = (count: number) => `${count} FAQ${count === 1 ? '' : 's'}`;

/** Publishes or unpublishes one or more FAQs. There is no bulk endpoint: one `PATCH` per FAQ. */
export function FaqStatusDialog({ faqs, status, onClose, onDone }: FaqStatusDialogProps) {
  const publishing = status === 'publish';
  const changing = faqs.filter((faq) => faq.status !== status);
  const unchanged = faqs.length - changing.length;
  const removedCategory = publishing
    ? changing.filter((faq) => faq.categoryLabel === null).length
    : 0;

  const isBulk = faqs.length > 1;
  const change = useChangeFaqStatus({ quiet: isBulk });
  const sequence = useSequentialRun<FaqRef>();
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
    const { succeeded, failed } = await sequence.run(changing, (faq) =>
      change.mutateAsync({ id: faq.id, status }),
    );
    const verb = publishing ? 'published' : 'unpublished';
    notify(
      failed === 0
        ? `${plural(succeeded.length)} ${verb}.`
        : `${succeeded.length} ${verb}, ${failed} failed. Refresh and try again.`,
      failed === 0 ? 'success' : 'warning',
    );
    onDone?.(succeeded.map((faq) => faq.id));
    onClose();
  };

  const action = publishing ? 'Publish' : 'Unpublish';
  return (
    <ConfirmDialog
      open
      title={isBulk ? `${action} ${plural(faqs.length)}` : `${action} FAQ`}
      confirmLabel={action}
      destructive={!publishing}
      loading={busy}
      onCancel={onClose}
      onConfirm={() => void confirm()}
      description={
        <div className="flex flex-col gap-3">
          {!isBulk && faqs[0] && (
            <Typography variant="body2" fontWeight={600} className="break-words">
              {faqs[0].question}
            </Typography>
          )}
          <Typography variant="body2">
            {publishing
              ? 'Published FAQs appear on the website and app within a minute.'
              : 'Unpublished FAQs become drafts and disappear from the website and app within a minute.'}
          </Typography>
          {removedCategory > 0 && (
            <Alert severity="warning">
              {isBulk
                ? `${plural(removedCategory)} in a removed category will stay hidden until moved to a configured category.`
                : 'Its category was removed, so it stays hidden until you move it to a configured category.'}
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
