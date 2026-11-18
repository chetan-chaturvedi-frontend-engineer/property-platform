import type { ReactNode } from 'react';

import { Button } from '../Button';

import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={loading ? () => undefined : onCancel}
      maxWidth="xs"
      actions={
        <>
          <Button variant="text" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button color={destructive ? 'error' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description}
    </Modal>
  );
}
