import { API_ENDPOINTS } from '@/services/api/apiEndpoints';
import { apiClient } from '@/services/api/axiosInstance';
import type { PageResponse } from '@/types/api.types';
import type { EntityId } from '@/types/common.types';
import { PAGINATION } from '@/utils/constants';

import type {
  AmenityResponse,
  ApartmentRequest,
  BuilderAccount,
  CreatePropertyRequest,
  ExternalVideoRequest,
  LegalStatusRequest,
  MediaUploadRequest,
  NearbyPlaceRequest,
  Property,
  PropertyActivity,
  PropertyFilters,
  PropertyStats,
  PropertySummary,
  StatusChangeRequest,
  UpdateDetailsRequest,
  UpdateLocationRequest,
  UpdateMediaSettingsRequest,
  UpdateProjectInfoRequest,
  WizardProgress,
} from '../types/property.types';

/** Builder options per search; refine the search to find others. */
const BUILDER_OPTIONS_SIZE = 20;
/** Role slug of builder accounts (`PropertyBuilderService.BUILDER_ROLE` in the backend). */
export const BUILDER_ROLE = 'builder';

/** Drops empty filter values so they are not sent as `city=`. */
function toParams(filters: PropertyFilters): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );
}

/**
 * Optimistic locking: the version the user was looking at. A write based on stale data is rejected
 * with 409 `property_version_conflict` instead of overwriting someone else's change.
 */
function ifMatch(version: number) {
  return { headers: { 'If-Match': `"${version}"` } };
}

/** A versioned write against one property. */
export interface VersionedWrite<T> {
  id: EntityId;
  version: number;
  body: T;
}

