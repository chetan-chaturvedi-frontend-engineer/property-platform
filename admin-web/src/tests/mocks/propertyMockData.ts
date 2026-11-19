import type {
  AmenityResponse,
  ApartmentResponse,
  ApartmentType,
  LegalApprovalStatus,
  MediaResponse,
  ProjectStatus,
  Property,
  PropertyType,
  PublicationStatus,
  WizardProgress,
} from '@/features/properties/types/property.types';

/** A property as the mock backend stores it; `wizard` is recomputed on every response. */
export type StoredProperty = Omit<Property, 'wizard'> & {
  ownerId: number;
  deletedAt?: string;
};

/** Mirrors the seeded `property_amenities` catalog (a subset). */
export const AMENITY_CATALOG: AmenityResponse[] = [
  { id: 1, name: 'Swimming Pool', slug: 'swimming-pool', category: 'lifestyle', icon: 'pool' },
  { id: 2, name: 'Gymnasium', slug: 'gymnasium', category: 'lifestyle', icon: 'gym' },
  { id: 3, name: 'Club House', slug: 'club-house', category: 'lifestyle', icon: 'club' },
  {
    id: 4,
    name: "Children's Play Area",
    slug: 'children-play-area',
    category: 'lifestyle',
    icon: 'play',
  },
  {
    id: 5,
    name: '24x7 Security',
    slug: '24x7-security',
    category: 'convenience',
    icon: 'security',
  },
  { id: 6, name: 'Power Backup', slug: 'power-backup', category: 'convenience', icon: 'power' },
  { id: 7, name: 'Lift', slug: 'lift', category: 'convenience', icon: 'lift' },
  {
    id: 8,
    name: 'Rain Water Harvesting',
    slug: 'rain-water-harvesting',
    category: 'sustainability',
    icon: 'water',
  },
];

const STEP_TITLES = [
  ['details', 'Property details'],
  ['location', 'Location'],
  ['apartments', 'Unit types and apartments'],
  ['project_info', 'Project information'],
  ['amenities', 'Amenities'],
  ['media', 'Media'],
  ['preview', 'Preview and submit'],
] as const;

/** Same completion rules as `PropertyWizardService`. */
export function evaluateWizard(p: StoredProperty): WizardProgress {
  const missing: string[][] = [
    [],
    (['projectAddress', 'city', 'locality', 'pincode', 'state'] as const).filter(
      (f) => !p.location[f],
    ),
    p.apartments.length === 0
      ? ['apartments']
      : p.apartments.some((a) => a.areaMin == null || a.areaMax == null)
        ? ['areaRange']
        : [],
    p.projectInfo.projectDescription ? [] : ['projectDescription'],
    p.amenities.length ? [] : ['amenities'],
    p.media.some((m) => m.mediaType === 'photo') ? [] : ['photos'],
  ];
  const complete = missing.map((m) => m.length === 0);
  const firstIncomplete = complete.findIndex((c) => !c);
  const ready = firstIncomplete === -1;
  const submitted = !['draft', 'rejected'].includes(p.publicationStatus);
  const steps = STEP_TITLES.map(([key, title], index) => ({
    step: index + 1,
    key,
    title,
    complete: index < 6 ? (complete[index] ?? false) : submitted,
    missing: index < 6 ? (missing[index] ?? []) : [],
  }));
  return {
    propertyId: p.id,
    version: p.version,
    publicationStatus: p.publicationStatus,
    currentStep: ready ? 7 : firstIncomplete + 1,
    completedSteps: steps.filter((s) => s.complete).map((s) => s.step),
    readyToSubmit: ready && ['draft', 'rejected'].includes(p.publicationStatus),
    steps,
  };
}

const NAMES = [
  'Dream Heights Apartments',
  'Skyline Residency',
  'Green Valley Villas',
  'Urban Square Commercial',
  'Elite Enclave',
  'Lakeview Towers',
  'Palm Grove Homes',
  'Metro Business Park',
  'Sunrise Meadows',
  'Royal Orchid Villas',
  'Riverside Retreat',
  'Tech Hub Plaza',
];
const BUILDERS = ['Dream Homes Pvt Ltd', 'Skyline Builders', 'Green Valley Infra', 'Urban Infra'];
const PLACES: Array<[string, string, string, string]> = [
  ['Vaishali Nagar', 'Jaipur', 'Rajasthan', '302021'],
  ['Dwarka Expressway', 'Gurugram', 'Haryana', '122004'],
  ['Sarjapur Road', 'Bengaluru', 'Karnataka', '560035'],
  ['Andheri East', 'Mumbai', 'Maharashtra', '400069'],
  ['Kokapet', 'Hyderabad', 'Telangana', '500075'],
];
const STATUS_CYCLE: readonly PublicationStatus[] = [
  'pending_review',
  'approved',
  'published',
  'draft',
  'rejected',
  'published',
  'pending_review',
  'draft',
  'suspended',
  'published',
  'approved',
  'archived',
];
const TYPES: readonly PropertyType[] = ['apartment', 'apartment', 'villa', 'commercial'];
const LEGAL_CYCLE: readonly LegalApprovalStatus[] = ['pending', 'approved', 'approved', 'rejected'];
const PROJECT_CYCLE: readonly ProjectStatus[] = ['under_construction', 'ready_to_move', 'upcoming'];
const APARTMENT_CYCLE: readonly ApartmentType[] = ['2bhk', '3bhk', '4bhk'];

