import { type CsvColumn, toCsv } from '@/utils/csv';

import type { SiteVisitSummary } from '../types/siteVisit.types';

import {
  propertyPlace,
  shortTime,
  SITE_VISIT_INTEREST_META,
  SITE_VISIT_STATUS_META,
  SITE_VISIT_TYPE_LABELS,
  userName,
} from './siteVisitDisplay';

const COLUMNS: readonly CsvColumn<SiteVisitSummary>[] = [
  ['Visit ID', (v) => v.visitCode],
  ['Visitor', (v) => v.name],
  ['Mobile', (v) => v.mobile],
  ['Property', (v) => v.property.projectName ?? 'Deleted property'],
  ['Location', (v) => propertyPlace(v.property) ?? ''],
  ['Visit date', (v) => v.visitDate],
  ['Visit time', (v) => shortTime(v.visitTime)],
  ['Type', (v) => SITE_VISIT_TYPE_LABELS[v.visitType]],
  ['Status', (v) => SITE_VISIT_STATUS_META[v.status].label],
  ['People', (v) => String(v.numberOfPeople)],
  ['Agent', (v) => userName(v.assignee, '')],
  ['Builder', (v) => userName(v.builder, '')],
  ['Customer account', (v) => userName(v.customer, '')],
  ['Interest', (v) => (v.interest ? SITE_VISIT_INTEREST_META[v.interest].label : '')],
  ['Next follow-up (UTC)', (v) => v.nextFollowUp ?? ''],
  ['Created (UTC)', (v) => v.createdAt],
];

export function toSiteVisitCsv(visits: readonly SiteVisitSummary[]): string {
  return toCsv(COLUMNS, visits);
}
