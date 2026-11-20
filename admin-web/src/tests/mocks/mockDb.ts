import type { AdminSessionResponse, AdminUser } from '@/features/auth/types/auth.types';
import type { SystemLog, SystemLogLevel } from '@/features/dashboard/types/systemLog.types';
import type { ManagedUser, UserStatus } from '@/features/users/types/user.types';

import type { Lead } from '@/features/leads/types/lead.types';
import type { SiteVisit } from '@/features/siteVisits/types/siteVisit.types';

import { buildLeads } from './leadMockData';
import { buildProperties, type StoredProperty } from './propertyMockData';
import { buildSiteVisits } from './siteVisitMockData';

/** A `users` row as the mock stores it; the role is resolved from `roles` on every response. */
export type StoredUser = Omit<ManagedUser, 'role'>;

/** A `roles` row: slug (= users.user_type), name, status and granted permission codes. */
export interface MockRole {
  slug: string;
  name: string;
  active: boolean;
  permissions: readonly string[];
}

/**
 * In-memory backend state for MSW, used by tests and by `npm run dev:mock`. Mock credentials only;
 * none of this reaches a production build.
 */
interface MockAccount {
  user: AdminUser;
  password: string;
}

export const MOCK_PASSWORD = 'Admin@1234';

const ADMIN_USER: AdminUser = {
  id: 1,
  fullName: 'Asha Admin',
  email: 'admin@example.com',
  phone: '+919876543210',
  role: { slug: 'admin', name: 'Administrator' },
  permissions: [
    'ADMIN_PANEL_ACCESS',
    'SYSTEM_LOG_CREATE',
    'SYSTEM_LOG_LIST',
    'SYSTEM_LOG_VIEW',
    'USER_LIST',
    'USER_VIEW',
    'USER_CREATE',
    'USER_UPDATE',
    'USER_CHANGE_STATUS',
    'USER_DELETE',
    // The seeded admin role's property module.
    'PROPERTY_CREATE',
    'PROPERTY_CREATE_WITHOUT_SUBSCRIPTION',
    'PROPERTY_LIST_ANY',
    'PROPERTY_VIEW_ANY',
    'PROPERTY_UPDATE_ANY',
    'PROPERTY_DELETE_ANY',
    'PROPERTY_RESTORE_ANY',
    'PROPERTY_REVIEW',
    'PROPERTY_PUBLISH',
    'PROPERTY_SUSPEND',
    'PROPERTY_LEGAL_REVIEW',
    // The seeded admin role's lead module.
    'LEAD_CREATE',
    'LEAD_LIST_ANY',
    'LEAD_VIEW_ANY',
    'LEAD_UPDATE_ANY',
    'LEAD_DELETE_ANY',
    'LEAD_ASSIGN',
    // The seeded admin role's site visit module.
    'SITE_VISIT_LIST_ANY',
    'SITE_VISIT_VIEW_ANY',
    'SITE_VISIT_CREATE_ANY',
    'SITE_VISIT_UPDATE_ANY',
    'SITE_VISIT_DELETE_ANY',
    'SITE_VISIT_ASSIGN_ANY',
    'SITE_VISIT_UPDATE_STATUS_ANY',
    'SITE_VISIT_SUBMIT_REPORT_ANY',
  ],
};

const MANAGER_USER: AdminUser = {
  id: 2,
  fullName: 'Mira Manager',
  email: 'manager@example.com',
  phone: null,
  role: { slug: 'manager', name: 'Manager' },
  // Can browse users but not change them.
  permissions: ['ADMIN_PANEL_ACCESS', 'USER_LIST', 'USER_VIEW'],
};

const APP_USER: AdminUser = {
  id: 3,
  fullName: 'Uma User',
  email: 'user@example.com',
  phone: null,
  role: { slug: 'user', name: 'User' },
  permissions: [],
};

