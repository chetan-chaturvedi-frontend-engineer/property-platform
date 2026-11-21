import type {
  Banner,
  BannerDisplayState,
  BannerLinkType,
  BannerStatus,
} from '@/features/banners/types/banner.types';

/**
 * Mock banners for MSW, deterministic in count so tests can rely on them: 12 banners, ids 1-12,
 * created one hour apart (id 12 newest). Dates are relative to the moment the mock state is built.
 * 10 active (7 live, 2 scheduled: ids 5 and 6; 1 expired: id 9) and 2 inactive (ids 4 and 10).
 * Mock data only.
 */

const DAY = 86_400_000;

type Seed = [
  title: string,
  type: string,
  placement: string,
  status: BannerStatus,
  /** Days from now; null = open bound. */
  startDays: number | null,
  endDays: number | null,
  link: [BannerLinkType, string] | null,
  image: MockImageName,
];

export type MockImageName = 'purple' | 'navy' | 'green' | 'sky' | 'violet';

const SEEDS: readonly Seed[] = [
  [
    'Find your dream home',
    'promotion',
    'home_top',
    'active',
    -10,
    21,
    ['internal', '/properties'],
    'sky',
  ],
  [
    'Premium properties for your luxury life',
    'promotion',
    'home_middle',
    'active',
    -12,
    19,
    ['internal', '/properties?ref=banner'],
    'navy',
  ],
  [
    'List your property, reach more buyers',
    'promotion',
    'property_list',
    'active',
    -15,
    16,
    ['internal', '/subscription-plans'],
    'sky',
  ],
  [
    'Exclusive deals & offers',
    'offer',
    'home_top',
    'inactive',
    null,
    null,
    ['internal', '/offers'],
    'violet',
  ],
  [
    'Invest in the future',
    'promotion',
    'home_middle',
    'active',
    5,
    35,
    ['external', 'https://invest.example.com/future'],
    'green',
  ],
  [
    'Download our app',
    'announcement',
    'property_detail',
    'active',
    9,
    39,
    ['external', 'https://apps.example.com/propertypro'],
    'violet',
  ],
  [
    'Diwali festive offer',
    'offer',
    'home_top',
    'active',
    null,
    null,
    ['internal', '/offers/diwali'],
    'purple',
  ],
  [
    'New projects launch',
    'announcement',
    'home_middle',
    'active',
    -3,
    null,
    ['internal', '/projects'],
    'navy',
  ],
  ['Monsoon sale', 'offer', 'property_list', 'active', -40, -3, null, 'green'],
  [
    'Home loan partners',
    'promotion',
    'property_detail',
    'inactive',
    -2,
    28,
    ['external', 'https://loans.example.com'],
    'purple',
  ],
  [
    'Weekend open house',
    'announcement',
    'home_top',
    'active',
    -1,
    6,
    ['internal', '/pages/open-house'],
    'sky',
  ],
  ['Summer promo', 'offer', 'home_middle', 'active', -20, null, null, 'violet'],
];

