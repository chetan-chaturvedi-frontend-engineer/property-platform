import { contentPageFormSchema, type ContentPageFormValues } from '../schemas/contentPageSchema';
import type { ContentPage } from '../types/contentPage.types';

import { splitKeywords } from './contentPageDisplay';
import {
  emptyContentPageForm,
  parseContentPageId,
  toContentPageFormValues,
  toCreateContentPageRequest,
  toUpdateContentPageRequest,
} from './contentPageForm';

const PAGE: ContentPage = {
  id: 3,
  heading: 'Privacy policy',
  subHeading: 'How we handle your data',
  slug: 'privacy-policy',
  content: '<p>We collect little.</p>',
  type: 'system',
  status: 'publish',
  metaTitle: 'Privacy | PropertyPro',
  metaDescription: null,
  metaKeywords: 'privacy, data',
  createdAt: '2026-11-01T10:00:00Z',
  updatedAt: '2026-11-02T10:00:00Z',
};

const valid = (overrides: Partial<ContentPageFormValues> = {}): ContentPageFormValues => ({
  ...emptyContentPageForm(),
  heading: 'About us',
  content: '<p>Hello</p>',
  ...overrides,
});

describe('contentPageFormSchema', () => {
  it('requires a title and visible content', () => {
    const result = contentPageFormSchema.safeParse(valid({ heading: '  ', content: '<p> </p>' }));
    expect(result.success).toBe(false);
    const messages = result.error?.issues.map((issue) => issue.message);
    expect(messages).toEqual(
      expect.arrayContaining(['Enter the page title', 'Write the page content']),
    );
  });

  it('accepts image-only content', () => {
    const result = contentPageFormSchema.safeParse(
      valid({ content: '<p><img src="https://x.test/a.png"></p>' }),
    );
    expect(result.success).toBe(true);
  });

  it('checks an edited slug but not a generated one', () => {
    expect(contentPageFormSchema.safeParse(valid({ slug: 'Bad Slug' })).success).toBe(true);
    const bad = contentPageFormSchema.safeParse(valid({ slugEdited: true, slug: 'bad--slug' }));
    expect(bad.error?.issues[0]?.message).toBe(
      'Use lowercase letters and digits separated by single hyphens',
    );
    const empty = contentPageFormSchema.safeParse(valid({ slugEdited: true, slug: '' }));
    expect(empty.error?.issues[0]?.message).toBe('Enter the URL slug');
  });
});

describe('content page requests', () => {
  it('leaves out blank optional fields and an untouched slug on create', () => {
    expect(toCreateContentPageRequest(valid({ slug: 'ignored' }), 'draft')).toEqual({
      heading: 'About us',
      subHeading: undefined,
      slug: undefined,
      content: '<p>Hello</p>',
      type: 'static',
      status: 'draft',
      metaTitle: undefined,
      metaDescription: undefined,
      metaKeywords: undefined,
    });
    expect(
      toCreateContentPageRequest(valid({ slugEdited: true, slug: 'who-we-are' }), 'publish'),
    ).toMatchObject({ slug: 'who-we-are', status: 'publish' });
  });

  it('sends only changed fields on update and null for cleared optional text', () => {
    const values = toContentPageFormValues(PAGE);
    expect(values.slugEdited).toBe(true);
    expect(toUpdateContentPageRequest(PAGE, values, 'publish')).toEqual({});

    expect(
      toUpdateContentPageRequest(
        PAGE,
        { ...values, heading: ' Privacy ', subHeading: '', metaDescription: 'Why', type: 'static' },
        'draft',
      ),
    ).toEqual({
      heading: 'Privacy',
      subHeading: null,
      metaDescription: 'Why',
      type: 'static',
      status: 'draft',
    });
  });

  it('parses route ids and keyword lists', () => {
    expect(parseContentPageId('12')).toBe(12);
    expect(parseContentPageId('0')).toBeNull();
    expect(parseContentPageId('abc')).toBeNull();
    expect(splitKeywords(' privacy, ,data ')).toEqual(['privacy', 'data']);
    expect(splitKeywords(null)).toEqual([]);
  });
});
