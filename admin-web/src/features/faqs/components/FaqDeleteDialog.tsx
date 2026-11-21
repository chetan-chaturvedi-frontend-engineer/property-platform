import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';

import { ConfirmDialog } from '@/components/common/Modal';
import { useSequentialRun } from '@/hooks/useSequentialRun';
import { notify } from '@/store/notificationStore';

import { useDeleteFaq } from '../hooks/useFaqs';
import type { FaqSummary } from '../types/faq.types';

type FaqRef = Pick<FaqSummary, 'id' | 'question' | 'status'>;

interface FaqDeleteDialogProps {
  faqs: readonly FaqRef[];
  onClose: () => void;
  /** Called after deleting with the ids that were deleted. */
  onDone?: (ids: number[]) => void;
}

const plural = (count: number) => `${count} FAQ${count === 1 ? '' : 's'}`;

/**
 * Confirms deleting one or more FAQs. The delete is permanent (FAQs have no trash), and there is no
 * bulk endpoint, so a bulk delete sends one request per FAQ and reports once.
 */
export function FaqDeleteDialog({ faqs, onClose, onDone }: FaqDeleteDialogProps) {
  const isBulk = faqs.length > 1;
  const remove = useDeleteFaq({ quiet: isBulk });
  const sequence = useSequentialRun<FaqRef>();
  const busy = sequence.isRunning || remove.isPending;
  const [single] = faqs;
  const publishedCount = faqs.filter((faq) => faq.status === 'publish').length;

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
    const { succeeded, failed } = await sequence.run(faqs, (faq) => remove.mutateAsync(faq.id));
    notify(
      failed === 0
        ? `${plural(succeeded.length)} deleted.`
        : `${succeeded.length} deleted, ${failed} failed. Refresh and try again.`,
      failed === 0 ? 'success' : 'warning',
    );
    onDone?.(succeeded.map((faq) => faq.id));
    onClose();
  };

  return (
    <ConfirmDialog
      open
      title={isBulk ? `Delete ${plural(faqs.length)}` : 'Delete FAQ'}
      confirmLabel={isBulk ? `Delete ${plural(faqs.length)}` : 'Delete permanently'}
      destructive
      loading={busy}
      onCancel={onClose}
      onConfirm={() => void confirm()}
      description={
        <div className="flex flex-col gap-3">
          {!isBulk && single && (
            <Typography variant="body2" fontWeight={600} className="break-words">
              “{single.question}”
            </Typography>
          )}
          <Typography variant="body2">
            {isBulk ? `Permanently delete ${plural(faqs.length)}?` : 'Permanently delete this FAQ?'}{' '}
            FAQs have no trash, so this cannot be undone.
          </Typography>
          {publishedCount > 0 && (
            <Alert severity="warning">
              {isBulk
                ? `${publishedCount} of them ${publishedCount === 1 ? 'is' : 'are'} published and will disappear from the website and app.`
                : 'This FAQ is published and will disappear from the website and app.'}{' '}
              Unpublish instead if you may need {isBulk ? 'them' : 'it'} again.
            </Alert>
          )}
          {sequence.done !== null && (
            <LinearProgress
              variant="determinate"
              value={(sequence.done / Math.max(1, faqs.length)) * 100}
              aria-label="Delete progress"
            />
          )}
        </div>
      }
    />
  );
}