/** Creates and edits users, but may neither change account status nor delete. */
const EDITOR_USER: AdminUser = {
  id: 5,
  fullName: 'Eli Editor',
  email: 'editor@example.com',
  phone: null,
  role: { slug: 'editor', name: 'User Editor' },
  permissions: ['ADMIN_PANEL_ACCESS', 'USER_LIST', 'USER_VIEW', 'USER_CREATE', 'USER_UPDATE'],
};

/** Browses properties but may not change them or act on the workflow. */
const PROPERTY_VIEWER_USER: AdminUser = {
  id: 6,
  fullName: 'Vik Viewer',
  email: 'viewer@example.com',
  phone: null,
  role: { slug: 'property-viewer', name: 'Property Viewer' },
  permissions: ['ADMIN_PANEL_ACCESS', 'PROPERTY_LIST_ANY', 'PROPERTY_VIEW_ANY'],
};

/** Browses every lead but may not change them. */
const LEAD_VIEWER_USER: AdminUser = {
  id: 7,
  fullName: 'Lia Leads',
  email: 'leads@example.com',
  phone: null,
  role: { slug: 'lead-viewer', name: 'Lead Viewer' },
  permissions: ['ADMIN_PANEL_ACCESS', 'LEAD_LIST_ANY', 'LEAD_VIEW_ANY'],
};

/** Lists every site visit but may not open or change them. */
const SITE_VISIT_VIEWER_USER: AdminUser = {
  id: 8,
  fullName: 'Sia Visits',
  email: 'visits@example.com',
  phone: null,
  role: { slug: 'visit-viewer', name: 'Visit Viewer' },
  permissions: ['ADMIN_PANEL_ACCESS', 'SITE_VISIT_LIST_ANY'],
};

export const mockUsers = {
  admin: ADMIN_USER,
  manager: MANAGER_USER,
  appUser: APP_USER,
  editor: EDITOR_USER,
  propertyViewer: PROPERTY_VIEWER_USER,
  leadViewer: LEAD_VIEWER_USER,
  siteVisitViewer: SITE_VISIT_VIEWER_USER,
} as const;

/** Mirrors the seeded roles plus two custom ones. Permissions match the sign-in accounts above. */
function buildRoles(): MockRole[] {
  return [
    {
      slug: 'super-admin',
      name: 'Super Admin',
      active: true,
      permissions: [...ADMIN_USER.permissions, 'ROLE_CREATE', 'ROLE_UPDATE', 'ROLE_DELETE'],
    },
    { slug: 'admin', name: 'Administrator', active: true, permissions: ADMIN_USER.permissions },
    { slug: 'manager', name: 'Manager', active: true, permissions: MANAGER_USER.permissions },
    { slug: 'editor', name: 'User Editor', active: true, permissions: EDITOR_USER.permissions },
    // App roles: owner-scoped app permissions only, no admin panel access.
    { slug: 'user', name: 'User', active: true, permissions: ['PROPERTY_CREATE', 'LEAD_LIST'] },
    { slug: 'sales-executive', name: 'Sales Executive', active: true, permissions: ['LEAD_LIST'] },
    { slug: 'legacy-partner', name: 'Legacy Partner', active: false, permissions: [] },
  ];
}

const MODULES = [
  'faqs',
  'banners',
  'leads',
  'properties',
  'authentication',
  'permissions',
] as const;
const LEVELS: readonly SystemLogLevel[] = ['success', 'info', 'warning'];

function buildLogs(count: number): SystemLog[] {
  const start = Date.parse('2026-11-18T10:00:00Z');
  return Array.from({ length: count }, (_, index) => {
    const module = MODULES[index % MODULES.length] ?? 'faqs';
    const level = LEVELS[index % LEVELS.length] ?? 'info';
    return {
      id: count - index,
      user:
        index % 5 === 4
          ? null
          : {
              ...ADMIN_USER,
              status: 'active',
              userType: 'admin',
              deleted: false,
              createdAt: '2026-10-01T08:00:00Z',
            },
      module,
      action:
        level === 'warning' ? `Access denied: ${module}` : `Updated ${module.replace('_', ' ')}`,
      logLevel: level,
      ipAddress: '203.0.113.5',
      userAgent: 'Mozilla/5.0',
      requestMethod: level === 'info' ? 'GET' : 'POST',
      requestUrl: `/api/v1/admin/${module}`,
      referenceId: index + 10,
      referenceType: 'Record',
      additionalData: { status: level === 'warning' ? 403 : 200 },
      createdAt: new Date(start - index * 37 * 60_000).toISOString(),
    };
  });
}

