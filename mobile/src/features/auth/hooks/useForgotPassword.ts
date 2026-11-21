import { useState } from 'react';
import { ApiError } from '../../../services/api/apiClient';
import { authService } from '../../../services/authService';

export function useForgotPassword(initialIdentifier = '') {
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = identifier.trim().length > 0 && !submitting;

  /** The backend answers the same whether or not the account exists, so success never reveals it. */
  async function submit(): Promise<boolean> {
    if (!canSubmit) {
      return false;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      await authService.forgotPassword(identifier.trim());
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reach the server. Check your connection.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  return { identifier, setIdentifier, error, submitting, canSubmit, submit };
}
