import type { Path, UseFormSetError } from 'react-hook-form';

import { toApiError } from '@/services/api/apiError';

import type { BlogFormValues } from '../schemas/blogSchema';

import { BLOG_FORM_FIELDS, SERVER_FIELD_ALIASES } from './blogForm';

/**
 * Puts the backend's errors on the form fields: `tags[2]` → tags, `publishedAt` → the schedule
 * input, 409 `blog_slug_taken` → slug, 413 → image. Returns the message to show above the form when
 * something could not be placed on a field, or null.
 */
export function applyBlogServerErrors(
  error: unknown,
  setError: UseFormSetError<BlogFormValues>,
  { maxImageLabel }: { maxImageLabel: string },
): string | null {
  const apiError = toApiError(error);
  if (apiError.code === 'blog_slug_taken') {
    setError('slug', { type: 'server', message: 'Another blog already uses this slug.' });
    return null;
  }
  if (apiError.status === 413) {
    setError('image', { type: 'server', message: `The image is larger than ${maxImageLabel}.` });
    return null;
  }
  const entries = Object.entries(apiError.fieldErrors);
  if (entries.length === 0) return apiError.message;
  let unmatched = false;
  for (const [rawField, message] of entries) {
    const field = rawField.replace(/\[\d+\]$/, '');
    const target: Path<BlogFormValues> | undefined =
      SERVER_FIELD_ALIASES[field] ?? BLOG_FORM_FIELDS.find((name) => name === field);
    if (target)
      setError(target, {
        type: 'server',
        message: `${message.charAt(0).toUpperCase()}${message.slice(1)}`,
      });
    else unmatched = true;
  }
  return unmatched ? apiError.message : null;
}
