import { useState } from 'react';
import { ApiError } from '../../../services/api/apiClient';
import { useAuth } from '../AuthProvider';

export type LoginOutcome = 'signedIn' | 'needsVerification' | 'failed';

export function useLoginForm(initialIdentifier = '') {
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = identifier.trim().length > 0 && password.length > 0 && !submitting;

  async function submit(): Promise<LoginOutcome> {
    if (!canSubmit) {
      return 'failed';
    }
    setSubmitting(true);
    setError(undefined);
    try {
      await signIn(identifier.trim(), password);
      return 'signedIn';
    } catch (e) {
      if (e instanceof ApiError && e.code === 'verification_required') {
        return 'needsVerification';
      }
      setError(e instanceof ApiError ? e.message : 'Could not reach the server. Check your connection.');
      return 'failed';
    } finally {
      setSubmitting(false);
    }
  }

  return { identifier, setIdentifier, password, setPassword, error, submitting, canSubmit, submit };
}
