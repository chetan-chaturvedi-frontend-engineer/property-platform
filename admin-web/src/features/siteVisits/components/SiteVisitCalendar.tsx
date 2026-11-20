import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Today from '@mui/icons-material/Today';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { Button } from '@/components/common/Button';
import { ErrorState } from '@/components/common/Feedback/ErrorState';
import { cn } from '@/utils/helpers';

import type { SiteVisitSummary } from '../types/siteVisit.types';
import { calendarWeeks, formatMonth, shiftMonth, WEEKDAYS } from '../utils/calendar';
import { formatVisitTime, SITE_VISIT_STATUS_META } from '../utils/siteVisitDisplay';

interface SiteVisitCalendarProps {
  /** `yyyy-MM`. */
  month: string;
  /** Today at the property, highlighted. */
  today: string;
  visits: readonly SiteVisitSummary[] | undefined;
  /** All matching visits in the month; more than `visits.length` means the list was cut off. */
  total?: number;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onMonthChange: (month: string) => void;
  onToday: () => void;
  onSelectVisit?: (visit: SiteVisitSummary) => void;
  /** "+N more" opens the day, e.g. as a list filtered to that date. */
  onSelectDay?: (date: string) => void;
  /** Visits listed per day before "+N more". */
  maxPerDay?: number;
}

/** A month grid of visits by property-local date. Chips open the visit. */
export function SiteVisitCalendar({
  month,
  today,
  visits,
  total,
  isLoading = false,
  error = null,
  onRetry,
  onMonthChange,
  onToday,
  onSelectVisit,
  onSelectDay,
  maxPerDay = 3,
}: SiteVisitCalendarProps) {
  const byDate = new Map<string, SiteVisitSummary[]>();
  for (const visit of visits ?? []) {
    const list = byDate.get(visit.visitDate) ?? [];
    list.push(visit);
    byDate.set(visit.visitDate, list);
  }
  const weeks = calendarWeeks(month);

  return (
    <section aria-label="Site visit calendar" className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Tooltip title="Previous month">
          <IconButton
            aria-label="Previous month"
            onClick={() => onMonthChange(shiftMonth(month, -1))}
          >
            <ChevronLeft />
          </IconButton>
        </Tooltip>
        <Typography variant="h6" component="h2" className="min-w-40 text-center" aria-live="polite">
          {formatMonth(month)}
        </Typography>
        <Tooltip title="Next month">
          <IconButton aria-label="Next month" onClick={() => onMonthChange(shiftMonth(month, 1))}>
            <ChevronRight />
          </IconButton>
        </Tooltip>
        <Button variant="outlined" size="small" startIcon={<Today />} onClick={onToday}>
          Today
        </Button>
      </div>
      {visits && total !== undefined && total > visits.length && (
        <Alert severity="warning">
          Showing the first {visits.length} of {total} visits this month. Narrow the filters to see
          the rest.
        </Alert>
      )}
      {error && !visits ? (
        <ErrorState message={error.message} onRetry={onRetry} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] table-fixed border-collapse text-sm">
            <caption className="sr-only">Visits in {formatMonth(month)}</caption>
            <thead>
              <tr>
                {WEEKDAYS.map((day) => (
                  <th key={day} scope="col" className="text-muted py-2 text-xs font-semibold">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week[0]?.date}>
                  {week.map((day) => {
                    const dayVisits = byDate.get(day.date) ?? [];
                    return (
                      <td
                        key={day.date}
                        className={cn(
                          'h-28 border p-1 align-top',
                          !day.inMonth && 'bg-[var(--mui-palette-action-hover)] opacity-60',
                        )}
                      >
                        <div
                          className={cn(
                            'mb-1 flex size-6 items-center justify-center rounded-full text-xs font-semibold',
                            day.date === today && 'bg-primary-600 text-white',
                          )}
                          aria-current={day.date === today ? 'date' : undefined}
                        >
                          {day.day}
                        </div>
                        {isLoading && !visits ? (
                          <Skeleton variant="rounded" height={18} />
                        ) : (
                          <ul className="flex flex-col gap-0.5">
                            {dayVisits.slice(0, maxPerDay).map((visit) => {
                              const palette = SITE_VISIT_STATUS_META[visit.status].color;
                              return (
                                <li key={visit.id}>
                                  <button
                                    type="button"
                                    onClick={() => onSelectVisit?.(visit)}
                                    title={`${visit.visitCode} · ${visit.name} · ${SITE_VISIT_STATUS_META[visit.status].label}`}
                                    className="w-full cursor-pointer truncate rounded px-1 py-0.5 text-left text-xs focus-visible:outline-2 focus-visible:outline-[var(--app-primary-strong)]"
                                    style={{
                                      backgroundColor: `rgba(var(--mui-palette-${palette}-mainChannel) / 0.14)`,
                                      color: `var(--mui-palette-${palette}-main)`,
                                    }}
                                  >
                                    <span className="font-semibold">
                                      {formatVisitTime(visit.visitTime)}
                                    </span>{' '}
                                    {visit.name}
                                    <span className="sr-only">
                                      , {SITE_VISIT_STATUS_META[visit.status].label}
                                    </span>
                                  </button>
                                </li>
                              );
                            })}
                            {dayVisits.length > maxPerDay && (
                              <li>
                                {onSelectDay ? (
                                  <button
                                    type="button"
                                    onClick={() => onSelectDay(day.date)}
                                    className="text-muted cursor-pointer px-1 text-xs underline-offset-2 hover:underline"
                                  >
                                    +{dayVisits.length - maxPerDay} more
                                  </button>
                                ) : (
                                  <span className="text-muted px-1 text-xs">
                                    +{dayVisits.length - maxPerDay} more
                                  </span>
                                )}
                              </li>
                            )}
                          </ul>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
