const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface DayOption {
  /** Local calendar date, yyyy-MM-dd: what the backend expects as visitDate. */
  iso: string;
  dow: string;
  d: string;
  m: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** yyyy-MM-dd as a local date (never via UTC, which can shift the day). */
function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** The next `count` days starting today, for the visit date picker. */
export function upcomingDays(count: number, from: Date = new Date()): DayOption[] {
  return Array.from({ length: count }, (_, i) => {
    const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    return {
      iso: `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`,
      dow: i === 0 ? 'Today' : WEEKDAYS[day.getDay()].slice(0, 3),
      d: pad(day.getDate()),
      m: MONTHS[day.getMonth()],
    };
  });
}

/** "02:00 PM" -> "14:00". */
export function to24Hour(label: string): string {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(label.trim());
  if (!match) {
    throw new Error(`Unrecognised time: ${label}`);
  }
  const hour = (Number(match[1]) % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  return `${pad(hour)}:${match[2]}`;
}

/** "14:00" or "14:00:00" -> "02:00 PM". */
export function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return `${pad(h % 12 === 0 ? 12 : h % 12)}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** "2026-05-22" -> "22 May 2026". */
export function formatVisitDate(iso: string): string {
  const day = parseIso(iso);
  return `${pad(day.getDate())} ${MONTHS[day.getMonth()]} ${day.getFullYear()}`;
}

export function weekdayOf(iso: string): string {
  return WEEKDAYS[parseIso(iso).getDay()];
}

/** Short relative label for lists: "10:30 AM" today, "Yesterday", else "17 May". */
export function formatListTime(instant: string, now: Date = new Date()): string {
  const at = new Date(instant);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(at)) / 86_400_000);
  if (days <= 0) {
    return formatTime12(`${at.getHours()}:${at.getMinutes()}`);
  }
  return days === 1 ? 'Yesterday' : `${pad(at.getDate())} ${MONTHS[at.getMonth()]}`;
}
