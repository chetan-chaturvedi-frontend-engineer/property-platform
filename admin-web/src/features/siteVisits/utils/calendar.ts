import { addDays } from './siteVisitDisplay';

export interface CalendarDay {
  /** `yyyy-MM-dd`. */
  date: string;
  day: number;
  inMonth: boolean;
}

/** `yyyy-MM` of a `yyyy-MM-dd` date. */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** `yyyy-MM` shifted by whole months. */
export function shiftMonth(month: string, delta: number): string {
  const [year = 1970, mon = 1] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, mon - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

/** First and last day of a `yyyy-MM` month. */
export function monthRange(month: string): { from: string; to: string } {
  const from = `${month}-01`;
  const to = addDays(`${shiftMonth(month, 1)}-01`, -1);
  return { from, to };
}

/** Whole weeks (Monday first) covering the month, for a 7-column grid. */
export function calendarWeeks(month: string): CalendarDay[][] {
  const { from, to } = monthRange(month);
  const [year = 1970, mon = 1] = month.split('-').map(Number);
  // getUTCDay: 0 = Sunday; shift so Monday = 0.
  const lead = (new Date(Date.UTC(year, mon - 1, 1)).getUTCDay() + 6) % 7;
  let cursor = addDays(from, -lead);
  const weeks: CalendarDay[][] = [];
  while (cursor <= to || weeks.length === 0) {
    const week: CalendarDay[] = [];
    for (let i = 0; i < 7; i += 1) {
      week.push({ date: cursor, day: Number(cursor.slice(8)), inMonth: monthOf(cursor) === month });
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

const monthFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatMonth(month: string): string {
  return monthFormatter.format(new Date(`${month}-01T00:00:00Z`));
}

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