const FIRST_NAMES = ['Rohit', 'Priya', 'Aman', 'Neha', 'Mohit', 'Riya', 'Suresh', 'Kavya', 'Arjun'];
const LAST_NAMES = ['Sharma', 'Mehta', 'Verma', 'Kapoor', 'Singh', 'Joshi', 'Kumar', 'Iyer'];
const STATUS_CYCLE: readonly UserStatus[] = [
  'active',
  'active',
  'pending',
  'active',
  'inactive',
  'active',
  'suspended',
  'pending',
  'active',
  'rejected',
  'inactive',
  'closed',
];

/** The three sign-in accounts, a super admin and generated app accounts. */
function buildManagedUsers(count: number): StoredUser[] {
  const start = Date.parse('2026-11-18T09:00:00Z');
  const superAdmin = {
    id: 4,
    fullName: 'Sam Super',
    email: 'super@example.com',
    phone: null,
    role: { slug: 'super-admin', name: 'Super Admin' },
    permissions: [],
  } satisfies AdminUser;
  const staff: StoredUser[] = [ADMIN_USER, MANAGER_USER, APP_USER, superAdmin, EDITOR_USER].map(
    (user, index) => ({
      id: user.id,
      fullName: user.fullName,
      email: user.email ?? `user${user.id}@example.com`,
      phone: user.phone,
      status: 'active',
      userType: user.role.slug,
      emailVerified: true,
      phoneVerified: user.phone !== null,
      notificationsEnabled: true,
      // Newest, so the sign-in accounts are on the first page of the default sort.
      createdAt: `2026-11-18T1${index}:00:00Z`,
      updatedAt: null,
    }),
  );
  const generated = Array.from({ length: count }, (_, index): StoredUser => {
    const first = FIRST_NAMES[index % FIRST_NAMES.length] ?? 'Ravi';
    const last = LAST_NAMES[(index * 3) % LAST_NAMES.length] ?? 'Rao';
    const id = 100 + index;
    return {
      id,
      fullName: `${first} ${last}`,
      email: `${first}.${last}${id}@example.com`.toLowerCase(),
      phone: index % 4 === 3 ? null : `+9198765${String(10000 + index).slice(-5)}`,
      status: STATUS_CYCLE[index % STATUS_CYCLE.length] ?? 'active',
      userType: index % 9 === 0 ? 'sales-executive' : index === 31 ? 'legacy-partner' : 'user',
      emailVerified: index % 3 !== 0,
      phoneVerified: index % 2 === 0,
      notificationsEnabled: index % 5 !== 0,
      createdAt: new Date(start - index * 19 * 3_600_000).toISOString(),
      updatedAt: index % 3 === 0 ? null : new Date(start - index * 7 * 3_600_000).toISOString(),
    };
  });
  return [...generated, ...staff];
}

/**
 * What the browser's HttpOnly cookies would hold. JavaScript (and so MSW) cannot read or set real
 * HttpOnly cookies, so the mock backend keeps the "cookie jar" itself. In the browser (`dev:mock`) it
 * is kept in sessionStorage so a reload stays signed in, like real cookies; mock mode only.
 */
interface CookieJar {
  userId: number;
  accessValid: boolean;
  refreshValid: boolean;
}

const JAR_KEY = 'admin-web:mock-cookie-jar';
export const MOCK_CSRF_HEADER = 'X-XSRF-TOKEN';

function readJar(): CookieJar | null {
  try {
    const raw = globalThis.sessionStorage?.getItem(JAR_KEY);
    return raw ? (JSON.parse(raw) as CookieJar) : null;
  } catch {
    return null;
  }
}

