import type { SiteVisitSummary } from '../types/siteVisit.types';

import {
  propertyPlace,
  shortTime,
  SITE_VISIT_INTEREST_META,
  SITE_VISIT_STATUS_META,
  SITE_VISIT_TYPE_LABELS,
  userName,
} from './siteVisitDisplay';

const COLUMNS: ReadonlyArray<[string, (visit: SiteVisitSummary) => string]> = [
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

/**
 * One CSV cell. Values a spreadsheet would run as a formula (=, +, -, @, tab, CR) get a leading
 * apostrophe, so exported visitor input cannot inject formulas.
 */
export function csvCell(value: string): string {
  // A plain "+919876543210" cannot run as a formula, so phone numbers stay unchanged.
  const isPhone = /^\+\d{6,15}$/.test(value);
  const safe = !isPhone && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const BOM = String.fromCharCode(0xfeff);

export function toSiteVisitCsv(visits: readonly SiteVisitSummary[]): string {
  const lines = [COLUMNS.map(([header]) => csvCell(header)).join(',')];
  for (const visit of visits) {
    lines.push(COLUMNS.map(([, read]) => csvCell(read(visit))).join(','));
  }
  // CRLF and a BOM, so Excel opens it as UTF-8.
  return `${BOM}${lines.join('\r\n')}\r\n`;
}

/** Hands the CSV to the browser as a download. */
export function downloadCsv(content: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
