import type { ManagedUser } from '../types/user.types';

import { toUserCsv } from './userCsv';
import { roleTone } from './userDisplay';

const USER: ManagedUser = {
  id: 7,
  fullName: 'Neha "NK" Kapoor, Jr.',
  email: 'neha@example.com',
  phone: '+919876543210',
  status: 'suspended',
  userType: 'sales-executive',
  role: { slug: 'sales-executive', name: 'Sales Executive', active: true },
  emailVerified: true,
  phoneVerified: false,
  notificationsEnabled: true,
  createdAt: '2026-11-18T09:30:00Z',
  updatedAt: null,
};

describe('toUserCsv', () => {
  it('writes the export columns with quoted special characters', () => {
    const lines = toUserCsv([USER])
      .replace(/^\uFEFF/, '')
      .trim()
      .split('\r\n');
    expect(lines).toEqual([
      'Name,Phone,Email,Role,Status,Joined date (UTC)',
      '"Neha ""NK"" Kapoor, Jr.",+919876543210,neha@example.com,Sales Executive,Blocked,2026-11-18',
    ]);
  });

  it('neutralises formulas and leaves missing phones empty', () => {
    const csv = toUserCsv([{ ...USER, fullName: '=HYPERLINK("x")', phone: null }]);
    expect(csv).toContain(`"'=HYPERLINK(""x"")",,`);
  });
});

describe('roleTone', () => {
  it('gives a role the same tone every time and roles without permissions a neutral one', () => {
    expect(roleTone(USER)).toBe(roleTone({ ...USER }));
    expect(roleTone({ ...USER, role: null })).toBe('neutral');
    expect(roleTone({ ...USER, role: { ...USER.role!, active: false } })).toBe('neutral');
  });
});
