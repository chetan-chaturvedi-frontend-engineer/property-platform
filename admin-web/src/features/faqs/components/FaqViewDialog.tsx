import EditOutlined from '@mui/icons-material/EditOutlined';

import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';

import { useFaq } from '../hooks/useFaqs';
import type { FaqCategory } from '../types/faq.types';

import { FaqDetailsContent } from './FaqDetailsContent';

interface FaqViewDialogProps {
  /** The FAQ to show; null closes the dialog. */
  id: number | null;
  categories: readonly FaqCategory[];
  onClose: () => void;
  /** Opens the edit form; omitted without permission. */
  onEdit?: (id: number) => void;
}

/** Read-only FAQ details in a dialog. */
export function FaqViewDialog({ id, categories, onClose, onEdit }: FaqViewDialogProps) {
  const { data, isPending, error, refetch } = useFaq(id);
  return (
    <Modal
      open={id !== null}
      onClose={onClose}
      title="FAQ details"
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
      <FaqDetailsContent
        faq={data}
        categories={categories}
        isLoading={isPending}
        error={error}
        onRetry={() => void refetch()}
      />
    </Modal>
  );
}
