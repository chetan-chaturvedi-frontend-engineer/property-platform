import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/common/Button';
import { FormTextField, PasswordField } from '@/components/common/Input';
import { toApiError } from '@/services/api/apiError';
import { applyServerErrors } from '@/utils/helpers';

import { useLogin } from '../hooks/useAuthMutations';
import { type LoginFormValues, loginSchema } from '../schemas/loginSchema';

interface LoginFormProps {
  onSuccess: () => void;
}

function loginErrorMessage(error: unknown): string {
  const apiError = toApiError(error);
  if (apiError.code === 'rate_limited' && apiError.retryAfterSeconds !== null) {
    const minutes = Math.max(1, Math.ceil(apiError.retryAfterSeconds / 60));
    return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
  }
  return apiError.message;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const login = useLogin();
  const { control, handleSubmit, setError } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login.mutateAsync(values);
      onSuccess();
    } catch (error) {
      const message = applyServerErrors(error, setError, ['identifier', 'password']);
      setFormError(message === null ? null : loginErrorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4" aria-label="Sign in">
      {formError && <Alert severity="error">{formError}</Alert>}
      <FormTextField
        control={control}
        name="identifier"
        label="Email or phone"
        autoComplete="username"
        required
      />
      <PasswordField
        control={control}
        name="password"
        label="Password"
        autoComplete="current-password"
        required
      />
      <Button type="submit" size="large" loading={login.isPending}>
        Sign in
      </Button>
    </form>
  );
}
