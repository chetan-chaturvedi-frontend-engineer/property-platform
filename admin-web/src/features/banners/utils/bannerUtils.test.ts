import { toBannerFilters } from '../hooks/useBannerListParams';
import { bannerFormSchema, type BannerFormValues, CUSTOM_PATH } from '../schemas/bannerSchema';
import type { Banner } from '../types/banner.types';

import { toBannerCsv } from './bannerCsv';
import {
  emptyBannerForm,
  fromLocalInput,
  toBannerFormValues,
  toCreateRequest,
  toLocalInput,
  toUpdateRequest,
} from './bannerForm';
import { externalLinkError, internalLinkError, withSavedOption } from './bannerOptions';

const banner: Banner = {
  id: 7,
  title: 'Diwali sale',
  type: 'offer',
  placement: 'home_top',
  linkType: 'internal',
  link: '/offers/diwali',
  imageUrl: '/api/v1/admin/banners/7/image/a.webp',
  status: 'active',
  displayState: 'live',
  startDate: '2026-11-01T00:00:00Z',
  endDate: '2026-11-15T18:29:59Z',
  createdAt: '2026-10-25T12:00:00Z',
  updatedAt: '2026-10-25T12:00:00Z',
};

const image = new File([new Uint8Array([0x89, 0x50])], 'a.png', { type: 'image/png' });

function values(overrides: Partial<BannerFormValues> = {}): BannerFormValues {
  return {
    ...emptyBannerForm(),
    title: 'Diwali sale',
    type: 'offer',
    placement: 'home_top',
    internalTarget: '/offers',
    image,
    ...overrides,
  };
}

const createSchema = bannerFormSchema({ requireImage: true, rejectPastEnd: true });
const errorsOf = (input: BannerFormValues, schema = createSchema) => {
  const result = schema.safeParse(input);
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]));
};

describe('link rules (same as BannerRules)', () => {
  it.each([
    ['/', null],
    ['/offers', null],
    ['/offers/diwali', null],
    ['/properties/42?ref=banner', null],
    ['/pages/about-us', null],
  ])('accepts internal %s', (link, expected) => {
    expect(internalLinkError(link)).toBe(expected);
  });

  it.each(['/admin', '//evil.example', '/offers/../admin', '/offers#x', 'offers', '/home'])(
    'rejects internal %s',
    (link) => {
      expect(internalLinkError(link)).not.toBeNull();
    },
  );

  it('accepts https URLs and rejects other schemes, credentials and ports', () => {
    expect(externalLinkError('https://example.com/offer?x=1')).toBeNull();
    expect(externalLinkError('http://example.com')).not.toBeNull();
    expect(externalLinkError('javascript:alert(1)')).not.toBeNull();
    expect(externalLinkError('HTTPS://example.com')).not.toBeNull();
    expect(externalLinkError('https://user:pw@example.com')).not.toBeNull();
    expect(externalLinkError('https://example.com:8443')).not.toBeNull();
    expect(externalLinkError('https://exa mple.com')).not.toBeNull();
  });

  it('keeps a retired saved value selectable', () => {
    const options = [{ value: 'offer', label: 'Offer' }];
    expect(withSavedOption(options, 'offer', String)).toBe(options);
    expect(withSavedOption(options, 'festival', () => 'Festival')).toEqual([
      ...options,
      { value: 'festival', label: 'Festival (retired)' },
    ]);
  });
});

describe('form schema', () => {
  it('requires title, type, placement, image and a page for internal links', () => {
    expect(
      errorsOf(values({ title: ' ', type: '', placement: '', image: null, internalTarget: '' })),
    ).toEqual({
      title: 'Enter the banner title',
      type: 'Select the banner type',
      placement: 'Select where the banner is shown',
      image: 'Upload the banner image',
      internalTarget: 'Select the page to open',
    });
  });

  it('checks custom paths and external URLs with the backend rules', () => {
    expect(
      errorsOf(values({ internalTarget: CUSTOM_PATH, internalPath: '/admin/users' })),
    ).toHaveProperty('internalPath');
    expect(
      errorsOf(values({ linkType: 'external', externalUrl: 'http://example.com' })),
    ).toHaveProperty('externalUrl');
    expect(errorsOf(values({ linkType: 'none', internalTarget: '' }))).toEqual({});
  });

  it('validates the schedule only when it is on', () => {
    const base = { scheduled: true };
    expect(errorsOf(values({ ...base, startDate: '', endDate: '' }))).toEqual({
      startDate: 'Choose a start date, an end date, or both',
    });
    expect(
      errorsOf(values({ ...base, startDate: '2099-01-02T10:00', endDate: '2099-01-02T10:00' })),
    ).toEqual({ endDate: 'The end must be after the start' });
    expect(
      errorsOf(values({ ...base, startDate: '2020-01-01T10:00', endDate: '2020-02-01T10:00' })),
    ).toEqual({ endDate: 'The end is in the past; the banner would never be shown' });
    // Editing an old banner may keep a past end date.
    const editSchema = bannerFormSchema({ requireImage: false, rejectPastEnd: false });
    expect(
      errorsOf(
        values({ ...base, startDate: '2020-01-01T10:00', endDate: '2020-02-01T10:00' }),
        editSchema,
      ),
    ).toEqual({});
    expect(errorsOf(values({ scheduled: false, startDate: '', endDate: '' }))).toEqual({});
  });
});

