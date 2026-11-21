import type { ContentPageStatus, ContentPageSummary } from '../types/contentPage.types';

import { ContentPageDeleteDialog } from './ContentPageDeleteDialog';
import { ContentPageStatusDialog } from './ContentPageStatusDialog';

/** The one confirmation open on the page list. */
export type ActiveContentPageDialog =
  | { kind: 'status'; pages: ContentPageSummary[]; status: ContentPageStatus }
  | { kind: 'delete'; pages: ContentPageSummary[] };

interface ContentPageDialogsProps {
  dialog: ActiveContentPageDialog | null;
  onClose: () => void;
  /** Called after a status change or delete with the affected ids, e.g. to clear the selection. */
  onDone?: (ids: number[]) => void;
}

export function ContentPageDialogs({ dialog, onClose, onDone }: ContentPageDialogsProps) {
  if (!dialog) return null;
  switch (dialog.kind) {
    case 'status':
      return (
        <ContentPageStatusDialog
          pages={dialog.pages}
          status={dialog.status}
          onClose={onClose}
          onDone={onDone}
        />
      );
    case 'delete':
      return <ContentPageDeleteDialog pages={dialog.pages} onClose={onClose} onDone={onDone} />;
  }
}
