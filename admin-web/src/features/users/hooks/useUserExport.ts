import { useCallback, useEffect, useRef, useState } from 'react';

import { toApiError } from '@/services/api/apiError';
import { notify } from '@/store/notificationStore';
import { downloadCsv } from '@/utils/csv';

import { userService } from '../services/userService';
import type { UserFilters } from '../types/user.types';
import { toUserCsv } from '../utils/userCsv';

/** Rows per export; there is no export endpoint, so rows are read page by page (100 each). */
export const USER_EXPORT_LIMIT = 5000;

export type UserExportFilters = Omit<UserFilters, 'page' | 'size'>;

const fileName = () => `users-${new Date().toISOString().slice(0, 10)}.csv`;
const plural = (count: number) => `${count} user${count === 1 ? '' : 's'}`;

/** Exports every user matching the filters as CSV; aborted on unmount. */
export function useUserExport() {
  const [isExporting, setIsExporting] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  const exportMatching = useCallback(async (filters: UserExportFilters) => {
    if (controller.current) return;
    const current = new AbortController();
    controller.current = current;
    setIsExporting(true);
    try {
      const { rows, total } = await userService.listAll(filters, {
        limit: USER_EXPORT_LIMIT,
        signal: current.signal,
      });
      if (rows.length === 0) {
        notify('No users match these filters.', 'info');
        return;
      }
      downloadCsv(toUserCsv(rows), fileName());
      notify(
        total > rows.length
          ? `Exported the first ${rows.length} of ${total} users. Narrow the filters to export the rest.`
          : `Exported ${plural(rows.length)}.`,
        total > rows.length ? 'warning' : 'success',
      );
    } catch (error) {
      if (!current.signal.aborted) notify(`Export failed: ${toApiError(error).message}`, 'error');
    } finally {
      controller.current = null;
      setIsExporting(false);
    }
  }, []);

  return { exportMatching, isExporting };
}