function writeJar(jar: CookieJar | null): void {
  try {
    if (jar) {
      globalThis.sessionStorage?.setItem(JAR_KEY, JSON.stringify(jar));
    } else {
      globalThis.sessionStorage?.removeItem(JAR_KEY);
    }
  } catch {
    // Storage blocked: the mock session lasts until the next reload.
  }
}

function createState() {
  return {
    accounts: new Map<string, MockAccount>([
      [ADMIN_USER.email ?? '', { user: ADMIN_USER, password: MOCK_PASSWORD }],
      [MANAGER_USER.email ?? '', { user: MANAGER_USER, password: MOCK_PASSWORD }],
      [APP_USER.email ?? '', { user: APP_USER, password: MOCK_PASSWORD }],
      [EDITOR_USER.email ?? '', { user: EDITOR_USER, password: MOCK_PASSWORD }],
      [PROPERTY_VIEWER_USER.email ?? '', { user: PROPERTY_VIEWER_USER, password: MOCK_PASSWORD }],
      [LEAD_VIEWER_USER.email ?? '', { user: LEAD_VIEWER_USER, password: MOCK_PASSWORD }],
      [
        SITE_VISIT_VIEWER_USER.email ?? '',
        { user: SITE_VISIT_VIEWER_USER, password: MOCK_PASSWORD },
      ],
    ]),
    jar: readJar(),
    csrfToken: 'mock-csrf-token-1',
    registeredEmails: new Set<string>(['taken@example.com']),
    logs: buildLogs(42),
    managedUsers: buildManagedUsers(33),
    roles: buildRoles(),
    nextUserId: 1000,
    properties: buildProperties(26),
    nextPropertyId: 500,
    nextMediaId: 90_000,
    nextApartmentId: 9_000,
    nextPlaceId: 700,
    leads: buildLeads(28),
    nextLeadId: 1000,
    siteVisits: buildSiteVisits(36),
    nextSiteVisitId: 2000,
    /** Idempotency-Key -> created property id, per owner. */
    createKeys: new Map<string, number>(),
  };
}

let state = createState();

function saveJar(jar: CookieJar | null): void {
  state.jar = jar;
  writeJar(jar);
}

