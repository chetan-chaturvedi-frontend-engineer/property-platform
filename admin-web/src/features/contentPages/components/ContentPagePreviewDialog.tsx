import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';

import { ContentPageArticle } from './ContentPageArticle';

interface ContentPagePreviewDialogProps {
  open: boolean;
  onClose: () => void;
  heading: string;
  subHeading: string;
  /** Editor HTML; the saved page shows what the backend's sanitizer keeps of it. */
  content: string;
}

/** The unsaved page as visitors would read it. Shown in the dashboard only, never published. */
export function ContentPagePreviewDialog({
  open,
  onClose,
  heading,
  subHeading,
  content,
}: ContentPagePreviewDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Page preview"
      maxWidth="md"
      actions={<Button onClick={onClose}>Close preview</Button>}
    >
      <ContentPageArticle heading={heading} subHeading={subHeading} content={content} />
    </Modal>
  );
}
