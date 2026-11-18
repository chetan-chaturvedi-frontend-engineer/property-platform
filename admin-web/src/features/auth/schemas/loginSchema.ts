import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Enter your email address or phone number')
    .max(255, 'Must be at most 255 characters'),
  password: z.string().min(1, 'Enter your password').max(128, 'Must be at most 128 characters'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
