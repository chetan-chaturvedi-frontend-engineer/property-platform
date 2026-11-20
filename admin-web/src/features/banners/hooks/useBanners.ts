import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';

import { toPickedImage } from '@/hooks/useImagePicker';
import type { EntityId } from '@/types/common.types';

import { bannerService } from '../services/bannerService';
import type {
  BannerFilters,
  BannerStatus,
  CreateBannerRequest,
  UpdateBannerRequest,
  UploadProgressHandler,
} from '../types/banner.types';

export const bannerKeys = {
  all: ['banners'] as const,
  lists: () => [...bannerKeys.all, 'list'] as const,
  list: (filters: BannerFilters) => [...bannerKeys.lists(), filters] as const,
  counts: () => [...bannerKeys.all, 'counts'] as const,
  details: () => [...bannerKeys.all, 'detail'] as const,
  detail: (id: EntityId) => [...bannerKeys.details(), id] as const,
  activity: (id: EntityId) => [...bannerKeys.all, 'activity', id] as const,
  // Outside `all`, so writes elsewhere never re-download a copy the form is already holding.
  image: (id: EntityId) => ['banner-image-copy', id] as const,
  contentPages: () => ['content-pages', 'published'] as const,
};

interface EnabledOption {
  enabled?: boolean;
}

/** A page of banners. The previous page stays visible while the next one loads. */
export function useBanners(filters: BannerFilters, { enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: bannerKeys.list(filters),
    queryFn: ({ signal }) => bannerService.list(filters, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Totals for the overview cards; independent of the list filters. */
export function useBannerCounts({ enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: bannerKeys.counts(),
    queryFn: ({ signal }) => bannerService.counts(signal),
    enabled,
  });
}

export function useBanner(id: EntityId | null, { enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: bannerKeys.detail(id ?? 0),
    queryFn: ({ signal }) => bannerService.get(id ?? 0, signal),
    enabled: enabled && id !== null,
  });
}

/** The image of a banner as a picked image, for duplicating it. Not cached beyond the form's lifetime. */
export function useBannerImageFile(
  banner: { id: EntityId; imageUrl: string } | undefined,
  { enabled = true }: EnabledOption = {},
) {
  return useQuery({
    queryKey: bannerKeys.image(banner?.id ?? 0),
    queryFn: async ({ signal }) => {
      if (!banner) throw new Error('No banner to copy.');
      return toPickedImage(await bannerService.downloadImage(banner, signal));
    },
    enabled: enabled && banner !== undefined,
    staleTime: Infinity,
    gcTime: 0,
  });
}

export function useBannerActivity(id: EntityId, { enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: bannerKeys.activity(id),
    queryFn: ({ signal }) => bannerService.activity(id, signal),
    enabled,
  });
}

/** Published content pages for the internal link picker; rarely change, so cached for 5 minutes. */
export function useContentPages({ enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: bannerKeys.contentPages(),
    queryFn: ({ signal }) => bannerService.contentPages(signal),
    staleTime: 5 * 60_000,
    enabled,
  });
}

// Every write can change counts and display states as well as rows, so the whole key space is refreshed.
const INVALIDATE_ALL = { invalidates: [bannerKeys.all] };

/** The form shows errors inline, so the global error toast is suppressed. */
export function useCreateBanner({ successMessage = 'Banner created.' } = {}) {
  return useMutation({
    mutationFn: ({
      request,
      image,
      onProgress,
    }: {
      request: CreateBannerRequest;
      image: File;
      onProgress?: UploadProgressHandler;
    }) => bannerService.create(request, image, onProgress),
    meta: { ...INVALIDATE_ALL, suppressGlobalError: true, successMessage },
  });
}

/** Field edits; the form reports success once for the whole save (fields and image). */
export function useUpdateBanner() {
  return useMutation({
    mutationFn: ({ id, request }: { id: EntityId; request: UpdateBannerRequest }) =>
      bannerService.update(id, request),
    meta: { ...INVALIDATE_ALL, suppressGlobalError: true },
  });
}

export function useReplaceBannerImage() {
  return useMutation({
    mutationFn: ({
      id,
      image,
      onProgress,
    }: {
      id: EntityId;
      image: File;
      onProgress?: UploadProgressHandler;
    }) => bannerService.replaceImage(id, image, onProgress),
    meta: { ...INVALIDATE_ALL, suppressGlobalError: true },
  });
}

/**
 * Status changes (`PATCH` with `status` only). Bulk changes call this once per banner and report
 * the outcome themselves, so they pass `quiet` to skip the per-banner toast and error.
 */
export function useChangeBannerStatus({ quiet = false } = {}) {
  return useMutation({
    mutationFn: ({ id, status }: { id: EntityId; status: BannerStatus }) =>
      bannerService.update(id, { status }),
    meta: {
      ...INVALIDATE_ALL,
      suppressGlobalError: quiet,
      successMessage: quiet ? undefined : 'Banner status updated.',
    },
  });
}

export function useDeleteBanner({ quiet = false } = {}) {
  return useMutation({
    mutationFn: (id: EntityId) => bannerService.remove(id),
    meta: {
      ...INVALIDATE_ALL,
      suppressGlobalError: quiet,
      successMessage: quiet ? undefined : 'Banner deleted.',
    },
  });
}
