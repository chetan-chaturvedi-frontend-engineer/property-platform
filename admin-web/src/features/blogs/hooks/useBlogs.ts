import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';

import { toPickedImage } from '@/hooks/useImagePicker';
import type { EntityId } from '@/types/common.types';
import type { UploadProgressHandler } from '@/utils/image';

import { blogService } from '../services/blogService';
import type {
  Blog,
  BlogFilters,
  BlogStatus,
  CreateBlogCategoryRequest,
  CreateBlogRequest,
  UpdateBlogRequest,
} from '../types/blog.types';

export const blogKeys = {
  all: ['blogs'] as const,
  lists: () => [...blogKeys.all, 'list'] as const,
  list: (filters: BlogFilters) => [...blogKeys.lists(), filters] as const,
  counts: () => [...blogKeys.all, 'counts'] as const,
  details: () => [...blogKeys.all, 'detail'] as const,
  detail: (id: EntityId) => [...blogKeys.details(), id] as const,
  slug: (slug: string) => [...blogKeys.all, 'slug', slug] as const,
  tags: () => [...blogKeys.all, 'tags'] as const,
  // Outside `all`, so writes elsewhere never re-download a copy the form is already holding.
  image: (id: EntityId) => ['blog-image-copy', id] as const,
  categories: () => ['blog-categories', 'options'] as const,
};

interface EnabledOption {
  enabled?: boolean;
}

/** A page of blogs. The previous page stays visible while the next one loads. */
export function useBlogs(filters: BlogFilters, { enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: blogKeys.list(filters),
    queryFn: ({ signal }) => blogService.list(filters, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Totals for the overview cards and tabs; independent of the list filters. */
export function useBlogCounts({ enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: blogKeys.counts(),
    queryFn: ({ signal }) => blogService.counts(signal),
    enabled,
  });
}

export function useBlog(id: EntityId | null, { enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: blogKeys.detail(id ?? 0),
    queryFn: ({ signal }) => blogService.get(id ?? 0, signal),
    enabled: enabled && id !== null,
  });
}

/** The blog that already uses `slug`, or null; empty slugs are not checked. */
export function useBlogBySlug(slug: string, { enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: blogKeys.slug(slug),
    queryFn: ({ signal }) => blogService.findBySlug(slug, signal),
    enabled: enabled && slug !== '',
    staleTime: 30_000,
  });
}

/** Tag suggestions from recent blogs; cached for 5 minutes. */
export function useBlogTagSuggestions({ enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: blogKeys.tags(),
    queryFn: ({ signal }) => blogService.recentTags(signal),
    staleTime: 5 * 60_000,
    enabled,
  });
}

/** The feature image of a blog as a picked image, for duplicating it (null when it has none). */
export function useBlogImageFile(
  blog: Pick<Blog, 'id' | 'featureImageUrl'> | undefined,
  { enabled = true }: EnabledOption = {},
) {
  return useQuery({
    queryKey: blogKeys.image(blog?.id ?? 0),
    queryFn: async ({ signal }) => {
      if (!blog) throw new Error('No blog to copy.');
      const file = await blogService.downloadFeatureImage(blog, signal);
      return file ? toPickedImage(file) : null;
    },
    enabled: enabled && blog !== undefined,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });
}

/** Categories for the pickers and the filter; rarely change, so cached for 5 minutes. */
export function useBlogCategories({ enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: blogKeys.categories(),
    queryFn: ({ signal }) => blogService.categories(signal),
    staleTime: 5 * 60_000,
    enabled,
  });
}

// Every write can change counts, public states and slugs as well as rows.
const INVALIDATE_ALL = { invalidates: [blogKeys.all] };

/** The form shows errors inline, so the global error toast is suppressed. */
export function useCreateBlog({ successMessage }: { successMessage?: string } = {}) {
  return useMutation({
    mutationFn: ({
      request,
      featureImage,
      onProgress,
    }: {
      request: CreateBlogRequest;
      featureImage: File | null;
      onProgress?: UploadProgressHandler;
    }) => blogService.create(request, featureImage, onProgress),
    meta: { ...INVALIDATE_ALL, suppressGlobalError: true, successMessage },
  });
}

/** Field edits; the form reports success once for the whole save (fields and image). */
export function useUpdateBlog() {
  return useMutation({
    mutationFn: ({ id, request }: { id: EntityId; request: UpdateBlogRequest }) =>
      blogService.update(id, request),
    meta: { ...INVALIDATE_ALL, suppressGlobalError: true },
  });
}

export function useReplaceBlogImage() {
  return useMutation({
    mutationFn: ({
      id,
      image,
      onProgress,
    }: {
      id: EntityId;
      image: File;
      onProgress?: UploadProgressHandler;
    }) => blogService.replaceFeatureImage(id, image, onProgress),
    meta: { ...INVALIDATE_ALL, suppressGlobalError: true },
  });
}

export function useRemoveBlogImage() {
  return useMutation({
    mutationFn: (id: EntityId) => blogService.removeFeatureImage(id),
    meta: { ...INVALIDATE_ALL, suppressGlobalError: true },
  });
}

/**
 * Publish (now) or unpublish (`PATCH` with `status` only). Bulk changes call this once per blog and
 * report the outcome themselves, so they pass `quiet` to skip the per-blog toast and error.
 */
export function useChangeBlogStatus({ quiet = false } = {}) {
  return useMutation({
    mutationFn: ({ id, status }: { id: EntityId; status: BlogStatus }) =>
      blogService.update(id, { status }),
    meta: {
      ...INVALIDATE_ALL,
      suppressGlobalError: quiet,
      successMessage: quiet ? undefined : 'Blog status updated.',
    },
  });
}

export function useDeleteBlog({ quiet = false } = {}) {
  return useMutation({
    mutationFn: (id: EntityId) => blogService.remove(id),
    meta: {
      ...INVALIDATE_ALL,
      suppressGlobalError: quiet,
      successMessage: quiet ? undefined : 'Blog deleted.',
    },
  });
}

export function useCreateBlogCategory() {
  return useMutation({
    mutationFn: (request: CreateBlogCategoryRequest) => blogService.createCategory(request),
    meta: {
      invalidates: [blogKeys.categories()],
      suppressGlobalError: true,
      successMessage: 'Category created.',
    },
  });
}
