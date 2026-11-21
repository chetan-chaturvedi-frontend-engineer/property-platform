import { useState } from 'react';
import { ApiError } from '../../../services/api/apiClient';
import { authService } from '../../../services/authService';
import { useAuth } from '../../auth/AuthProvider';

export function useEditProfile() {
  const { user, setUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const trimmed = fullName.trim();
  const canSubmit = trimmed.length >= 2 && trimmed !== user?.fullName && !submitting;

  async function submit(): Promise<boolean> {
    if (!canSubmit) {
      return false;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      setUser(await authService.rename(trimmed));
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reach the server. Check your connection.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  return { user, fullName, setFullName, error, submitting, canSubmit, submit };
}
