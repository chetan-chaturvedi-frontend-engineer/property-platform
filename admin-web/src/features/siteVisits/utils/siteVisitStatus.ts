import type { RequestableStatus, SiteVisitSummary } from '../types/siteVisit.types';

import { isDue, isUpcoming } from './siteVisitDisplay';

export type StatusTarget = Pick<
  SiteVisitSummary,
  'id' | 'visitCode' | 'status' | 'visitDate' | 'visitTime'
>;

/**
 * Whether the backend's lifecycle allows moving this visit to `next`, and why not. Mirrors
 * `SiteVisitStatus.canChangeTo` plus the "visit date reached" rule for completed and no-show.
 */
export function transitionBlocker(
  visit: StatusTarget,
  next: RequestableStatus,
  now: Date = new Date(),
): string | null {
  if (!isUpcoming(visit.status)) return 'Only upcoming visits can change status';
  if (next === visit.status) return 'Already has this status';
  if (
    (next === 'completed' || next === 'no_show') &&
    !isDue(visit.visitDate, visit.visitTime, now)
  ) {
    return 'Possible once the visit time is reached';
  }
  return null;
}

export function statusOptionsFor(
  visits: readonly StatusTarget[],
  options: readonly RequestableStatus[],
  now: Date = new Date(),
): Array<{ status: RequestableStatus; eligible: number; blocker: string | null }> {
  return options.map((status) => {
    const blockers = visits.map((visit) => transitionBlocker(visit, status, now));
    const eligible = blockers.filter((blocker) => blocker === null).length;
    return { status, eligible, blocker: eligible === 0 ? (blockers[0] ?? null) : null };
  });
}
