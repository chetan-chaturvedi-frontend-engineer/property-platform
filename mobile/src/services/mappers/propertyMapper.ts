import { env } from '../../config/env';
import { Amenity, PossessionStatus, Property, Unit } from '../../types';
import {
  ApiAmenity,
  ApiApartment,
  ApiApartmentType,
  ApiProjectStatus,
  ApiPublicProperty,
  ApiPublicPropertySummary,
} from '../../types/api';
import { formatCompactPrice, formatIndianNumber } from '../../utils/format';

const STATUS: Record<ApiProjectStatus, PossessionStatus> = {
  upcoming: 'New Launch',
  under_construction: 'Under Construction',
  ready_to_move: 'Ready to Move',
  completed: 'Ready to Move',
  on_hold: 'Under Construction',
  cancelled: 'Under Construction',
};

/** Backend amenity icon keys -> Ionicons names; anything unknown falls back to a check mark. */
const AMENITY_ICONS: Record<string, string> = {
  pool: 'water-outline',
  gym: 'barbell-outline',
  clubhouse: 'home-outline',
  playground: 'happy-outline',
  garden: 'leaf-outline',
  jogging: 'walk-outline',
  cctv: 'videocam-outline',
  shield: 'shield-checkmark-outline',
};

const TONES = 4;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Media paths from the API are relative to the server; external URLs are already absolute. */
export function absoluteUrl(url: string | null | undefined): string | undefined {
  if (!url) {
    return undefined;
  }
  return /^https?:\/\//.test(url) ? url : `${env.apiBaseUrl.replace(/\/api\/v1$/, '')}${url}`;
}

/** [2bhk, 3bhk, 4bhk] -> "2, 3 & 4 BHK Apartments"; a penthouse is appended by name. */
export function configLabel(types: ApiApartmentType[]): string {
  const bhk = types.filter(t => t !== 'penthouse').map(t => t.replace('bhk', ''));
  const parts: string[] = [];
  if (bhk.length > 0) {
    const head = bhk.length > 1 ? `${bhk.slice(0, -1).join(', ')} & ${bhk[bhk.length - 1]}` : bhk[0];
    parts.push(`${head} BHK Apartments`);
  }
  if (types.includes('penthouse')) {
    parts.push('Penthouse');
  }
  return parts.join(' + ');
}

export function areaLabel(apartments: Pick<ApiApartment, 'areaMin' | 'areaMax' | 'areaUnit'>[]): string {
  const mins = apartments.map(a => a.areaMin).filter((v): v is number => v !== null);
  const maxs = apartments.map(a => a.areaMax).filter((v): v is number => v !== null);
  if (mins.length === 0 || maxs.length === 0) {
    return '';
  }
  const unit = apartments[0].areaUnit === 'sq_m' ? 'sq.m.' : 'sq.ft.';
  const lo = Math.min(...mins);
  const hi = Math.max(...maxs);
  return lo === hi ? `${formatIndianNumber(lo)} ${unit}` : `${formatIndianNumber(lo)} - ${formatIndianNumber(hi)} ${unit}`;
}

function possessionLabel(date: string | null): string {
  if (!date) {
    return 'TBA';
  }
  const [year, month] = date.split('-');
  return `${MONTHS[Number(month) - 1] ?? ''} ${year}`.trim();
}

function areaOf(location: { city: string | null; locality: string | null }): string {
  return [location.locality, location.city].filter(Boolean).join(', ');
}

function priceLabel(value: number | null): string {
  return value === null ? 'Price on request' : `${formatCompactPrice(value)}*`;
}

export function toPropertyFromSummary(s: ApiPublicPropertySummary): Property {
  return {
    id: s.slug,
    propertyId: s.id,
    coverUrl: absoluteUrl(s.coverUrl),
    name: s.projectName,
    area: areaOf(s),
    config: configLabel(s.apartmentTypes),
    price: priceLabel(s.startingPrice),
    sqft: '',
    facing: '',
    status: STATUS[s.projectStatus],
    possession: '',
    photos: s.coverUrl ? 1 : 0,
    tone: s.id % TONES,
  };
}

export function toProperty(d: ApiPublicProperty): Property {
  const photos = d.media.filter(m => m.mediaType === 'photo');
  const cover = photos.find(m => m.primary) ?? photos[0];
  const prices = d.apartments.map(a => a.startingPrice);
  return {
    id: d.slug,
    propertyId: d.id,
    coverUrl: absoluteUrl(cover?.url),
    name: d.projectName,
    area: areaOf(d.location),
    config: configLabel([...new Set(d.apartments.map(a => a.apartmentType))]),
    price: priceLabel(prices.length > 0 ? Math.min(...prices) : null),
    sqft: areaLabel(d.apartments),
    facing: '',
    status: STATUS[d.projectStatus],
    possession: possessionLabel(d.possessionEndDate),
    photos: photos.length,
    tone: d.id % TONES,
  };
}

export function toUnit(a: ApiApartment): Unit {
  return {
    id: String(a.id),
    name: a.apartmentName,
    sqft: areaLabel([a]),
    facing: '',
    price: `${formatCompactPrice(a.startingPrice)}*`,
  };
}

export function amenityIcon(key: string | null): string {
  return AMENITY_ICONS[key ?? ''] ?? 'checkmark-circle-outline';
}

export function toAmenity(a: ApiAmenity): Amenity {
  return { icon: amenityIcon(a.icon), label: a.name };
}
