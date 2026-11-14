import { formatListTime, formatTime12, formatVisitDate, to24Hour, upcomingDays, weekdayOf } from '../src/utils/dates';

describe('upcomingDays', () => {
  it('starts today, uses local dates and rolls over month ends', () => {
    const days = upcomingDays(3, new Date(2026, 4, 30, 23, 30));
    expect(days.map(d => d.iso)).toEqual(['2026-05-30', '2026-05-31', '2026-06-01']);
    expect(days[0].dow).toBe('Today');
    expect(days[1]).toMatchObject({ dow: 'Sun', d: '31', m: 'May' });
    expect(days[2]).toMatchObject({ d: '01', m: 'Jun' });
  });
});

describe('time helpers', () => {
  it('converts 12-hour labels to 24-hour', () => {
    expect(to24Hour('10:00 AM')).toBe('10:00');
    expect(to24Hour('12:00 PM')).toBe('12:00');
    expect(to24Hour('12:30 AM')).toBe('00:30');
    expect(to24Hour('02:00 PM')).toBe('14:00');
    expect(() => to24Hour('25 o clock')).toThrow();
  });
  it('formats server times back to 12-hour', () => {
    expect(formatTime12('14:00:00')).toBe('02:00 PM');
    expect(formatTime12('00:15')).toBe('12:15 AM');
    expect(formatTime12('12:00')).toBe('12:00 PM');
  });
});

describe('visit dates', () => {
  it('formats a date and its weekday without timezone shifts', () => {
    expect(formatVisitDate('2026-05-22')).toBe('22 May 2026');
    expect(weekdayOf('2026-05-22')).toBe('Friday');
  });
});

describe('formatListTime', () => {
  const now = new Date(2026, 4, 22, 12, 0);
  it('shows a time today, Yesterday, then a short date', () => {
    expect(formatListTime(new Date(2026, 4, 22, 9, 15).toISOString(), now)).toBe('09:15 AM');
    expect(formatListTime(new Date(2026, 4, 21, 18, 0).toISOString(), now)).toBe('Yesterday');
    expect(formatListTime(new Date(2026, 4, 17, 18, 0).toISOString(), now)).toBe('17 May');
  });
});
