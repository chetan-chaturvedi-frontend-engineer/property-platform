import { z } from 'zod';

import { passwordSchema } from '@/features/auth/schemas/registerSchema';

import { isCreateStatus, USER_STATUSES } from '../types/user.types';

export type UserFormMode = 'create' | 'edit';

/**
 * Mirrors `POST /admin/users` (create) and `PATCH /admin/users/{id}` (edit); the server still validates
 * every request. Passwords are only set on create.
 */
export function userFormSchema(mode: UserFormMode) {
  return z
    .object({
      fullName: z
        .string()
        .trim()
        .min(2, 'Name must be at least 2 characters')
        .max(150, 'Name must be at most 150 characters'),
      email: z
        .string()
        .trim()
        .min(1, 'Enter an email address')
        .max(255, 'Must be at most 255 characters')
        .pipe(z.email('Enter a valid email address')),
      // Optional. Format only; the backend normalizes to E.164.
      phone: z
        .string()
        .trim()
        .regex(/^(\+?[0-9][0-9\s-]{6,19})?$/, 'Enter a valid phone number'),
      // A role slug from GET /admin/users/roles (users.user_type = roles.slug).
      userType: z.string().min(1, 'Select a role'),
      status: z.enum(USER_STATUSES, { error: 'Select a status' }),
      password: z.string(),
      passwordConfirmation: z.string(),
      /** Create only: mark the email verified so the user can sign in right away. */
      signInReady: z.boolean(),
    })
    .superRefine((values, ctx) => {
      if (mode === 'edit') {
        return;
      }
      if (!isCreateStatus(values.status)) {
        ctx.addIssue({ code: 'custom', path: ['status'], message: 'Select a status' });
      }
      const password = passwordSchema.safeParse(values.password);
      if (!password.success) {
        ctx.addIssue({
          code: 'custom',
          path: ['password'],
          message: password.error.issues[0]?.message ?? 'Enter a valid password',
        });
      }
      if (!values.passwordConfirmation) {
        ctx.addIssue({
          code: 'custom',
          path: ['passwordConfirmation'],
          message: 'Confirm the password',
        });
      } else if (values.password !== values.passwordConfirmation) {
        ctx.addIssue({
          code: 'custom',
          path: ['passwordConfirmation'],
          message: 'Passwords do not match',
        });
      }
    });
}

export type UserFormValues = z.infer<ReturnType<typeof userFormSchema>>;
