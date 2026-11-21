import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';

import type { EntityId } from '@/types/common.types';

import { contentPageService } from '../services/contentPageService';
import type {
  ContentPageFilters,
  ContentPageStatus,
  CreateContentPageRequest,
  UpdateContentPageRequest,
} from '../types/contentPage.types';

export const contentPageKeys = {
  all: ['content-pages'] as const,
  lists: () => [...contentPageKeys.all, 'list'] as const,
  list: (filters: ContentPageFilters) => [...contentPageKeys.lists(), filters] as const,
  counts: () => [...contentPageKeys.all, 'counts'] as const,
  slug: (slug: string) => [...contentPageKeys.all, 'slug', slug] as const,
  details: () => [...contentPageKeys.all, 'detail'] as const,
  detail: (id: EntityId) => [...contentPageKeys.details(), id] as const,
};

interface EnabledOption {
  enabled?: boolean;
}

/** A page of content pages. The previous page stays visible while the next one loads. */
export function useContentPages(
  filters: ContentPageFilters,
  { enabled = true }: EnabledOption = {},
) {
  return useQuery({
    queryKey: contentPageKeys.list(filters),
    queryFn: ({ signal }) => contentPageService.list(filters, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Totals for the overview cards; independent of the list filters. */
export function useContentPageCounts({ enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: contentPageKeys.counts(),
    queryFn: ({ signal }) => contentPageService.counts(signal),
    enabled,
  });
}

/** One page with its content and SEO fields; `null` loads nothing. */
export function useContentPage(id: EntityId | null, { enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: contentPageKeys.detail(id ?? 0),
    queryFn: ({ signal }) => contentPageService.get(id ?? 0, signal),
    enabled: enabled && id !== null,
  });
}

/** The page that already uses `slug`, or null; empty slugs are not checked. Only a hint. */
export function useContentPageBySlug(slug: string, { enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: contentPageKeys.slug(slug),
    queryFn: ({ signal }) => contentPageService.findBySlug(slug, signal),
    enabled: enabled && slug !== '',
    retry: false,
  });
}

// Every write can change rows, details, counts and slug owners.
const INVALIDATE_ALL = { invalidates: [contentPageKeys.all] };

/** The form shows errors inline, so the global error toast is suppressed. */
export function useCreateContentPage() {
  return useMutation({
    mutationFn: (request: CreateContentPageRequest) => contentPageService.create(request),
    meta: { ...INVALIDATE_ALL, suppressGlobalError: true },
  });
}

export function useUpdateContentPage() {
  return useMutation({
    mutationFn: ({ id, request }: { id: EntityId; request: UpdateContentPageRequest }) =>
      contentPageService.update(id, request),
    meta: { ...INVALIDATE_ALL, suppressGlobalError: true },
  });
}

/**
 * Publish or unpublish (`PATCH` with `status` only). Bulk changes call this once per page and report
 * the outcome themselves, so they pass `quiet` to skip the per-page toast and error.
 */
export function useChangeContentPageStatus({ quiet = false } = {}) {
  return useMutation({
    mutationFn: ({ id, status }: { id: EntityId; status: ContentPageStatus }) =>
      contentPageService.update(id, { status }),
    meta: {
      ...INVALIDATE_ALL,
      suppressGlobalError: quiet,
      successMessage: quiet ? undefined : 'Page status updated.',
    },
  });
}

export function useDeleteContentPage({ quiet = false } = {}) {
  return useMutation({
    mutationFn: (id: EntityId) => contentPageService.remove(id),
    meta: {
      ...INVALIDATE_ALL,
      suppressGlobalError: quiet,
      successMessage: quiet ? undefined : 'Page deleted.',
    },
  });
}