describe('form ⇄ API mapping', () => {
  it('round-trips datetime-local values through UTC', () => {
    const iso = fromLocalInput('2026-11-20T09:30');
    expect(iso).not.toBeNull();
    expect(toLocalInput(iso)).toBe('2026-11-20T09:30');
    expect(fromLocalInput('')).toBeNull();
  });

  it('builds the create request, leaving out status without the permission', () => {
    const request = toCreateRequest(values({ title: '  Diwali sale  ' }), {
      canChangeStatus: true,
    });
    expect(request).toEqual({
      title: 'Diwali sale',
      type: 'offer',
      placement: 'home_top',
      linkType: 'internal',
      link: '/offers',
      status: 'active',
    });
    expect(toCreateRequest(values(), { canChangeStatus: false })).not.toHaveProperty('status');
    expect(
      toCreateRequest(values({ linkType: 'none' }), { canChangeStatus: true }),
    ).not.toHaveProperty('link');
  });

  it('sends the schedule as UTC instants', () => {
    const request = toCreateRequest(
      values({ scheduled: true, startDate: '2099-01-01T00:00', endDate: '' }),
      { canChangeStatus: true },
    );
    expect(request.startDate).toBe(new Date('2099-01-01T00:00').toISOString());
    expect(request).not.toHaveProperty('endDate');
  });

  it('prefills the form from a banner and sends only what changed', () => {
    const form = toBannerFormValues(banner);
    expect(form).toMatchObject({
      title: 'Diwali sale',
      linkType: 'internal',
      internalTarget: '/offers/diwali',
      scheduled: true,
      status: 'active',
    });
    // Unchanged (the saved end has seconds; the form edits minutes).
    expect(toUpdateRequest(banner, form, { canChangeStatus: true })).toEqual({});

    expect(
      toUpdateRequest(
        banner,
        { ...form, title: 'Diwali mega sale', status: 'inactive', linkType: 'none' },
        { canChangeStatus: false },
      ),
    ).toEqual({ title: 'Diwali mega sale', linkType: null, link: null });

    expect(
      toUpdateRequest(banner, { ...form, scheduled: false }, { canChangeStatus: true }),
    ).toEqual({ startDate: null, endDate: null });
  });
});

describe('list filters', () => {
  const list = {
    search: '',
    state: undefined,
    type: '',
    placement: '',
    linkType: undefined,
    startFrom: '',
    startTo: '',
    endFrom: '',
    endTo: '',
    sort: { field: 'createdAt' as const, direction: 'desc' as const },
  };
  const now = '2026-11-20T10:00:00.000Z';

  it('sends nothing for the defaults', () => {
    expect(Object.values(toBannerFilters(list, now)).filter(Boolean)).toEqual([]);
  });

  it('maps scheduled and expired to active plus a date bound at now', () => {
    expect(toBannerFilters({ ...list, state: 'scheduled' }, now)).toMatchObject({
      status: 'active',
      startDateFrom: now,
    });
    expect(toBannerFilters({ ...list, state: 'expired' }, now)).toMatchObject({
      status: 'active',
      endDateTo: now,
    });
    expect(toBannerFilters({ ...list, state: 'inactive' }, now)).toMatchObject({
      status: 'inactive',
    });
  });

  it('drops inverted date ranges and sends a non-default sort', () => {
    const filters = toBannerFilters(
      {
        ...list,
        startFrom: '2026-12-10',
        startTo: '2026-12-01',
        sort: { field: 'title', direction: 'asc' },
      },
      now,
    );
    expect(filters.startDateFrom).toBeUndefined();
    expect(filters.startDateTo).toBeUndefined();
    expect(filters.sort).toBe('title,asc');
  });
});

describe('CSV export', () => {
  it('writes labels and neutralizes formula-like titles', () => {
    const csv = toBannerCsv([{ ...banner, title: '=HYPERLINK("x")' }]);
    const [header, row] = csv.replace('﻿', '').split('\r\n');
    expect(header).toContain('ID,Title,Type,Placement,Status,Display state');
    expect(row).toContain(`7,"'=HYPERLINK(""x"")",Offer,Homepage - Top,Active,Active`);
  });
});
