import { useState } from 'react';
import { ApiError } from '../../../services/api/apiClient';
import { authService } from '../../../services/authService';
import { isValidOtp, passwordProblem } from '../../../utils/validation';

export function useResetPassword(identifier: string) {
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const passwordError = password.length > 0 ? passwordProblem(password) : null;
  const canSubmit = isValidOtp(otp) && password.length > 0 && !passwordError && !submitting;

  async function submit(): Promise<boolean> {
    if (!canSubmit) {
      return false;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      await authService.resetPassword(identifier, otp, password);
      return true;
    } catch (e) {
      const fields = e instanceof ApiError ? Object.values(e.fieldErrors).join(' ') : '';
      setError(e instanceof ApiError ? fields || e.message : 'Could not reach the server. Check your connection.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  return { otp, setOtp, password, setPassword, passwordError, error, submitting, canSubmit, submit };
}
