import { useCallback, useEffect, useRef, useState } from 'react';

import { toApiError } from '@/services/api/apiError';
import { notify } from '@/store/notificationStore';
import { downloadCsv } from '@/utils/csv';

import { propertyService } from '../services/propertyService';
import type { PropertyFilters } from '../types/property.types';
import { type PropertyExportRow, toPropertyCsv } from '../utils/propertyCsv';

/**
 * Properties per export. There is no export endpoint: the list is read page by page and each property's
 * details are loaded for the fields only they have (description, media, review history).
 */
export const PROPERTY_EXPORT_LIMIT = 1000;
/** Detail requests in flight at once. */
const DETAIL_CONCURRENCY = 6;

export type PropertyExportFilters = Omit<PropertyFilters, 'page' | 'size'>;

const fileName = () => `properties-${new Date().toISOString().slice(0, 10)}.csv`;
const plural = (count: number) => `${count} propert${count === 1 ? 'y' : 'ies'}`;

/** Runs `task` for every item with at most `limit` in flight; rejects on the first failure. */
async function mapLimited<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      const item = items[index];
      if (item !== undefined) results[index] = await task(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Exports every property matching the filters, with full details, as CSV; aborted on unmount. */
export function usePropertyExport() {
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  const exportMatching = useCallback(async (filters: PropertyExportFilters) => {
    if (controller.current) return;
    const current = new AbortController();
    controller.current = current;
    setProgress({ loaded: 0, total: 0 });
    try {
      const { rows: summaries, total } = await propertyService.listAll(filters, {
        limit: PROPERTY_EXPORT_LIMIT,
        signal: current.signal,
      });
      if (summaries.length === 0) {
        notify('No properties match these filters.', 'info');
        return;
      }
      setProgress({ loaded: 0, total: summaries.length });
      let loaded = 0;
      const rows = await mapLimited(summaries, DETAIL_CONCURRENCY, async (summary) => {
        const property = summary.deletedAt
          ? null
          : await propertyService.get(summary.id, current.signal);
        loaded += 1;
        setProgress({ loaded, total: summaries.length });
        return { summary, property } satisfies PropertyExportRow;
      });
      downloadCsv(toPropertyCsv(rows), fileName());
      notify(
        total > rows.length
          ? `Exported the first ${rows.length} of ${total} properties. Narrow the filters to export the rest.`
          : `Exported ${plural(rows.length)}.`,
        total > rows.length ? 'warning' : 'success',
      );
    } catch (error) {
      if (!current.signal.aborted) notify(`Export failed: ${toApiError(error).message}`, 'error');
    } finally {
      current.abort();
      controller.current = null;
      setProgress(null);
    }
  }, []);

  return { exportMatching, isExporting: progress !== null, progress };
}
