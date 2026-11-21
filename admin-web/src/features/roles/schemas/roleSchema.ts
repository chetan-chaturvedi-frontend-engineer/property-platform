import { z } from 'zod';

import { SLUG_PATTERN } from '@/utils/slug';

import { ROLE_STATUSES } from '../types/role.types';
import {
  ROLE_DESCRIPTION_MAX_LENGTH,
  ROLE_NAME_MAX_LENGTH,
  ROLE_SLUG_MAX_LENGTH,
} from '../utils/roleDisplay';

const name = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(ROLE_NAME_MAX_LENGTH, `Name must be at most ${ROLE_NAME_MAX_LENGTH} characters`);

const description = z
  .string()
  .trim()
  .max(ROLE_DESCRIPTION_MAX_LENGTH, `Must be at most ${ROLE_DESCRIPTION_MAX_LENGTH} characters`);

/** Mirrors `PATCH /admin/roles/{id}` (the slug never changes); the server still validates. */
export const roleDetailsSchema = z.object({
  name,
  description,
  status: z.enum(ROLE_STATUSES),
});
export type RoleDetailsValues = z.infer<typeof roleDetailsSchema>;

/** Mirrors `POST /admin/roles`. Permissions are edited in the matrix, outside the form. */
export const createRoleSchema = roleDetailsSchema.extend({
  slug: z
    .string()
    .trim()
    .min(2, 'Slug must be at least 2 characters')
    .max(ROLE_SLUG_MAX_LENGTH, `Slug must be at most ${ROLE_SLUG_MAX_LENGTH} characters`)
    .regex(SLUG_PATTERN, 'Use lowercase letters, digits and single hyphens'),
});
export type CreateRoleValues = z.infer<typeof createRoleSchema>;
