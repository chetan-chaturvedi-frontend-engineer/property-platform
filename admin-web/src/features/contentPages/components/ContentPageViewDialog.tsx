import EditOutlined from '@mui/icons-material/EditOutlined';

import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';

import { useContentPage } from '../hooks/useContentPages';

import { ContentPageDetailsContent } from './ContentPageDetailsContent';

interface ContentPageViewDialogProps {
  /** The page to show; null closes the dialog. */
  id: number | null;
  onClose: () => void;
  /** Opens the edit form; omitted without permission. */
  onEdit?: (id: number) => void;
}

/** Read-only page details, SEO fields and a content preview in a dialog. */
export function ContentPageViewDialog({ id, onClose, onEdit }: ContentPageViewDialogProps) {
  const { data, isPending, error, refetch } = useContentPage(id);
  return (
    <Modal
      open={id !== null}
      onClose={onClose}
      title="Page details"
      maxWidth="md"
      actions={
        <>
          {onEdit && id !== null && data && (
            <Button variant="outlined" startIcon={<EditOutlined />} onClick={() => onEdit(id)}>
              Edit
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      <ContentPageDetailsContent
        page={data}
        isLoading={isPending}
        error={error}
        onRetry={() => void refetch()}
      />
    </Modal>
  );
}
