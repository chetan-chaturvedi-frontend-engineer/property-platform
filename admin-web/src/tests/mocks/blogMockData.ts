import type {
  Blog,
  BlogCategory,
  BlogPublicState,
  BlogStatus,
} from '@/features/blogs/types/blog.types';

import { decodeMockImage, type MockImageName } from './bannerMockData';

/**
 * Mock blogs for MSW, deterministic so tests can rely on them: 14 blogs, ids 1-14, created one hour
 * apart (id 14 newest). Dates are relative to the moment the mock state is built.
 * 8 live (ids 1-7 and 13), 2 scheduled (ids 8, 9), 3 drafts (ids 10, 11, 12; 12 without category),
 * 1 hidden by its inactive category (id 14). Categories 1-4 active, 5 inactive. Mock data only.
 */

const DAY = 86_400_000;

export interface StoredBlogCategory extends Omit<BlogCategory, 'blogCount'> {
  createdAt: string;
}

export interface StoredBlog extends Omit<Blog, 'publicState' | 'featureImageUrl' | 'category'> {
  categoryId: number | null;
  /** Stored file name (the backend keeps a random storage key). */
  imageFile: string | null;
}

export const MOCK_BLOG_CATEGORIES: readonly StoredBlogCategory[] = [
  {
    id: 1,
    title: 'Buying Tips',
    slug: 'buying-tips',
    status: 'active',
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 2,
    title: 'Market Trends',
    slug: 'market-trends',
    status: 'active',
    createdAt: '2026-09-02T08:00:00Z',
  },
  {
    id: 3,
    title: 'Home Improvement',
    slug: 'home-improvement',
    status: 'active',
    createdAt: '2026-09-03T08:00:00Z',
  },
  {
    id: 4,
    title: 'Legal Guide',
    slug: 'legal-guide',
    status: 'active',
    createdAt: '2026-09-04T08:00:00Z',
  },
  {
    id: 5,
    title: 'Archived News',
    slug: 'archived-news',
    status: 'inactive',
    createdAt: '2026-09-05T08:00:00Z',
  },
];

type Seed = [
  title: string,
  categoryId: number | null,
  status: BlogStatus,
  /** Days from now; null = never published. */
  publishedDays: number | null,
  tags: string[],
  image: MockImageName | null,
];

const SEEDS: readonly Seed[] = [
  ['Top 10 Tips for First-Time Home Buyers', 1, 'publish', -6, ['home buying', 'tips'], 'sky'],
  ['Real Estate Market Trends in 2026', 2, 'publish', -8, ['market', '2026'], 'navy'],
  ['How to Decorate Your New Home', 3, 'publish', -10, ['decor'], 'green'],
  [
    'Legal Documents Required for Property Purchase',
    4,
    'publish',
    -12,
    ['legal', 'documents'],
    'violet',
  ],
  ['Benefits of Investing in Plot vs Apartment', 2, 'publish', -14, ['investment'], 'purple'],
  ['Home Loan Guide 2026', 1, 'publish', -16, ['home loans', 'tax'], 'sky'],
  ['Understanding Stamp Duty', 4, 'publish', -18, ['legal', 'tax'], null],
  ['Monsoon Maintenance Checklist', 3, 'publish', 5, ['maintenance'], 'green'],
  ['Upcoming Metro Lines and Property Prices', 2, 'publish', 9, ['infrastructure'], 'navy'],
  ['Choosing the Right Neighbourhood', 1, 'draft', null, ['neighbourhood'], 'violet'],
  ['Vastu Basics for Apartments', 3, 'draft', -20, [], null],
  ['Untitled market idea', null, 'draft', null, [], null],
  ['RERA Explained', 4, 'publish', -3, ['rera', 'legal'], 'purple'],
  ['Old Price Index Notes', 5, 'publish', -2, [], null],
];

const content = (title: string) =>
  `<h2>${title}</h2><p>Buying or selling property is a big decision. This guide walks you through the essentials.</p><ul><li><p>Plan your budget</p></li><li><p>Check legal documents</p></li></ul><blockquote><p>Research first, decide later.</p></blockquote>`;

const slugOf = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function buildBlogs(now = Date.now()): {
  blogs: StoredBlog[];
  images: Map<string, Uint8Array>;
} {
  const images = new Map<string, Uint8Array>();
  const blogs = SEEDS.map(
    ([title, categoryId, status, publishedDays, tags, image], index): StoredBlog => {
      const id = index + 1;
      const createdAt = new Date(now - (SEEDS.length - index) * 3_600_000 - 30 * DAY).toISOString();
      const imageFile = image ? `seed-blog-${id}.png` : null;
      if (image && imageFile) images.set(imageFile, decodeMockImage(image));
      return {
        id,
        title,
        slug: slugOf(title),
        imageFile,
        categoryId,
        shortDescription: `A practical overview: ${title.toLowerCase()}.`,
        content: content(title),
        status,
        publishedAt:
          publishedDays === null ? null : new Date(now + publishedDays * DAY).toISOString(),
        metaTitle: index % 3 === 0 ? `${title} | PropertyPro` : null,
        metaDescription: null,
        tags,
        createdAt,
        updatedAt: createdAt,
      };
    },
  );
  return { blogs, images };
}

/** The backend's rule (`BlogPublicState.of`): status, then time, then the category. */
export function publicStateAt(
  blog: Pick<StoredBlog, 'status' | 'publishedAt'>,
  category: Pick<StoredBlogCategory, 'status'> | undefined,
  now: number,
): BlogPublicState {
  if (blog.status === 'draft') return 'draft';
  if (blog.publishedAt && Date.parse(blog.publishedAt) > now) return 'scheduled';
  if (!category || category.status !== 'active') return 'category_hidden';
  return 'live';
}
