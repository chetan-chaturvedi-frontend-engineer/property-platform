import { useState } from 'react';
import { accountService } from '../../../services/accountService';

export function useDeleteAccount(onDeleted: () => void) {
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const canDelete = confirmText.trim().toUpperCase() === 'DELETE' && !busy;

  async function deleteAccount() {
    if (!canDelete) {
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await accountService.deleteAccount();
      onDeleted();
    } catch {
      setError('We could not delete your account. Check your connection and try again, or contact support.');
    } finally {
      setBusy(false);
    }
  }

  return { confirmText, setConfirmText, canDelete, busy, error, deleteAccount };
}
