const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});
const numberFormatter = new Intl.NumberFormat();

/** API timestamps are ISO-8601 UTC; shown in the viewer's time zone. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date);
}

export function formatNumber(value: number | null | undefined): string {
  return value == null ? '—' : numberFormatter.format(value);
}

/** "SYSTEM_LOG_LIST" -> "System log list". */
export function humanizeCode(code: string): string {
  const words = code
    .toLowerCase()
    .replace(/[_.-]+/g, ' ')
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
/** Each unit is used while the value stays below its limit; the next unit is that many times larger. */
const RELATIVE_UNITS: ReadonlyArray<{ unit: Intl.RelativeTimeFormatUnit; limit: number }> = [
  { unit: 'minute', limit: 60 },
  { unit: 'hour', limit: 24 },
  { unit: 'day', limit: 7 },
  { unit: 'week', limit: 5 },
];

/**
 * "5 minutes ago", "yesterday", "3 weeks ago"; older than ~a month shows the date. `now` is injectable for
 * tests.
 */
export function formatRelativeTime(value: string | null | undefined, now = Date.now()): string {
  if (!value) {
    return '—';
  }
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) {
    return '—';
  }
  const seconds = (time - now) / 1000;
  if (Math.abs(seconds) < 60) {
    return 'just now';
  }
  let amount = seconds / 60;
  for (const { unit, limit } of RELATIVE_UNITS) {
    if (Math.abs(Math.round(amount)) < limit) {
      return relativeFormatter.format(Math.round(amount), unit);
    }
    amount /= limit;
  }
  return formatDateTime(value);
}
