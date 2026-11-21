import type { FaqStatus, FaqSummary } from '../types/faq.types';

import { FaqDeleteDialog } from './FaqDeleteDialog';
import { FaqStatusDialog } from './FaqStatusDialog';

/** The one confirmation open on the FAQ list. */
export type ActiveFaqDialog =
  | { kind: 'status'; faqs: FaqSummary[]; status: FaqStatus }
  | { kind: 'delete'; faqs: FaqSummary[] };

interface FaqDialogsProps {
  dialog: ActiveFaqDialog | null;
  onClose: () => void;
  /** Called after a status change or delete with the affected ids, e.g. to clear the selection. */
  onDone?: (ids: number[]) => void;
}

export function FaqDialogs({ dialog, onClose, onDone }: FaqDialogsProps) {
  if (!dialog) return null;
  switch (dialog.kind) {
    case 'status':
      return (
        <FaqStatusDialog
          faqs={dialog.faqs}
          status={dialog.status}
          onClose={onClose}
          onDone={onDone}
        />
      );
    case 'delete':
      return <FaqDeleteDialog faqs={dialog.faqs} onClose={onClose} onDone={onDone} />;
  }
}
