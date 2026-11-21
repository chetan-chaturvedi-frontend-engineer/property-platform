import { useState } from 'react';
import { ApiError } from '../../../services/api/apiClient';
import { accountService } from '../../../services/accountService';
import { useAuth } from '../../auth/AuthProvider';

export function useDeleteAccount(onDeleted: () => void) {
  const { clearSession } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const canDelete = confirmText.trim().toUpperCase() === 'DELETE' && password.length > 0 && !busy;

  async function deleteAccount() {
    if (!canDelete) {
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await accountService.deleteAccount(password);
      clearSession();
      onDeleted();
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 422
          ? 'That password is incorrect.'
          : 'We could not delete your account. Check your connection and try again, or contact support.',
      );
    } finally {
      setBusy(false);
    }
  }

  return { confirmText, setConfirmText, password, setPassword, canDelete, busy, error, deleteAccount };
}
