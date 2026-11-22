import { type CsvColumn, toCsv } from '@/utils/csv';

import type { ManagedUser } from '../types/user.types';

import { roleLabel, USER_STATUS_META } from './userDisplay';

const COLUMNS: readonly CsvColumn<ManagedUser>[] = [
  ['Name', (u) => u.fullName],
  ['Phone', (u) => u.phone ?? ''],
  ['Email', (u) => u.email],
  ['Role', (u) => roleLabel(u)],
  ['Status', (u) => USER_STATUS_META[u.status].label],
  ['Joined date (UTC)', (u) => u.createdAt.slice(0, 10)],
];

export function toUserCsv(users: readonly ManagedUser[]): string {
  return toCsv(COLUMNS, users);
}
