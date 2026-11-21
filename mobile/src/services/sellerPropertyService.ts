import { AmenityOption, PickedPhoto, PropertyDraft, SellerPropertyDetail } from '../types';
import { ApiAmenity, ApiOwnerPropertyDetail } from '../types/api';
import { apiClient } from './api/apiClient';
import {
  toAmenityOption,
  toApartmentsPayload,
  toDetailsPayload,
  toInfoPayload,
  toLocationPayload,
  toSellerPropertyDetail,
} from './mappers/sellerPropertyMapper';

/** A new key per wizard run: a retried create returns the same draft instead of making another. */
const newIdempotencyKey = () => `app-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/** The signed-in seller's own properties: the Add Property wizard (one call per step) and the detail views. */
export const sellerPropertyService = {
  async amenityCatalog(): Promise<AmenityOption[]> {
    return (await apiClient.get<ApiAmenity[]>('/amenities')).map(toAmenityOption);
  },

  /** Step 1: creates the draft; resolves with its id. */
  async createDraft(draft: PropertyDraft, idempotencyKey = newIdempotencyKey()): Promise<number> {
    const created = await apiClient.post<{ id: number }>('/properties', toDetailsPayload(draft), {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return created.id;
  },

  async saveDetails(id: number, draft: PropertyDraft): Promise<void> {
    await apiClient.patch(`/properties/${id}/steps/1`, toDetailsPayload(draft));
  },

  async saveLocation(id: number, draft: PropertyDraft): Promise<void> {
    await apiClient.patch(`/properties/${id}/steps/2`, toLocationPayload(draft));
  },

  async saveApartments(id: number, draft: PropertyDraft): Promise<void> {
    await apiClient.put(`/properties/${id}/apartments`, toApartmentsPayload(draft));
  },

  async saveInfo(id: number, draft: PropertyDraft): Promise<void> {
    await apiClient.patch(`/properties/${id}/steps/4`, toInfoPayload(draft));
  },

  async saveAmenities(id: number, amenityIds: number[]): Promise<void> {
    await apiClient.put(`/properties/${id}/amenities`, { amenityIds });
  },

  /** Uploads one photo; the first becomes the cover (`primary`). */
  async uploadPhoto(id: number, photo: PickedPhoto, primary: boolean): Promise<void> {
    const form = new FormData();
    form.append('mediaType', 'photo');
    if (primary) {
      form.append('primary', 'true');
    }
    // React Native's FormData takes { uri, name, type } for a file.
    form.append('file', { uri: photo.uri, name: photo.name, type: photo.type } as unknown as Blob);
    await apiClient.postForm(`/properties/${id}/media`, form);
  },

  async get(id: string): Promise<SellerPropertyDetail> {
    return toSellerPropertyDetail(await apiClient.get<ApiOwnerPropertyDetail>(`/properties/${id}`));
  },

  /** Same data as `get`, with the wizard's missing-field list computed for the review step. */
  async preview(id: number): Promise<SellerPropertyDetail> {
    return toSellerPropertyDetail(await apiClient.get<ApiOwnerPropertyDetail>(`/properties/${id}/preview`));
  },

  async submit(id: number): Promise<SellerPropertyDetail> {
    return toSellerPropertyDetail(await apiClient.post<ApiOwnerPropertyDetail>(`/properties/${id}/submit`));
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/properties/${id}`);
  },
};
