import { formatRelativeTime } from './formatters';

const NOW = Date.parse('2026-11-22T12:00:00Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe('formatRelativeTime', () => {
  it('describes recent instants relative to now', () => {
    expect(formatRelativeTime(ago(20_000), NOW)).toBe('just now');
    expect(formatRelativeTime(ago(5 * 60_000), NOW)).toBe('5 minutes ago');
    expect(formatRelativeTime(ago(3 * 3_600_000), NOW)).toBe('3 hours ago');
    expect(formatRelativeTime(ago(24 * 3_600_000), NOW)).toBe('yesterday');
    expect(formatRelativeTime(ago(14 * 24 * 3_600_000), NOW)).toBe('2 weeks ago');
  });

  it('falls back to the date for old instants and a dash for missing or invalid ones', () => {
    expect(formatRelativeTime(ago(90 * 24 * 3_600_000), NOW)).toMatch(/2026/);
    expect(formatRelativeTime(null, NOW)).toBe('—');
    expect(formatRelativeTime('not a date', NOW)).toBe('—');
  });
});
