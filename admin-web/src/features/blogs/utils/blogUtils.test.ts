import { toBlogFilters, type BlogListParams } from '../hooks/useBlogListParams';
import { blogFormSchema, type BlogFormValues, hasVisibleContent } from '../schemas/blogSchema';
import type { Blog } from '../types/blog.types';

import { toBlogCsv } from './blogCsv';
import { countWords, htmlToText, readingMinutes } from './blogDisplay';
import {
  emptyBlogForm,
  parseBlogId,
  publishModesFor,
  toBlogFormValues,
  toCreateRequest,
  toUpdateRequest,
} from './blogForm';
import { activeBlogChips } from './blogFilters';
import { cleanSlugInput, normalizeTag, slugify } from './blogSlug';

const BLOG: Blog = {
  id: 6,
  title: 'Home Loan Guide',
  slug: 'home-loan-guide',
  featureImageUrl: null,
  category: { id: 1, title: 'Loans', slug: 'loans', status: 'active' },
  shortDescription: 'Short',
  content: '<p>Body</p>',
  status: 'publish',
  publicState: 'live',
  publishedAt: '2026-05-01T10:00:00Z',
  metaTitle: null,
  metaDescription: null,
  tags: ['tax'],
  createdAt: '2026-04-01T10:00:00Z',
  updatedAt: '2026-04-01T10:00:00Z',
};

const values = (overrides: Partial<BlogFormValues> = {}): BlogFormValues => ({
  ...toBlogFormValues(BLOG),
  ...overrides,
});

describe('slugify (mirrors the backend Slugs.slugify)', () => {
  it.each([
    ['Home Loan Guide 2026', 'home-loan-guide-2026'],
    ['Green Valley Résidency', 'green-valley-residency'],
    ['Loans & EMI', 'loans-and-emi'],
    ["Buyer's guide", 'buyers-guide'],
    ['  --Hello__World--  ', 'hello-world'],
    ['मकान', ''],
  ])('%s → %s', (title, slug) => expect(slugify(title)).toBe(slug));

  it('caps the length and trims a trailing hyphen', () => {
    expect(slugify('ab '.repeat(200), 10)).toBe('ab-ab-ab-a');
    expect(slugify('abcd efgh', 5)).toBe('abcd');
  });

  it('cleans slugs typed by hand', () => {
    expect(cleanSlugInput('My  Slug!!--x')).toBe('my-slug-x');
    expect(cleanSlugInput('-abc-')).toBe('abc-');
  });
});

describe('normalizeTag (mirrors BlogTags)', () => {
  it('trims, collapses spaces and lowercases', () => {
    expect(normalizeTag('  Home   Loans ')).toBe('home loans');
    expect(normalizeTag('C++ & .NET')).toBe('c++ & .net');
    expect(normalizeTag('घर')).toBe('घर');
  });
  it('rejects what the backend rejects', () => {
    expect(normalizeTag('')).toBeNull();
    expect(normalizeTag('-dash first')).toBeNull();
    expect(normalizeTag('a'.repeat(51))).toBeNull();
    expect(normalizeTag('no/slash')).toBeNull();
  });
});

describe('blog content helpers', () => {
  it('reads visible text and counts words and minutes', () => {
    const text = htmlToText('<h2>Title</h2><p>One two</p><ul><li><p>three</p></li></ul>');
    expect(text).toBe('Title One two three');
    expect(countWords(text)).toBe(4);
    expect(readingMinutes(0)).toBe(0);
    expect(readingMinutes(4)).toBe(1);
    expect(readingMinutes(1000)).toBe(5);
  });
  it('treats empty paragraphs as no content, images as content', () => {
    expect(hasVisibleContent('<p></p>')).toBe(false);
    expect(hasVisibleContent('<p><img src="https://x.test/a.png"></p>')).toBe(true);
  });
});

describe('blog form schema', () => {
  it('requires a category and a future time only to publish', () => {
    const draft = { ...emptyBlogForm(), title: 'T', content: '<p>x</p>' };
    expect(blogFormSchema.safeParse(draft).success).toBe(true);
    const publish = blogFormSchema.safeParse({ ...draft, intent: 'publish' });
    expect(publish.success).toBe(false);
    expect(publish.error?.issues.map((issue) => issue.path.join('.'))).toEqual(['categoryId']);

    const past = blogFormSchema.safeParse({
      ...draft,
      intent: 'publish',
      categoryId: 1,
      publishMode: 'schedule',
      publishAt: '2020-01-01T10:00',
    });
    expect(past.error?.issues.map((issue) => issue.path.join('.'))).toEqual(['publishAt']);
  });
  it('validates a hand-written slug', () => {
    const result = blogFormSchema.safeParse({
      ...emptyBlogForm(),
      title: 'T',
      content: '<p>x</p>',
      slugEdited: true,
      slug: 'bad--slug',
    });
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toEqual(['slug']);
  });
});

describe('toCreateRequest', () => {
  it('leaves out an untouched slug and empty optional fields', () => {
    const request = toCreateRequest(
      { ...emptyBlogForm(), title: ' New ', content: '<p>x</p>', tags: [] },
      'draft',
    );
    expect(request).toEqual({
      title: 'New',
      content: '<p>x</p>',
      shortDescription: undefined,
      status: 'draft',
      metaTitle: undefined,
      metaDescription: undefined,
    });
  });
  it('sends the schedule only when publishing', () => {
    const form = {
      ...emptyBlogForm(),
      title: 'T',
      content: '<p>x</p>',
      categoryId: 2,
      publishMode: 'schedule' as const,
      publishAt: '2099-01-02T03:04',
    };
    expect(toCreateRequest(form, 'publish').publishedAt).toBe(
      new Date('2099-01-02T03:04').toISOString(),
    );
    expect(toCreateRequest(form, 'draft').publishedAt).toBeUndefined();
  });
});

