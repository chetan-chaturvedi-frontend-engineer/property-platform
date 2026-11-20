import { useCallback, useEffect, useRef, useState } from 'react';

import { toApiError } from '@/services/api/apiError';
import { notify } from '@/store/notificationStore';
import { downloadCsv } from '@/utils/csv';

import { subscriptionPlanService } from '../services/subscriptionPlanService';
import type { PlanFilters } from '../types/subscriptionPlan.types';
import { toPlanCsv } from '../utils/planCsv';

/** Rows per export; there is no export endpoint, so rows are read page by page (100 each). */
export const PLAN_EXPORT_LIMIT = 2000;

/** Exports every plan matching the filters as CSV; aborted on unmount. */
export function usePlanExport() {
  const [isExporting, setIsExporting] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  const start = useCallback(async (filters: Omit<PlanFilters, 'page' | 'size'>) => {
    if (controller.current) return;
    const current = new AbortController();
    controller.current = current;
    setIsExporting(true);
    try {
      const { rows, total } = await subscriptionPlanService.listAll(filters, {
        limit: PLAN_EXPORT_LIMIT,
        signal: current.signal,
      });
      if (rows.length === 0) {
        notify('No plans match these filters.', 'info');
        return;
      }
      downloadCsv(
        toPlanCsv(rows),
        `subscription-plans-${new Date().toISOString().slice(0, 10)}.csv`,
      );
      notify(
        total > rows.length
          ? `Exported the first ${rows.length} of ${total} plans. Narrow the filters to export the rest.`
          : `Exported ${rows.length} plan${rows.length === 1 ? '' : 's'}.`,
        total > rows.length ? 'warning' : 'success',
      );
    } catch (error) {
      if (!current.signal.aborted) notify(`Export failed: ${toApiError(error).message}`, 'error');
    } finally {
      controller.current = null;
      setIsExporting(false);
    }
  }, []);

  return { start, isExporting };
}
