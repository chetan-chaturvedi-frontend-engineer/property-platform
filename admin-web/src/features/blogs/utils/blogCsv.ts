import { type CsvColumn, toCsv } from '@/utils/csv';

import type { BlogSummary } from '../types/blog.types';

import { PUBLIC_STATE_META } from './blogDisplay';

const COLUMNS: readonly CsvColumn<BlogSummary>[] = [
  ['ID', (b) => String(b.id)],
  ['Title', (b) => b.title],
  ['Slug', (b) => b.slug],
  ['Category', (b) => b.category?.title ?? ''],
  ['Status', (b) => (b.status === 'publish' ? 'Published' : 'Draft')],
  ['Public state', (b) => PUBLIC_STATE_META[b.publicState].label],
  ['Published (UTC)', (b) => b.publishedAt ?? ''],
  ['Tags', (b) => b.tags.join(', ')],
  ['Short description', (b) => b.shortDescription ?? ''],
  ['Created (UTC)', (b) => b.createdAt],
  ['Updated (UTC)', (b) => b.updatedAt],
];

export function toBlogCsv(blogs: readonly BlogSummary[]): string {
  return toCsv(COLUMNS, blogs);
}