export const mockDb = {
  reset(): void {
    writeJar(null);
    state = createState();
  },

  findAccount(identifier: string): MockAccount | undefined {
    return state.accounts.get(identifier.trim().toLowerCase());
  },

  userById(id: number): AdminUser | undefined {
    return [...state.accounts.values()].find((account) => account.user.id === id)?.user;
  },

  /** Login: the backend would set both session cookies. */
  startSession(user: AdminUser): AdminSessionResponse {
    saveJar({ userId: user.id, accessValid: true, refreshValid: true });
    return { expiresIn: 900, refreshTokenExpiresAt: '2026-12-18T10:00:00Z', user };
  },

  /** The user the access cookie authenticates, if it is still valid. */
  sessionUser(): AdminUser | undefined {
    return state.jar?.accessValid ? this.userById(state.jar.userId) : undefined;
  },

  /** Refresh: rotates the cookies if the refresh cookie is valid; otherwise the cookies are cleared. */
  refreshSession(): AdminSessionResponse | undefined {
    const user = state.jar?.refreshValid ? this.userById(state.jar.userId) : undefined;
    if (!user) {
      saveJar(null);
      return undefined;
    }
    return this.startSession(user);
  },

  /** Logout: the session is revoked and the cookies deleted. */
  endSession(): void {
    saveJar(null);
  },

  /** Simulates the 15-minute access cookie running out. */
  expireAccessToken(): void {
    if (state.jar) {
      saveJar({ ...state.jar, accessValid: false });
    }
  },

  /** Simulates a revoked session (logout elsewhere, password reset, reused refresh token). */
  revokeSession(): void {
    if (state.jar) {
      saveJar({ ...state.jar, accessValid: false, refreshValid: false });
    }
  },

  csrfToken(): string {
    return state.csrfToken;
  },

  /** Simulates the XSRF cookie being replaced, so the client's copy of the token is stale. */
  rotateCsrfToken(): void {
    state.csrfToken = `mock-csrf-token-${Date.now()}`;
  },

  isEmailRegistered(email: string): boolean {
    return (
      state.registeredEmails.has(email.toLowerCase()) || state.accounts.has(email.toLowerCase())
    );
  },

  register(email: string): void {
    state.registeredEmails.add(email.toLowerCase());
  },

  logs(): SystemLog[] {
    return state.logs;
  },

  /** `users` rows that are not soft-deleted. */
  managedUsers(): StoredUser[] {
    return state.managedUsers;
  },

  findManagedUser(id: number): StoredUser | undefined {
    return state.managedUsers.find((user) => user.id === id);
  },

  addManagedUser(user: Omit<StoredUser, 'id'>): StoredUser {
    const created = { ...user, id: state.nextUserId++ };
    state.managedUsers = [created, ...state.managedUsers];
    return created;
  },

  roles(): MockRole[] {
    return state.roles;
  },

  findRole(slug: string): MockRole | undefined {
    return state.roles.find((role) => role.slug === slug);
  },

  replaceManagedUser(user: StoredUser): void {
    state.managedUsers = state.managedUsers.map((row) => (row.id === user.id ? user : row));
  },

  deleteManagedUser(id: number): void {
    state.managedUsers = state.managedUsers.filter((user) => user.id !== id);
  },

  /** Every `property_projects` row, soft-deleted ones included. */
  properties(): StoredProperty[] {
    return state.properties;
  },

  findProperty(id: number): StoredProperty | undefined {
    return state.properties.find((property) => property.id === id);
  },

  saveProperty(property: StoredProperty): void {
    const exists = state.properties.some((row) => row.id === property.id);
    state.properties = exists
      ? state.properties.map((row) => (row.id === property.id ? property : row))
      : [property, ...state.properties];
  },

  nextId(kind: 'property' | 'media' | 'apartment' | 'place'): number {
    if (kind === 'property') return state.nextPropertyId++;
    if (kind === 'media') return state.nextMediaId++;
    if (kind === 'apartment') return state.nextApartmentId++;
    return state.nextPlaceId++;
  },

  /** `leads` rows that are not soft-deleted. */
  leads(): Lead[] {
    return state.leads;
  },

  findLead(id: number): Lead | undefined {
    return state.leads.find((lead) => lead.id === id);
  },

  saveLead(lead: Lead): void {
    const exists = state.leads.some((row) => row.id === lead.id);
    state.leads = exists
      ? state.leads.map((row) => (row.id === lead.id ? lead : row))
      : [lead, ...state.leads];
  },

  deleteLead(id: number): void {
    state.leads = state.leads.filter((lead) => lead.id !== id);
  },

  nextLeadId(): number {
    return state.nextLeadId++;
  },

  /** `site_visits` rows that are not soft-deleted. */
  siteVisits(): SiteVisit[] {
    return state.siteVisits;
  },

  findSiteVisit(id: number): SiteVisit | undefined {
    return state.siteVisits.find((visit) => visit.id === id);
  },

  saveSiteVisit(visit: SiteVisit): void {
    const exists = state.siteVisits.some((row) => row.id === visit.id);
    state.siteVisits = exists
      ? state.siteVisits.map((row) => (row.id === visit.id ? visit : row))
      : [visit, ...state.siteVisits];
  },

  deleteSiteVisit(id: number): void {
    state.siteVisits = state.siteVisits.filter((visit) => visit.id !== id);
  },

  nextSiteVisitId(): number {
    return state.nextSiteVisitId++;
  },

  createdWithKey(key: string): number | undefined {
    return state.createKeys.get(key);
  },

  rememberCreateKey(key: string, id: number): void {
    state.createKeys.set(key, id);
  },
};
