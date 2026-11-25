import { Coordinate } from '../types';
import { toCoordinate } from './mappers/propertyMapper';

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const TIMEOUT_MS = 8000;

interface NominatimHit {
  lat: string;
  lon: string;
}

/**
 * Address -> coordinates through OpenStreetMap's free Nominatim service (no key; light, one-off lookups
 * only, per its usage policy). Resolves undefined when nothing matches or the service is unreachable,
 * so callers can always continue without a pin.
 */
export const geocodingService = {
  async lookup(parts: { address?: string; locality?: string; city?: string; state?: string; pincode?: string }): Promise<Coordinate | undefined> {
    const query = [parts.address, parts.locality, parts.city, parts.state, parts.pincode]
      .map(p => p?.trim())
      .filter(Boolean)
      .join(', ');
    if (query.length < 3) {
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(`${ENDPOINT}?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(query)}`, {
        headers: { Accept: 'application/json', 'Accept-Language': 'en' },
        signal: controller.signal,
      });
      if (!response.ok) {
        return undefined;
      }
      const hits = (await response.json()) as NominatimHit[];
      return hits.length > 0 ? toCoordinate(Number(hits[0].lat), Number(hits[0].lon)) : undefined;
    } catch {
      return undefined;
    } finally {
      clearTimeout(timer);
    }
  },
};
