import Dialog, { type DialogProps } from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { type ReactNode, useId } from 'react';

interface ModalProps extends Omit<DialogProps, 'title' | 'onClose'> {
  title: ReactNode;
  onClose: () => void;
  actions?: ReactNode;
  children: ReactNode;
}

/** Accessible dialog: labelled by its title, closes on Escape, focus is trapped while open. */
export function Modal({ title, onClose, actions, children, ...rest }: ModalProps) {
  const titleId = useId();
  return (
    <Dialog onClose={onClose} aria-labelledby={titleId} fullWidth maxWidth="sm" {...rest}>
      <DialogTitle id={titleId}>{title}</DialogTitle>
      <DialogContent>{children}</DialogContent>
      {actions && <DialogActions className="px-6 pb-4">{actions}</DialogActions>}
    </Dialog>
  );
}
