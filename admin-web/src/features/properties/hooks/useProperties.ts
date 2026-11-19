import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { EntityId } from '@/types/common.types';

import { propertyService, type VersionedWrite } from '../services/propertyService';
import type {
  ApartmentRequest,
  CreatePropertyRequest,
  ExternalVideoRequest,
  LegalStatusRequest,
  MediaUploadRequest,
  NearbyPlaceRequest,
  Property,
  PropertyFilters,
  StatusChangeRequest,
  UpdateDetailsRequest,
  UpdateLocationRequest,
  UpdateMediaSettingsRequest,
  UpdateProjectInfoRequest,
} from '../types/property.types';

export const propertyKeys = {
  all: ['properties'] as const,
  lists: () => [...propertyKeys.all, 'list'] as const,
  list: (filters: PropertyFilters) => [...propertyKeys.lists(), filters] as const,
  stats: () => [...propertyKeys.all, 'stats'] as const,
  amenities: () => [...propertyKeys.all, 'amenities'] as const,
  details: () => [...propertyKeys.all, 'detail'] as const,
  detail: (id: EntityId) => [...propertyKeys.details(), id] as const,
};

interface EnabledOption {
  enabled?: boolean;
}

/** A page of properties. The previous page stays visible while the next one loads. */
export function useProperties(filters: PropertyFilters, { enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: propertyKeys.list(filters),
    queryFn: ({ signal }) => propertyService.list(filters, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function usePropertyStats({ enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: propertyKeys.stats(),
    queryFn: ({ signal }) => propertyService.stats(signal),
    enabled,
  });
}

/** The amenity catalog rarely changes. */
export function useAmenityCatalog({ enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: propertyKeys.amenities(),
    queryFn: ({ signal }) => propertyService.amenityCatalog(signal),
    staleTime: 10 * 60_000,
    enabled,
  });
}

/** The admin view of one property; it carries the wizard progress and the version for `If-Match`. */
export function useProperty(id: EntityId | null, { enabled = true }: EnabledOption = {}) {
  return useQuery({
    queryKey: propertyKeys.detail(id ?? 0),
    queryFn: ({ signal }) => propertyService.get(id ?? 0, signal),
    enabled: enabled && id !== null,
  });
}

/** `GET /preview`: everything saved plus what is missing; rate-limited, so fetched only on the preview step. */
export function usePropertyPreview(id: EntityId) {
  return useQuery({
    queryKey: [...propertyKeys.detail(id), 'preview'] as const,
    queryFn: ({ signal }) => propertyService.preview(id, signal),
    staleTime: 0,
  });
}

// Writes change counts and list rows; the property itself comes back in the response.
const REFRESH_LISTS = { invalidates: [propertyKeys.lists(), propertyKeys.stats()] };

/**
 * A write that returns the updated property: it replaces the cached detail, so the next write sends
 * the new version, and refreshes lists and statistics.
 */
function usePropertyWrite<TVariables>(
  mutationFn: (variables: TVariables) => Promise<Property>,
  meta: { successMessage?: string; suppressGlobalError?: boolean } = {},
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (property) => {
      queryClient.setQueryData(propertyKeys.detail(property.id), property);
    },
    meta: { ...REFRESH_LISTS, ...meta },
  });
}

// Wizard forms show errors inline (field errors and conflicts).
const FORM = { suppressGlobalError: true } as const;

export function useCreateProperty() {
  return usePropertyWrite(
    ({ request, idempotencyKey }: { request: CreatePropertyRequest; idempotencyKey: string }) =>
      propertyService.create(request, idempotencyKey),
    { ...FORM, successMessage: 'Draft created.' },
  );
}

export function useUpdateDetails() {
  return usePropertyWrite(
    (write: VersionedWrite<UpdateDetailsRequest>) => propertyService.updateDetails(write),
    { ...FORM, successMessage: 'Property details saved.' },
  );
}

export function useUpdateLocation() {
  return usePropertyWrite(
    (write: VersionedWrite<UpdateLocationRequest>) => propertyService.updateLocation(write),
    { ...FORM, successMessage: 'Location saved.' },
  );
}

export function useSyncApartments() {
  return usePropertyWrite(
    (write: VersionedWrite<ApartmentRequest[]>) => propertyService.syncApartments(write),
    { ...FORM, successMessage: 'Unit types saved.' },
  );
}

export function useUpdateProjectInfo() {
  return usePropertyWrite(
    (write: VersionedWrite<UpdateProjectInfoRequest>) => propertyService.updateProjectInfo(write),
    { ...FORM, successMessage: 'Project information saved.' },
  );
}

export function useSyncAmenities() {
  return usePropertyWrite(
    (write: VersionedWrite<EntityId[]>) => propertyService.syncAmenities(write),
    { ...FORM, successMessage: 'Amenities saved.' },
  );
}

export function useSyncNearbyPlaces() {
  return usePropertyWrite(
    (write: VersionedWrite<NearbyPlaceRequest[]>) => propertyService.syncNearbyPlaces(write),
    { ...FORM, successMessage: 'Nearby places saved.' },
  );
}

export function useUpdateMediaSettings() {
  return usePropertyWrite(
    (write: VersionedWrite<UpdateMediaSettingsRequest>) =>
      propertyService.updateMediaSettings(write),
    { ...FORM, successMessage: '3D tour saved.' },
  );
}

export function useUploadMedia() {
  return usePropertyWrite(
    (write: VersionedWrite<MediaUploadRequest>) => propertyService.uploadMedia(write),
    { ...FORM, successMessage: 'File uploaded.' },
  );
}

export function useAddExternalVideo() {
  return usePropertyWrite(
    (write: VersionedWrite<ExternalVideoRequest>) => propertyService.addExternalVideo(write),
    { ...FORM, successMessage: 'Video linked.' },
  );
}

export function useSetCover() {
  return usePropertyWrite((write: VersionedWrite<EntityId>) => propertyService.setCover(write), {
    successMessage: 'Cover photo changed.',
  });
}

export function useDeleteMedia() {
  return usePropertyWrite((write: VersionedWrite<EntityId>) => propertyService.deleteMedia(write), {
    successMessage: 'File removed.',
  });
}

export function useSubmitProperty() {
  return usePropertyWrite(
    (write: Omit<VersionedWrite<unknown>, 'body'>) => propertyService.submit(write),
    { ...FORM, successMessage: 'Submitted for review.' },
  );
}

export function usePublishProperty() {
  return usePropertyWrite(
    (write: Omit<VersionedWrite<unknown>, 'body'>) => propertyService.publish(write),
    { ...FORM, successMessage: 'Property published.' },
  );
}

export function useChangePropertyStatus() {
  return usePropertyWrite(
    (write: VersionedWrite<StatusChangeRequest>) => propertyService.changeStatus(write),
    { ...FORM, successMessage: 'Status updated.' },
  );
}

export function useChangeLegalStatus() {
  return usePropertyWrite(
    (write: VersionedWrite<LegalStatusRequest>) => propertyService.changeLegalStatus(write),
    { ...FORM, successMessage: 'Legal status updated.' },
  );
}

export function useRestoreProperty() {
  return usePropertyWrite((id: EntityId) => propertyService.restore(id), {
    successMessage: 'Property restored.',
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (write: Omit<VersionedWrite<unknown>, 'body'>) => propertyService.remove(write),
    onSuccess: (_data, { id }) => {
      queryClient.removeQueries({ queryKey: propertyKeys.detail(id) });
    },
    meta: { ...REFRESH_LISTS, successMessage: 'Property deleted.' },
  });
}