function photo(propertyId: number, id: number, primary: boolean): MediaResponse {
  return {
    id,
    mediaType: 'photo',
    url: `/api/v1/admin/properties/${propertyId}/media/${id}/content`,
    external: false,
    mimeType: 'image/png',
    fileSize: 245_000,
    originalFilename: `photo-${id}.png`,
    title: primary ? 'Exterior view' : `Photo ${id}`,
    description: null,
    sortOrder: id,
    primary,
    createdAt: '2026-11-10T10:00:00Z',
  };
}

function apartment(id: number, index: number, type: ApartmentType): ApartmentResponse {
  const bedrooms = Number.parseInt(type, 10) || 3;
  return {
    id,
    apartmentName: `${type.toUpperCase()} Type ${String.fromCharCode(65 + index)}`,
    apartmentType: type,
    startingPrice: 5_500_000 + bedrooms * 2_500_000 + index * 450_000,
    currency: 'INR',
    description: null,
    bedrooms,
    bathrooms: bedrooms,
    balconies: 1,
    carParking: 1,
    areaMin: 850 + bedrooms * 250,
    areaMax: 1000 + bedrooms * 300,
    carpetArea: 700 + bedrooms * 200,
    balconyArea: null,
    builtUpArea: null,
    superBuiltUpArea: 1100 + bedrooms * 320,
    areaUnit: 'sq_ft',
    highlights: [],
    displayOrder: index,
    amenities: [],
    media: [],
    createdAt: '2026-11-08T10:00:00Z',
    updatedAt: '2026-11-08T10:00:00Z',
  };
}

/** Varied statuses; drafts are incomplete, everything past draft is complete (as the backend requires). */
export function buildProperties(count: number): StoredProperty[] {
  const start = Date.parse('2026-11-18T09:00:00Z');
  return Array.from({ length: count }, (_, index): StoredProperty => {
    const id = index + 1;
    const status = STATUS_CYCLE[index % STATUS_CYCLE.length] ?? 'draft';
    const [locality, city, state, pincode] = PLACES[index % PLACES.length] ?? [
      'Baner',
      'Pune',
      'Maharashtra',
      '411045',
    ];
    const draft = status === 'draft';
    const createdAt = new Date(start - index * 26 * 3_600_000).toISOString();
    const updatedAt = new Date(start - index * 9 * 3_600_000).toISOString();
    const apartments = draft
      ? []
      : [0, 1].map((n) => apartment(id * 10 + n, n, APARTMENT_CYCLE[(index + n) % 3] ?? '2bhk'));
    const history: Property['statusHistory'] = [
      {
        action: 'created',
        fromStatus: null,
        toStatus: 'draft',
        reason: null,
        createdAt,
        actorUserId: 7,
      },
    ];
    if (!draft) {
      history.push({
        action: 'submitted',
        fromStatus: 'draft',
        toStatus: 'pending_review',
        reason: null,
        createdAt: updatedAt,
        actorUserId: 7,
      });
    }
    if (status === 'rejected') {
      history.push({
        action: 'rejected',
        fromStatus: 'pending_review',
        toStatus: 'rejected',
        reason: 'Photos are blurry.',
        createdAt: updatedAt,
        actorUserId: 1,
      });
    }
    return {
      id,
      slug:
        (NAMES[index % NAMES.length] ?? 'property').toLowerCase().replace(/\s+/g, '-') + `-${id}`,
      version: 3,
      publicationStatus: status,
      ownerId: 7,
      owner: {
        id: 7,
        fullName: 'Rajesh Sharma',
        email: 'rajesh@example.com',
        phone: '+919876543210',
      },
      details: {
        propertyType: TYPES[index % TYPES.length] ?? 'apartment',
        projectName: `${NAMES[index % NAMES.length] ?? 'Property'}${index >= NAMES.length ? ` ${id}` : ''}`,
        builderCompanyName: BUILDERS[index % BUILDERS.length] ?? 'Builder',
        reraNumber: `RAJ/A/2026/${1000 + id}`,
        gstNumber: null,
        projectEmail: 'sales@example.com',
        projectPhone: '+919876543210',
      },
      location: {
        projectAddress: draft && index % 2 === 1 ? null : `Plot ${id}, Main Road`,
        city: draft && index % 2 === 1 ? null : city,
        locality: draft && index % 2 === 1 ? null : locality,
        pincode: draft && index % 2 === 1 ? null : pincode,
        state: draft && index % 2 === 1 ? null : state,
        landmark: null,
        latitude: null,
        longitude: null,
      },
      apartments,
      projectInfo: {
        totalTowersBlocks: 3,
        totalUnitsFlats: 120,
        projectStatus: PROJECT_CYCLE[index % PROJECT_CYCLE.length] ?? 'upcoming',
        legalApprovalStatus: LEGAL_CYCLE[index % LEGAL_CYCLE.length] ?? 'pending',
        landArea: 2.5,
        landAreaUnit: 'acre',
        possessionStartDate: '2027-06-01',
        possessionEndDate: '2027-12-31',
        projectDescription: draft ? null : 'Premium homes with world-class amenities.',
        projectHighlights: draft ? [] : ['Near metro', 'Green spaces'],
      },
      amenities: draft ? [] : AMENITY_CATALOG.slice(0, 4),
      media: draft ? [] : [photo(id, id * 100 + 1, true), photo(id, id * 100 + 2, false)],
      threeDTourUrl: null,
      nearbyPlaces: [],
      statusHistory: history,
      createdAt,
      updatedAt,
      publishedAt: status === 'published' ? updatedAt : null,
    };
  });
}
