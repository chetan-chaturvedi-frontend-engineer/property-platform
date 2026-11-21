import { type CsvColumn, toCsv } from '@/utils/csv';

import type { SystemLog } from '../types/systemLog.types';

import { actorLabel, formatLogId, moduleLabel, SYSTEM_LOG_LEVEL_META } from './systemLogDisplay';

/** Additional data is left out: it is free-form and may hold more than an export should. */
const COLUMNS: readonly CsvColumn<SystemLog>[] = [
  ['Log ID', (log) => formatLogId(log.id)],
  ['Date (UTC)', (log) => log.createdAt],
  ['User', (log) => actorLabel(log).name],
  ['User ID', (log) => (log.user ? String(log.user.id) : '')],
  ['User email', (log) => log.user?.email ?? ''],
  ['User role', (log) => log.user?.userType ?? ''],
  ['Module', (log) => moduleLabel(log.module)],
  ['Action', (log) => log.action],
  ['Level', (log) => SYSTEM_LOG_LEVEL_META[log.logLevel].label],
  ['IP address', (log) => log.ipAddress ?? ''],
  ['Method', (log) => log.requestMethod ?? ''],
  ['Endpoint', (log) => log.requestUrl ?? ''],
  [
    'Reference',
    (log) => (log.referenceType ? `${log.referenceType} ${log.referenceId ?? ''}` : ''),
  ],
  ['User agent', (log) => log.userAgent ?? ''],
];

export function toSystemLogCsv(logs: readonly SystemLog[]): string {
  return toCsv(COLUMNS, logs);
}