describe('toUpdateRequest', () => {
  it('sends nothing when nothing changed', () => {
    expect(toUpdateRequest(BLOG, values(), 'publish')).toEqual({});
  });
  it('sends changed fields, clears emptied ones and keeps the slug', () => {
    expect(
      toUpdateRequest(
        BLOG,
        values({ title: 'New title', shortDescription: '', tags: [] }),
        'publish',
      ),
    ).toEqual({ title: 'New title', shortDescription: null, tags: null });
  });
  it('unpublishes with the draft intent', () => {
    expect(toUpdateRequest(BLOG, values(), 'draft')).toEqual({ status: 'draft' });
  });
  it('publishes a draft now without a time, or at the scheduled time', () => {
    const draft: Blog = { ...BLOG, status: 'draft', publicState: 'draft', publishedAt: null };
    expect(toUpdateRequest(draft, values({ publishMode: 'now' }), 'publish')).toEqual({
      status: 'publish',
    });
    expect(
      toUpdateRequest(
        draft,
        values({ publishMode: 'schedule', publishAt: '2099-01-01T00:00' }),
        'publish',
      ),
    ).toEqual({ status: 'publish', publishedAt: new Date('2099-01-01T00:00').toISOString() });
  });
  it('publishes a scheduled blog early with the current time', () => {
    const scheduled: Blog = {
      ...BLOG,
      publicState: 'scheduled',
      publishedAt: '2099-01-01T00:00:00Z',
    };
    const now = new Date('2026-11-20T10:00:00Z');
    expect(toUpdateRequest(scheduled, values({ publishMode: 'now' }), 'publish', now)).toEqual({
      publishedAt: now.toISOString(),
    });
  });
  it('offers "keep" only for blogs that are already live', () => {
    expect(publishModesFor()).toEqual(['now', 'schedule']);
    expect(publishModesFor(BLOG)).toEqual(['keep', 'schedule']);
    expect(publishModesFor({ status: 'publish', publicState: 'scheduled' })).toEqual([
      'now',
      'schedule',
    ]);
  });
});

describe('toBlogFilters', () => {
  const base: Omit<BlogListParams, 'update' | 'clear' | 'page'> = {
    search: '',
    tab: 'all',
    categoryId: undefined,
    tag: '',
    publishedFrom: '',
    publishedTo: '',
    createdFrom: '',
    createdTo: '',
    sort: { field: 'createdAt', direction: 'desc' },
  };
  const now = '2026-11-20T10:00:00.000Z';

  it('maps tabs to status and publication bounds', () => {
    expect(toBlogFilters({ ...base, tab: 'draft' }, now)).toMatchObject({ status: 'draft' });
    expect(toBlogFilters({ ...base, tab: 'live' }, now)).toMatchObject({
      status: 'publish',
      publishedTo: now,
    });
    expect(toBlogFilters({ ...base, tab: 'scheduled' }, now)).toMatchObject({
      status: 'publish',
      publishedFrom: now,
    });
  });
  it('keeps the stricter of a user bound and the tab bound, and drops invalid ranges', () => {
    const early = toBlogFilters({ ...base, tab: 'live', publishedTo: '2026-01-31' }, now);
    expect(early.publishedTo).toBe(new Date('2026-01-31T23:59:59.999').toISOString());
    const inverted = toBlogFilters(
      { ...base, createdFrom: '2026-02-01', createdTo: '2026-01-01' },
      now,
    );
    expect(inverted.createdFrom).toBeUndefined();
  });
  it('omits the default sort', () => {
    expect(toBlogFilters(base, now).sort).toBeUndefined();
    expect(toBlogFilters({ ...base, sort: { field: 'title', direction: 'asc' } }, now).sort).toBe(
      'title,asc',
    );
  });
});

describe('misc', () => {
  it('builds one chip per applied panel filter', () => {
    const remove = jest.fn();
    const chips = activeBlogChips(
      {
        tag: 'tax',
        publishedFrom: '2026-01-01',
        publishedTo: '',
        createdFrom: '',
        createdTo: '2026-02-01',
      },
      remove,
    );
    expect(chips.map((chip) => chip.label)).toEqual([
      'Tag: tax',
      'Published from 2026-01-01',
      'Created until 2026-02-01',
    ]);
    chips[1]?.onRemove();
    expect(remove).toHaveBeenCalledWith(['pFrom', 'pTo']);
  });
  it('parses route ids', () => {
    expect(parseBlogId('12')).toBe(12);
    expect(parseBlogId('0')).toBeNull();
    expect(parseBlogId('1e3')).toBeNull();
    expect(parseBlogId(undefined)).toBeNull();
  });
  it('exports CSV with formula-safe cells', () => {
    const csvText = toBlogCsv([{ ...BLOG, title: '=HYPERLINK("x")' }]);
    expect(csvText.split('\n')[0]).toContain('ID,Title,Slug');
    expect(csvText).toContain(`'=HYPERLINK`);
  });
});
