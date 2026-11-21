import type { Path, UseFormSetError } from 'react-hook-form';

import { toApiError } from '@/services/api/apiError';
import { applyServerErrors } from '@/utils/helpers';

import type { ContentPageFormValues } from '../schemas/contentPageSchema';
import type {
  ContentPage,
  ContentPageStatus,
  CreateContentPageRequest,
  UpdateContentPageRequest,
} from '../types/contentPage.types';

/** Form fields the backend's field errors map to (same names as the API). */
export const CONTENT_PAGE_FORM_FIELDS: readonly Path<ContentPageFormValues>[] = [
  'heading',
  'subHeading',
  'slug',
  'content',
  'type',
  'status',
  'metaTitle',
  'metaDescription',
  'metaKeywords',
];

export function emptyContentPageForm(): ContentPageFormValues {
  return {
    heading: '',
    subHeading: '',
    slugEdited: false,
    slug: '',
    content: '',
    type: 'static',
    status: 'draft',
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
  };
}

/** A saved page's slug is fixed (a heading edit never changes it), so it starts as edited. */
export function toContentPageFormValues(page: ContentPage): ContentPageFormValues {
  return {
    heading: page.heading,
    subHeading: page.subHeading ?? '',
    slugEdited: true,
    slug: page.slug,
    content: page.content,
    type: page.type,
    status: page.status,
    metaTitle: page.metaTitle ?? '',
    metaDescription: page.metaDescription ?? '',
    metaKeywords: page.metaKeywords ?? '',
  };
}

/** Trimmed text, or undefined when blank (so the field is left out). */
const optional = (value: string) => value.trim() || undefined;

/** `POST` body. An untouched slug is left out, so the backend generates a unique one. */
export function toCreateContentPageRequest(
  values: ContentPageFormValues,
  status: ContentPageStatus,
): CreateContentPageRequest {
  return {
    heading: values.heading.trim(),
    subHeading: optional(values.subHeading),
    slug: values.slugEdited ? optional(values.slug) : undefined,
    content: values.content,
    type: values.type,
    status,
    metaTitle: optional(values.metaTitle),
    metaDescription: optional(values.metaDescription),
    metaKeywords: optional(values.metaKeywords),
  };
}

const OPTIONAL_TEXT_FIELDS = [
  'subHeading',
  'metaTitle',
  'metaDescription',
  'metaKeywords',
] as const;

/**
 * Only the fields that changed, so an unchanged status never needs the publish permission and an
 * unchanged slug is not re-checked. A cleared optional field is sent as `null`.
 */
export function toUpdateContentPageRequest(
  saved: ContentPage,
  values: ContentPageFormValues,
  status: ContentPageStatus,
): UpdateContentPageRequest {
  const request: UpdateContentPageRequest = {};
  const heading = values.heading.trim();
  const slug = values.slug.trim();
  if (heading !== saved.heading) request.heading = heading;
  if (slug && slug !== saved.slug) request.slug = slug;
  if (values.content !== saved.content) request.content = values.content;
  if (values.type !== saved.type) request.type = values.type;
  if (status !== saved.status) request.status = status;
  for (const field of OPTIONAL_TEXT_FIELDS) {
    const next = values[field].trim() || null;
    if (next !== saved[field]) request[field] = next;
  }
  return request;
}

/**
 * Puts the backend's errors on the form fields (409 `page_slug_taken` → slug). Returns the message
 * to show above the form when something could not be placed on a field, or null.
 */
export function applyContentPageServerErrors(
  error: unknown,
  setError: UseFormSetError<ContentPageFormValues>,
): string | null {
  const apiError = toApiError(error);
  switch (apiError.code) {
    case 'page_slug_taken':
      setError('slug', { type: 'server', message: 'Another page already uses this slug.' });
      return null;
    case 'page_publish_forbidden':
      return 'You do not have permission to publish or unpublish pages. Save it as a draft instead.';
    case 'page_not_found':
      return 'This page no longer exists; it may have been deleted.';
    default:
      return applyServerErrors(error, setError, CONTENT_PAGE_FORM_FIELDS);
  }
}

/** A route `:id` as a positive id, or null. */
export function parseContentPageId(value: string | null | undefined): number | null {
  if (!value || !/^\d{1,18}$/.test(value)) return null;
  const id = Number(value);
  return id > 0 && Number.isSafeInteger(id) ? id : null;
}
