import { useSiteVisitCalendar } from '../hooks/useSiteVisits';
import type { SiteVisitFilters, SiteVisitSummary } from '../types/siteVisit.types';
import { monthRange } from '../utils/calendar';

import { SiteVisitCalendar } from './SiteVisitCalendar';

interface SiteVisitCalendarViewProps {
  /** `yyyy-MM`. */
  month: string;
  today: string;
  /** The list filters (search, status, property, agent, ...), applied to the month as well. */
  filters: Omit<SiteVisitFilters, 'page' | 'size' | 'sort' | 'visitDateFrom' | 'visitDateTo'>;
  onMonthChange: (month: string) => void;
  onSelectVisit?: (visit: SiteVisitSummary) => void;
  onSelectDay?: (date: string) => void;
}

/** Loads the visits of one month and shows them in the calendar grid. */
export function SiteVisitCalendarView({
  month,
  today,
  filters,
  onMonthChange,
  onSelectVisit,
  onSelectDay,
}: SiteVisitCalendarViewProps) {
  const { from, to } = monthRange(month);
  const { data, isPending, isFetching, error, refetch } = useSiteVisitCalendar(from, to, filters);

  return (
    <div className={isFetching && !isPending ? 'opacity-60 transition-opacity' : undefined}>
      <SiteVisitCalendar
        month={month}
        today={today}
        visits={data?.rows}
        total={data?.total}
        isLoading={isPending}
        error={error}
        onRetry={() => void refetch()}
        onMonthChange={onMonthChange}
        onToday={() => onMonthChange(today.slice(0, 7))}
        onSelectVisit={onSelectVisit}
        onSelectDay={onSelectDay}
      />
    </div>
  );
}
