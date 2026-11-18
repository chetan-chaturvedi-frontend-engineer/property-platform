import { z } from 'zod';

import { PASSWORD_RULES } from '@/utils/constants';

/** Same policy as the backend's @StrongPassword; the server still validates every request. */
export const passwordSchema = z
  .string()
  .min(PASSWORD_RULES.minLength, `Must be at least ${PASSWORD_RULES.minLength} characters`)
  .max(PASSWORD_RULES.maxLength, `Must be at most ${PASSWORD_RULES.maxLength} characters`)
  .regex(/[A-Z]/, 'Must contain an uppercase letter')
  .regex(/[a-z]/, 'Must contain a lowercase letter')
  .regex(/\d/, 'Must contain a digit')
  .regex(/[^A-Za-z0-9]/, 'Must contain a special character');

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(150, 'Name must be at most 150 characters'),
    email: z
      .string()
      .trim()
      .min(1, 'Enter your email address')
      .max(255, 'Must be at most 255 characters')
      .pipe(z.email('Enter a valid email address')),
    // Format only; the backend normalizes to E.164 and is the authority on validity.
    phone: z
      .string()
      .trim()
      .min(1, 'Enter your phone number')
      .regex(/^\+?[0-9][0-9\s-]{6,19}$/, 'Enter a valid phone number'),
    password: passwordSchema,
    passwordConfirmation: z.string().min(1, 'Confirm your password'),
  })
  // Form-level rule, reported on the confirmation field.
  .refine((values) => values.password === values.passwordConfirmation, {
    message: 'Passwords do not match',
    path: ['passwordConfirmation'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