export const propertyService = {
  async list(
    filters: PropertyFilters,
    signal?: AbortSignal,
  ): Promise<PageResponse<PropertySummary>> {
    const { data } = await apiClient.get<PageResponse<PropertySummary>>(
      API_ENDPOINTS.properties.list,
      { params: toParams(filters), signal },
    );
    return data;
  },

  /** Every property matching the filters, up to `limit`, read page by page (there is no export endpoint). */
  async listAll(
    filters: Omit<PropertyFilters, 'page' | 'size'>,
    { limit, signal }: { limit: number; signal?: AbortSignal },
  ): Promise<{ rows: PropertySummary[]; total: number }> {
    const rows: PropertySummary[] = [];
    let page = 0;
    let total = 0;
    do {
      const result = await propertyService.list(
        { ...filters, page, size: PAGINATION.maxPageSize },
        signal,
      );
      total = result.totalElements;
      rows.push(...result.content);
      page += 1;
      if (page >= result.totalPages) break;
    } while (rows.length < limit);
    return { rows: rows.slice(0, limit), total };
  },

  /**
   * Active builder accounts matching `search` (name, email or phone), by name: the users API filtered on the
   * builder role (needs `USER_LIST`). Only the fields the form uses are kept.
   */
  async builders(search: string, signal?: AbortSignal): Promise<BuilderAccount[]> {
    const { data } = await apiClient.get<PageResponse<BuilderAccount>>(API_ENDPOINTS.users.list, {
      params: {
        userType: BUILDER_ROLE,
        status: 'active',
        search: search || undefined,
        sort: 'fullName,asc',
        size: BUILDER_OPTIONS_SIZE,
      },
      signal,
    });
    return data.content.map(({ id, fullName, email, phone }) => ({ id, fullName, email, phone }));
  },

  /** Newest status changes of every property. */
  async activity(size: number, signal?: AbortSignal): Promise<PageResponse<PropertyActivity>> {
    const { data } = await apiClient.get<PageResponse<PropertyActivity>>(
      API_ENDPOINTS.properties.activity,
      { params: { page: 0, size }, signal },
    );
    return data;
  },

  async stats(signal?: AbortSignal): Promise<PropertyStats> {
    const { data } = await apiClient.get<PropertyStats>(API_ENDPOINTS.properties.stats, { signal });
    return data;
  },

  async amenityCatalog(signal?: AbortSignal): Promise<AmenityResponse[]> {
    const { data } = await apiClient.get<AmenityResponse[]>(API_ENDPOINTS.properties.amenities, {
      signal,
    });
    return data;
  },

  async get(id: EntityId, signal?: AbortSignal): Promise<Property> {
    const { data } = await apiClient.get<Property>(API_ENDPOINTS.properties.detail(id), { signal });
    return data;
  },

  async wizard(id: EntityId, signal?: AbortSignal): Promise<WizardProgress> {
    const { data } = await apiClient.get<WizardProgress>(API_ENDPOINTS.properties.wizard(id), {
      signal,
    });
    return data;
  },

  async preview(id: EntityId, signal?: AbortSignal): Promise<Property> {
    const { data } = await apiClient.get<Property>(API_ENDPOINTS.properties.preview(id), {
      signal,
    });
    return data;
  },

  /**
   * Step 1 creates the draft. The same `idempotencyKey` for retries of one form submission returns the
   * draft the first attempt created instead of creating another one.
   */
  async create(request: CreatePropertyRequest, idempotencyKey: string): Promise<Property> {
    const { data } = await apiClient.post<Property>(API_ENDPOINTS.properties.list, request, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return data;
  },

  async updateDetails({ id, version, body }: VersionedWrite<UpdateDetailsRequest>) {
    const { data } = await apiClient.patch<Property>(
      API_ENDPOINTS.properties.step(id, 1),
      body,
      ifMatch(version),
    );
    return data;
  },

  async updateLocation({ id, version, body }: VersionedWrite<UpdateLocationRequest>) {
    const { data } = await apiClient.patch<Property>(
      API_ENDPOINTS.properties.step(id, 2),
      body,
      ifMatch(version),
    );
    return data;
  },

  async syncApartments({ id, version, body }: VersionedWrite<ApartmentRequest[]>) {
    const { data } = await apiClient.put<Property>(
      API_ENDPOINTS.properties.apartments(id),
      { apartments: body },
      ifMatch(version),
    );
    return data;
  },

  async updateProjectInfo({ id, version, body }: VersionedWrite<UpdateProjectInfoRequest>) {
    const { data } = await apiClient.patch<Property>(
      API_ENDPOINTS.properties.step(id, 4),
      body,
      ifMatch(version),
    );
    return data;
  },

  async syncAmenities({ id, version, body }: VersionedWrite<EntityId[]>) {
    const { data } = await apiClient.put<Property>(
      API_ENDPOINTS.properties.propertyAmenities(id),
      { amenityIds: body },
      ifMatch(version),
    );
    return data;
  },

  async syncNearbyPlaces({ id, version, body }: VersionedWrite<NearbyPlaceRequest[]>) {
    const { data } = await apiClient.put<Property>(
      API_ENDPOINTS.properties.nearbyPlaces(id),
      { places: body },
      ifMatch(version),
    );
    return data;
  },

  async updateMediaSettings({ id, version, body }: VersionedWrite<UpdateMediaSettingsRequest>) {
    const { data } = await apiClient.patch<Property>(
      API_ENDPOINTS.properties.step(id, 6),
      body,
      ifMatch(version),
    );
    return data;
  },

  async uploadMedia({ id, version, body }: VersionedWrite<MediaUploadRequest>) {
    const form = new FormData();
    form.append('file', body.file);
    form.append('mediaType', body.mediaType);
    if (body.title) form.append('title', body.title);
    if (body.primary) form.append('primary', 'true');
    const { data } = await apiClient.post<Property>(API_ENDPOINTS.properties.media(id), form, {
      ...ifMatch(version),
      // Uploads of large videos need longer than the default API timeout.
      timeout: 0,
    });
    return data;
  },

  async addExternalVideo({ id, version, body }: VersionedWrite<ExternalVideoRequest>) {
    const { data } = await apiClient.post<Property>(
      API_ENDPOINTS.properties.media(id),
      { mediaType: 'video', url: body.url, ...(body.title ? { title: body.title } : {}) },
      ifMatch(version),
    );
    return data;
  },

  async setCover({ id, version, body: mediaId }: VersionedWrite<EntityId>) {
    const { data } = await apiClient.patch<Property>(
      API_ENDPOINTS.properties.mediaItem(id, mediaId),
      { primary: true },
      ifMatch(version),
    );
    return data;
  },

  async deleteMedia({ id, version, body: mediaId }: VersionedWrite<EntityId>) {
    const { data } = await apiClient.delete<Property>(
      API_ENDPOINTS.properties.mediaItem(id, mediaId),
      ifMatch(version),
    );
    return data;
  },

  async submit({ id, version }: Omit<VersionedWrite<unknown>, 'body'>) {
    const { data } = await apiClient.post<Property>(
      API_ENDPOINTS.properties.submit(id),
      null,
      ifMatch(version),
    );
    return data;
  },

  async publish({ id, version }: Omit<VersionedWrite<unknown>, 'body'>) {
    const { data } = await apiClient.post<Property>(
      API_ENDPOINTS.properties.publish(id),
      null,
      ifMatch(version),
    );
    return data;
  },

  async changeStatus({ id, version, body }: VersionedWrite<StatusChangeRequest>) {
    const { data } = await apiClient.patch<Property>(
      API_ENDPOINTS.properties.status(id),
      body,
      ifMatch(version),
    );
    return data;
  },

  async changeLegalStatus({ id, version, body }: VersionedWrite<LegalStatusRequest>) {
    const { data } = await apiClient.patch<Property>(
      API_ENDPOINTS.properties.legalStatus(id),
      body,
      ifMatch(version),
    );
    return data;
  },

  async remove({ id, version }: Omit<VersionedWrite<unknown>, 'body'>): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.properties.detail(id), ifMatch(version));
  },

  async restore(id: EntityId): Promise<Property> {
    const { data } = await apiClient.post<Property>(API_ENDPOINTS.properties.restore(id));
    return data;
  },
};
