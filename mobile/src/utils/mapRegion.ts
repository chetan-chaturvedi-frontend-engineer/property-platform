import { Coordinate, MapBounds } from '../types';

/** What react-native-maps reports for the visible area. */
export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

/** Roughly the middle of India, used until there are pins to frame. */
export const DEFAULT_REGION: MapRegion = { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 22, longitudeDelta: 22 };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value * 1e6) / 1e6;

/** Visible area as a backend bounding box: clamped to valid degrees, 6 decimals (the backend's precision). */
export function regionToBounds(region: MapRegion): MapBounds {
  return {
    minLat: round(clamp(region.latitude - region.latitudeDelta / 2, -90, 90)),
    maxLat: round(clamp(region.latitude + region.latitudeDelta / 2, -90, 90)),
    minLng: round(clamp(region.longitude - region.longitudeDelta / 2, -180, 180)),
    maxLng: round(clamp(region.longitude + region.longitudeDelta / 2, -180, 180)),
  };
}

/** Stable key so an unchanged box does not trigger another request. */
export function boundsKey(bounds: MapBounds | null): string {
  return bounds ? `${bounds.minLat},${bounds.maxLat},${bounds.minLng},${bounds.maxLng}` : '';
}

/** True when the point lies inside the box, edges included. */
export function inBounds(point: Coordinate, bounds: MapBounds): boolean {
  return (
    point.latitude >= bounds.minLat &&
    point.latitude <= bounds.maxLat &&
    point.longitude >= bounds.minLng &&
    point.longitude <= bounds.maxLng
  );
}

/** A region that frames all points with some padding; a single point gets a neighbourhood-sized view. */
export function regionForCoordinates(points: Coordinate[]): MapRegion | undefined {
  if (points.length === 0) {
    return undefined;
  }
  const lats = points.map(p => p.latitude);
  const lngs = points.map(p => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.4, 0.02),
    longitudeDelta: Math.max((maxLng - minLng) * 1.4, 0.02),
  };
}