/** 64 × 20 gradient PNGs, so copies and downloads carry real image bytes. */
export const MOCK_IMAGES: Record<MockImageName, string> = {
  purple:
    'iVBORw0KGgoAAAANSUhEUgAAAEAAAAAUCAIAAACyFKxoAAAA+ElEQVR42mPwkZ3qKzfNT2FGgNLMQOXZwapzQ9TnhWkuCNdaGKmzOEpvabTBsljDFXHGKxNMVyear022WJditSHNZmO63eYM+61ZjtuynXfkuu7Mc9td4LG30Gtfsc+BEt+Dpf6HywOPVgQfqwo5UR12sjbidF3U2Yboc42xF5riL7YkXm5Nutqecq0j7UZXxs3uzNu92Xf7cu/15z+YWPBwUtHjKSVPp5Y9m17+Ykbly1nVr2fXvp1T925ew4f5TR8Xtnxe1Pp1Sfu3pZ0/lnf/Yhj1wKgHRj0w6oFRD4x6YNQDox4Y9cCoB0Y9MOqBUQ+MeoA8DwAAtX3iYvXsYHwAAAAASUVORK5CYII=',
  navy: 'iVBORw0KGgoAAAANSUhEUgAAAEAAAAAUCAIAAACyFKxoAAAA8klEQVR42mOQk/aWk/aVl/FXkA1SlA1RlAtXko9Ulo9RUYhTVUxUVUxWU0pVV87QUM7SUMnVVM3XUi3SVivRUS/XUa/U1ajW06zT12rQ12o20G411Okw0uky1u011us30Ztoqj/FzGCamcFMc8PZFkbzLI0WWBkvtjJZam2y3MZ0la3ZGluz9XbmG+0ttjhYbnO03OlotdvJeq+z9QEXm0MutkddbY+72Z1ytz/jYX/ew+Gip+NlL8dr3k43vJ1v+zjf9XV54Of6yN/tKcOoB0Y9MOqBUQ+MemDUA6MeGPXAqAdGPTDqgVEPjHpg1APkeQAAUFf0cYN+Bx4AAAAASUVORK5CYII=',
  green:
    'iVBORw0KGgoAAAANSUhEUgAAAEAAAAAUCAIAAACyFKxoAAAA8klEQVR42mNg87NmC7BhD7LlCLHnCHPgjHDiinLmjnHljnPjSfTgTfbkS/XmS/fhz/QTyPYXyA0UzA8SKgwRLgkVLgsXqYgQrYoSq4kWq4sVb4iTaEqQaEmUbE+W6kyR7k6T7k2X6c+UnZglNzlHbmqu/PR8hVkFinOKFOcVKy0oVV5UprykQmVZpeqKarVVNWpr69TX12tsbNTc3KS5tUVre6v2znbt3R06e7t0D3TrHerVO9Knf2yCwYmJhqcmG56ZYnRumvGF6SaXZzKMemDUA6MeGPXAqAdGPTDqgVEPjHpg1AOjHhj1wKgHRj1AngcAAS9uxJChadoAAAAASUVORK5CYII=',
  sky: 'iVBORw0KGgoAAAANSUhEUgAAAEAAAAAUCAIAAACyFKxoAAAAzklEQVR42u3PWU7CABQFUPb/K0gAo2hEgkNUIkIEw2A6UNrSUjrQiVlWcS/uwe93dnAKm9M5/2V2ZHpkcuDqwGjPcM9gR39Hb8vFlu6Gzpr2mlZOM+cso5FRT6mlVBMqCX9iTmKOVxxFHEb8DjkI2Q/4FbDno+vjc4nOEh8e2h7eF3hz8erixcGzg6c5Hudo2WjaeLDQsHBv4s7E7Qx1AzcGrqe4mqKmo6qjoqGs4VJFSUVRwYWCggQkIAEJSEACEpCABCQgAQlIQAL/C/wB7PS9LfX3EtkAAAAASUVORK5CYII=',
  violet:
    'iVBORw0KGgoAAAANSUhEUgAAAEAAAAAUCAIAAACyFKxoAAAA+0lEQVR42mOIVtwWq7g1XmlrotKWFOUtaSqbM1Q2Z6tuylXdlK+2sUh9Y4n6hjKNDRWaG6o119dqra/XWtekva5FZ22bztpO3TXdemt69Vb366+epL9qisGqaYarZhqunG20cq7RigXGKxaZLF9isnyZ6bKVZstWmy1da750g/mSTRZLtlgu2W65eKfV4t3Wi/ZaLzpgs/CQzcIjtguO2y04aTf/tP38c/bzLjjMu+Q474rj3OtOc286z7ntPOeey+wHLrMfuc566jbrudvMl+4z33jMZBj1wKgHRj0w6oFRD4x6YNQDox4Y9cCoB0Y9MOqBUQ+MeoA8DwAAFAR2uvcj1lUAAAAASUVORK5CYII=',
};

export function decodeMockImage(name: MockImageName): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(MOCK_IMAGES[name]), (char) => char.charCodeAt(0));
}

/** The backend's rule (`Banner#displayStateAt`): status first, then the inclusive schedule. */
export function displayStateAt(
  banner: Pick<Banner, 'status' | 'startDate' | 'endDate'>,
  now: number,
): BannerDisplayState {
  if (banner.status === 'inactive') return 'inactive';
  if (banner.startDate && Date.parse(banner.startDate) > now) return 'scheduled';
  if (banner.endDate && Date.parse(banner.endDate) < now) return 'expired';
  return 'live';
}

export interface StoredBanner extends Omit<Banner, 'displayState' | 'imageUrl'> {
  /** Stored file name (the backend keeps a random storage key). */
  imageFile: string;
}

export function buildBanners(now = Date.now()): {
  banners: StoredBanner[];
  images: Map<string, Uint8Array>;
} {
  const images = new Map<string, Uint8Array>();
  const banners = SEEDS.map(
    ([title, type, placement, status, startDays, endDays, link, image], index) => {
      const id = index + 1;
      const createdAt = new Date(now - (SEEDS.length - index) * 3_600_000 - 30 * DAY).toISOString();
      const imageFile = `seed-${id}.png`;
      images.set(imageFile, decodeMockImage(image));
      return {
        id,
        title,
        type,
        placement,
        linkType: link?.[0] ?? null,
        link: link?.[1] ?? null,
        imageFile,
        status,
        startDate: startDays === null ? null : new Date(now + startDays * DAY).toISOString(),
        endDate: endDays === null ? null : new Date(now + endDays * DAY).toISOString(),
        createdAt,
        updatedAt: createdAt,
      };
    },
  );
  return { banners, images };
}
