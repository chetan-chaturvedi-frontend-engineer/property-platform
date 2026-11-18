import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { toApiError } from '@/services/api/apiError';

/** Joins class names, skipping falsy values. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) {
    return '?';
  }
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/**
 * Puts the backend's field errors (400 `errors` map) on the matching form fields. Returns the message
 * to show at form level when the error does not belong to a known field, or null.
 */
export function applyServerErrors<TValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TValues>,
  knownFields: readonly Path<TValues>[],
): string | null {
  const apiError = toApiError(error);
  let unmatched = false;
  for (const [field, message] of Object.entries(apiError.fieldErrors)) {
    const known = knownFields.find((name) => name === field);
    if (known) {
      setError(known, { type: 'server', message });
    } else {
      unmatched = true;
    }
  }
  const handled = Object.keys(apiError.fieldErrors).length > 0 && !unmatched;
  return handled ? null : apiError.message;
}
