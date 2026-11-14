import { useEffect, useState } from 'react';
import { ApiError } from '../../../services/api/apiClient';
import { authService } from '../../../services/authService';
import { OtpPurpose } from '../../../types';
import { isValidOtp } from '../../../utils/validation';

const RESEND_SECONDS = 30;

export function useVerifyOtp(identifier: string, purpose: OtpPurpose) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string>();
  const [info, setInfo] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) {
      return undefined;
    }
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const canSubmit = isValidOtp(otp) && !submitting;

  async function verify(): Promise<boolean> {
    if (!canSubmit) {
      return false;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      await authService.verifyOtp(identifier, otp, purpose);
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reach the server. Check your connection.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function resend(): Promise<void> {
    if (cooldown > 0) {
      return;
    }
    setError(undefined);
    try {
      await authService.resendOtp(identifier, purpose);
      setInfo('A new code has been sent.');
      setCooldown(RESEND_SECONDS);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reach the server. Check your connection.');
    }
  }

  return { otp, setOtp, error, info, submitting, canSubmit, cooldown, verify, resend };
}
