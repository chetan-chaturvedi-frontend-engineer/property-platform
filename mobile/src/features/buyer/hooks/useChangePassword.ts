import { useState } from 'react';
import { ApiError } from '../../../services/api/apiClient';
import { authService } from '../../../services/authService';
import { passwordProblem } from '../../../utils/validation';
import { useAuth } from '../../auth/AuthProvider';

export function useChangePassword() {
  const { clearSession } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const passwordError = password.length > 0 ? passwordProblem(password) : null;
  const canSubmit = currentPassword.length > 0 && password.length > 0 && !passwordError && !submitting;

  /** The backend ends every session on success, so the caller is signed out and must sign in again. */
  async function submit(): Promise<boolean> {
    if (!canSubmit) {
      return false;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      await authService.changePassword(currentPassword, password);
      clearSession();
      return true;
    } catch (e) {
      const fields = e instanceof ApiError ? Object.values(e.fieldErrors).join(' ') : '';
      setError(e instanceof ApiError ? fields || e.message : 'Could not reach the server. Check your connection.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  return { currentPassword, setCurrentPassword, password, setPassword, passwordError, error, submitting, canSubmit, submit };
}
