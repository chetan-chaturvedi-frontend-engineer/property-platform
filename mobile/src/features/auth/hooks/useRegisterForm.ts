import { useState } from 'react';
import { ApiError } from '../../../services/api/apiClient';
import { authService } from '../../../services/authService';
import { isValidEmail, normalizeIndianPhone, passwordProblem } from '../../../utils/validation';

export type RegisterErrors = Partial<Record<'fullName' | 'email' | 'phone' | 'password' | 'form', string>>;

export function useRegisterForm() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): RegisterErrors {
    const found: RegisterErrors = {};
    if (fullName.trim().length < 2) {
      found.fullName = 'Enter your full name';
    }
    if (!isValidEmail(email)) {
      found.email = 'Enter a valid email address';
    }
    if (!normalizeIndianPhone(phone)) {
      found.phone = 'Enter a 10-digit mobile number';
    }
    const weak = passwordProblem(password);
    if (weak) {
      found.password = weak;
    }
    return found;
  }

  /** Resolves with the email to verify, or undefined when validation or the request failed. */
  async function submit(): Promise<string | undefined> {
    const found = validate();
    setErrors(found);
    const normalizedPhone = normalizeIndianPhone(phone);
    if (Object.keys(found).length > 0 || !normalizedPhone || submitting) {
      return undefined;
    }
    setSubmitting(true);
    try {
      await authService.register({ fullName: fullName.trim(), email: email.trim(), phone: normalizedPhone, password });
      return email.trim();
    } catch (e) {
      if (e instanceof ApiError) {
        const { fullName: n, email: m, phone: p, password: w } = e.fieldErrors;
        setErrors({ fullName: n, email: m, phone: p, password: w, form: n || m || p || w ? undefined : e.message });
      } else {
        setErrors({ form: 'Could not reach the server. Check your connection.' });
      }
      return undefined;
    } finally {
      setSubmitting(false);
    }
  }

  return { fullName, setFullName, email, setEmail, phone, setPhone, password, setPassword, errors, submitting, submit };
}
