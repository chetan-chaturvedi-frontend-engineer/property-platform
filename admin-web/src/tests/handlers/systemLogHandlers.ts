import { http, HttpResponse } from 'msw';

import type { PageResponse } from '@/types/api.types';
import type { SystemLog } from '@/features/dashboard/types/systemLog.types';

import { mockDb } from '../mocks/mockDb';

import { apiPath, problem } from './problem';

export const systemLogHandlers = [
  http.get(apiPath('/admin/system-logs'), ({ request }) => {
    const user = mockDb.sessionUser();
    if (!user) {
      return problem(401, 'unauthorized', 'Authentication required.');
    }
    if (!user.permissions.includes('SYSTEM_LOG_LIST')) {
      return problem(403, 'access_denied', 'Access denied.');
    }
    const params = new URL(request.url).searchParams;
    const page = Number(params.get('page') ?? 0);
    const size = Math.min(Number(params.get('size') ?? 20), 100);
    const module = params.get('module');
    const logLevel = params.get('logLevel');
    const referenceId = params.get('referenceId');

    const filtered = mockDb
      .logs()
      .filter(
        (log) =>
          (!module || log.module === module) &&
          (!logLevel || log.logLevel === logLevel) &&
          (!referenceId || String(log.referenceId) === referenceId),
      );
    const body: PageResponse<SystemLog> = {
      content: filtered.slice(page * size, page * size + size),
      page,
      size,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / size),
    };
    return HttpResponse.json(body);
  }),
];
