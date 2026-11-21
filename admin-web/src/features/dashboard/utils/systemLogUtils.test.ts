import type { SystemLog } from '../types/systemLog.types';

import { toSystemLogCsv } from './systemLogCsv';
import {
  actorLabel,
  describeUserAgent,
  isIpAddress,
  MASK,
  maskSensitive,
  moduleLabel,
  moduleOptionsWith,
  parseDay,
  rangeLabel,
  rangeToInstants,
  searchToFilters,
} from './systemLogDisplay';

// A Thursday afternoon in the viewer's (test) time zone.
const NOW = new Date(2026, 10, 19, 15, 30);
const local = (...parts: [number, number, number, number?, number?, number?, number?]) =>
  new Date(...parts).toISOString();

describe('rangeToInstants', () => {
  it('maps presets to whole local days, open-ended where the range reaches today', () => {
    expect(rangeToInstants({}, NOW)).toEqual({});
    expect(rangeToInstants({ preset: 'today' }, NOW)).toEqual({
      createdFrom: local(2026, 10, 19),
    });
    expect(rangeToInstants({ preset: 'yesterday' }, NOW)).toEqual({
      createdFrom: local(2026, 10, 18),
      createdTo: local(2026, 10, 18, 23, 59, 59, 999),
    });
    expect(rangeToInstants({ preset: 'last7' }, NOW)).toEqual({ createdFrom: local(2026, 10, 13) });
    expect(rangeToInstants({ preset: 'last30' }, NOW)).toEqual({
      createdFrom: local(2026, 9, 21),
    });
    expect(rangeToInstants({ preset: 'thisMonth' }, NOW)).toEqual({
      createdFrom: local(2026, 10, 1),
    });
    expect(rangeToInstants({ preset: 'lastMonth' }, NOW)).toEqual({
      createdFrom: local(2026, 9, 1),
      createdTo: local(2026, 9, 31, 23, 59, 59, 999),
    });
  });

  it('includes the whole end day of a custom range and drops an end before the start', () => {
    expect(
      rangeToInstants({ preset: 'custom', from: '2026-11-01', to: '2026-11-05' }, NOW),
    ).toEqual({
      createdFrom: local(2026, 10, 1),
      createdTo: local(2026, 10, 5, 23, 59, 59, 999),
    });
    expect(rangeToInstants({ preset: 'custom', to: '2026-11-05' }, NOW)).toEqual({
      createdFrom: undefined,
      createdTo: local(2026, 10, 5, 23, 59, 59, 999),
    });
    expect(
      rangeToInstants({ preset: 'custom', from: '2026-11-05', to: '2026-11-01' }, NOW),
    ).toEqual({ createdFrom: local(2026, 10, 5), createdTo: undefined });
  });
});

describe('parseDay and rangeLabel', () => {
  it('accepts only real calendar days', () => {
    expect(parseDay('2026-02-28')).toEqual(new Date(2026, 1, 28));
    expect(parseDay('2026-02-30')).toBeUndefined();
    expect(parseDay('26-2-1')).toBeUndefined();
    expect(parseDay(undefined)).toBeUndefined();
  });

  it('labels presets and custom ranges', () => {
    expect(rangeLabel({})).toBeUndefined();
    expect(rangeLabel({ preset: 'last7' })).toBe('Last 7 days');
    expect(rangeLabel({ preset: 'custom', from: '2026-11-01' })).toMatch(/^From /);
    expect(rangeLabel({ preset: 'custom', to: '2026-11-01' })).toMatch(/^Until /);
    expect(rangeLabel({ preset: 'custom', from: '2026-11-01', to: '2026-11-02' })).toContain('–');
  });
});

describe('searchToFilters', () => {
  it('sends an exact IP address to the ipAddress filter and anything else as an action keyword', () => {
    expect(searchToFilters('  ')).toEqual({});
    expect(searchToFilters(' 203.0.113.5 ')).toEqual({ ipAddress: '203.0.113.5' });
    expect(searchToFilters('2001:db8::1')).toEqual({ ipAddress: '2001:db8::1' });
    expect(searchToFilters('Access denied')).toEqual({ action: 'Access denied' });
    expect(searchToFilters('x'.repeat(150)).action).toHaveLength(100);
  });

  it('tells IP addresses from look-alikes', () => {
    expect(isIpAddress('::1')).toBe(true);
    expect(isIpAddress('256.1.1.1')).toBe(false);
    expect(isIpAddress('1.2.3')).toBe(false);
    expect(isIpAddress('faqs')).toBe(false);
    expect(isIpAddress('a:b')).toBe(false);
  });
});

describe('maskSensitive', () => {
  it('masks credential-like keys at any depth and keeps everything else', () => {
    expect(
      maskSensitive({
        status: 403,
        password: 'hunter2',
        nested: { refresh_token: 'abc', list: [{ apiKey: 'k', id: 1 }] },
      }),
    ).toEqual({
      status: 403,
      password: MASK,
      nested: { refresh_token: MASK, list: [{ apiKey: MASK, id: 1 }] },
    });
  });
});

describe('labels', () => {
  it('names known modules and humanizes unknown ones', () => {
    expect(moduleLabel('site_visits')).toBe('Site visits');
    expect(moduleLabel('permissions')).toBe('Access control');
    expect(moduleLabel('new_thing')).toBe('New thing');
    expect(moduleOptionsWith('new_thing').at(-1)).toEqual({
      value: 'new_thing',
      label: 'New thing',
    });
    expect(moduleOptionsWith('faqs')).toBe(moduleOptionsWith(undefined));
  });

  it('tells system jobs from guests', () => {
    expect(actorLabel({ user: null, requestMethod: null }).name).toBe('System');
    expect(actorLabel({ user: null, requestMethod: 'POST' }).name).toBe('Guest');
  });

  it('summarizes common user agents', () => {
    expect(
      describeUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36 Edg/131.0',
      ),
    ).toBe('Edge on Windows');
    expect(describeUserAgent('PostmanRuntime/7.39.0')).toBe('Postman');
    expect(describeUserAgent(null)).toBeUndefined();
  });
});

describe('toSystemLogCsv', () => {
  it('writes one escaped row per log without the additional data', () => {
    const log: SystemLog = {
      id: 7,
      user: null,
      module: 'system',
      action: '=Expired data removed, 3 rows',
      logLevel: 'info',
      ipAddress: null,
      userAgent: null,
      requestMethod: null,
      requestUrl: null,
      referenceId: null,
      referenceType: null,
      additionalData: { secretNote: 'never exported' },
      createdAt: '2026-11-19T02:00:00Z',
    };
    const csv = toSystemLogCsv([log]);
    const [header, row] = csv.replace(/^\uFEFF/, '').split('\r\n');
    expect(header).toContain('Log ID,Date (UTC),User');
    expect(row).toContain('#LOG-7,2026-11-19T02:00:00Z,System');
    expect(row).toContain(`"'=Expired data removed, 3 rows"`);
    expect(csv).not.toContain('never exported');
  });
});
