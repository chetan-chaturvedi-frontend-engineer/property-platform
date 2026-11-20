import type { BlogStatus, BlogSummary } from '../types/blog.types';

import { BlogDeleteDialog } from './BlogDeleteDialog';
import { BlogStatusDialog } from './BlogStatusDialog';

/** The one confirmation open on a blog screen. */
export type ActiveBlogDialog =
  | { kind: 'status'; blogs: BlogSummary[]; status: BlogStatus }
  | { kind: 'delete'; blogs: BlogSummary[] };

interface BlogDialogsProps {
  dialog: ActiveBlogDialog | null;
  onClose: () => void;
  /** Called after a status change or delete with the affected ids, e.g. to clear the selection. */
  onDone?: (ids: number[]) => void;
}

export function BlogDialogs({ dialog, onClose, onDone }: BlogDialogsProps) {
  if (!dialog) return null;
  switch (dialog.kind) {
    case 'status':
      return (
        <BlogStatusDialog
          blogs={dialog.blogs}
          status={dialog.status}
          onClose={onClose}
          onDone={onDone}
        />
      );
    case 'delete':
      return <BlogDeleteDialog blogs={dialog.blogs} onClose={onClose} onDone={onDone} />;
  }
}
