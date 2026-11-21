import type {
  ContentPage,
  ContentPageStatus,
  ContentPageType,
} from '@/features/contentPages/types/contentPage.types';

/** A `pages` row, stored exactly as the API returns it. */
export type StoredContentPage = ContentPage;

const SEED: ReadonlyArray<{
  heading: string;
  slug: string;
  type: ContentPageType;
  status: ContentPageStatus;
  subHeading?: string;
}> = [
  {
    heading: 'About us',
    slug: 'about-us',
    type: 'static',
    status: 'publish',
    subHeading: 'Who we are',
  },
  { heading: 'Terms and conditions', slug: 'terms-conditions', type: 'system', status: 'publish' },
  {
    heading: 'Privacy policy',
    slug: 'privacy-policy',
    type: 'system',
    status: 'publish',
    subHeading: 'How we handle your data',
  },
  {
    heading: 'Refund and cancellation policy',
    slug: 'refund-policy',
    type: 'system',
    status: 'draft',
  },
  { heading: 'How it works', slug: 'how-it-works', type: 'static', status: 'publish' },
  { heading: 'Contact us', slug: 'contact-us', type: 'static', status: 'publish' },
  { heading: 'Careers', slug: 'careers', type: 'static', status: 'draft' },
  { heading: 'Sitemap', slug: 'sitemap', type: 'system', status: 'publish' },
  // Banner link targets (the banner form lists the published ones).
  { heading: 'Weekend open house', slug: 'open-house', type: 'static', status: 'publish' },
  { heading: 'Upcoming launch (draft)', slug: 'upcoming-launch', type: 'static', status: 'draft' },
  { heading: 'Home loan partners', slug: 'home-loan-partners', type: 'static', status: 'publish' },
  { heading: 'Builder guidelines', slug: 'builder-guidelines', type: 'static', status: 'publish' },
];

/**
 * 12 pages: 9 published, 3 drafts; 4 system pages. Created a day apart, the first one newest, so
 * the default order (newest first) is the seed order.
 */
export function buildContentPages(): StoredContentPage[] {
  const start = Date.parse('2026-11-18T10:30:00Z');
  return SEED.map((seed, index) => {
    const createdAt = new Date(start - index * 86_400_000).toISOString();
    return {
      id: index + 1,
      heading: seed.heading,
      subHeading: seed.subHeading ?? null,
      slug: seed.slug,
      content: `<h2>${seed.heading}</h2><p>Content of the ${seed.heading.toLowerCase()} page.</p>`,
      type: seed.type,
      status: seed.status,
      metaTitle: seed.slug === 'privacy-policy' ? 'Privacy policy | Dwellery' : null,
      metaDescription: seed.slug === 'privacy-policy' ? 'What we collect and why.' : null,
      metaKeywords: seed.slug === 'privacy-policy' ? 'privacy, data protection' : null,
      createdAt,
      updatedAt: new Date(Date.parse(createdAt) + 3_600_000).toISOString(),
    };
  });
}
