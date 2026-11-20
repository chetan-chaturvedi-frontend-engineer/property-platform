import { type CsvColumn, toCsv } from '@/utils/csv';

import type { Banner } from '../types/banner.types';

import { DISPLAY_STATE_META } from './bannerDisplay';
import { bannerPlacementLabel, bannerTypeLabel } from './bannerOptions';

const COLUMNS: readonly CsvColumn<Banner>[] = [
  ['ID', (b) => String(b.id)],
  ['Title', (b) => b.title],
  ['Type', (b) => bannerTypeLabel(b.type)],
  ['Placement', (b) => bannerPlacementLabel(b.placement)],
  ['Status', (b) => (b.status === 'active' ? 'Active' : 'Inactive')],
  ['Display state', (b) => DISPLAY_STATE_META[b.displayState].label],
  ['Link type', (b) => b.linkType ?? ''],
  ['Link', (b) => b.link ?? ''],
  ['Start (UTC)', (b) => b.startDate ?? ''],
  ['End (UTC)', (b) => b.endDate ?? ''],
  ['Created (UTC)', (b) => b.createdAt],
  ['Updated (UTC)', (b) => b.updatedAt],
];

export function toBannerCsv(banners: readonly Banner[]): string {
  return toCsv(COLUMNS, banners);
}
