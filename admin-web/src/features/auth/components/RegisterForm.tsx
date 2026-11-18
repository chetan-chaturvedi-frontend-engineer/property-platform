import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/common/Button';
import { FormTextField, PasswordField } from '@/components/common/Input';
import { applyServerErrors } from '@/utils/helpers';

import { useRegister } from '../hooks/useAuthMutations';
import { type RegisterFormValues, registerSchema } from '../schemas/registerSchema';
import type { VerificationStatusResponse } from '../types/auth.types';

const FIELDS = ['fullName', 'email', 'phone', 'password', 'passwordConfirmation'] as const;

interface RegisterFormProps {
  onSuccess: (result: VerificationStatusResponse) => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const register = useRegister();
  const { control, handleSubmit, setError, trigger, getFieldState } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', phone: '', password: '', passwordConfirmation: '' },
    mode: 'onTouched',
  });

  // Re-check the confirmation when the password changes after the confirmation was filled in.
  const password = useWatch({ control, name: 'password' });
  useEffect(() => {
    if (getFieldState('passwordConfirmation').isTouched) {
      void trigger('passwordConfirmation');
    }
  }, [password, getFieldState, trigger]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      onSuccess(await register.mutateAsync(values));
    } catch (error) {
      setFormError(applyServerErrors(error, setError, FIELDS));
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4"
      aria-label="Create account"
    >
      {formError && <Alert severity="error">{formError}</Alert>}
      <FormTextField
        control={control}
        name="fullName"
        label="Full name"
        autoComplete="name"
        required
      />
      <FormTextField
        control={control}
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
      />
      <FormTextField
        control={control}
        name="phone"
        label="Phone"
        type="tel"
        autoComplete="tel"
        helperText="Include the country code, e.g. +91 98765 43210"
        required
      />
      <PasswordField
        control={control}
        name="password"
        label="Password"
        autoComplete="new-password"
        helperText="At least 8 characters with upper and lower case letters, a digit and a symbol"
        required
      />
      <PasswordField
        control={control}
        name="passwordConfirmation"
        label="Confirm password"
        autoComplete="new-password"
        required
      />
      <Button type="submit" size="large" loading={register.isPending}>
        Create account
      </Button>
    </form>
  );
}
