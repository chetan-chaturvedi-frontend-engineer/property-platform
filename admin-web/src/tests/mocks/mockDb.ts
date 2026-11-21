import type { AdminSessionResponse, AdminUser } from '@/features/auth/types/auth.types';
import type { SystemLog, SystemLogLevel } from '@/features/dashboard/types/systemLog.types';
import type { ManagedUser, UserStatus } from '@/features/users/types/user.types';

import type { Lead } from '@/features/leads/types/lead.types';
import type { SiteVisit } from '@/features/siteVisits/types/siteVisit.types';
import type { SubscriptionPlan } from '@/features/subscriptionPlans/types/subscriptionPlan.types';

import { buildBanners, type StoredBanner } from './bannerMockData';
import {
  buildBlogs,
  MOCK_BLOG_CATEGORIES,
  type StoredBlog,
  type StoredBlogCategory,
} from './blogMockData';
import { buildContentPages, type StoredContentPage } from './contentPageMockData';
import { buildFaqs, type StoredFaq } from './faqMockData';
import { buildLeads } from './leadMockData';
import { buildProperties, type StoredProperty } from './propertyMockData';
import { ALL_PERMISSION_CODES } from './roleMockData';
import { buildSiteVisits } from './siteVisitMockData';
import { buildSubscriptionPlans } from './subscriptionPlanMockData';

/** A `users` row as the mock stores it; the role is resolved from `roles` on every response. */
export type StoredUser = Omit<ManagedUser, 'role'>;

/** A `roles` row: slug (= users.user_type), name, status and granted permission codes. */
export interface MockRole {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  active: boolean;
  permissions: readonly string[];
  createdAt: string;
  updatedAt: string;
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
    // The seeded admin role's role module (V202610251300__update_user_admin_role_permissions).
    'ROLE_VIEW',
    'ROLE_CREATE',
    'ROLE_UPDATE',
    'ROLE_DELETE',
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
    // The seeded admin role's subscription plan module.
    'SUBSCRIPTION_PLAN_LIST',
    'SUBSCRIPTION_PLAN_VIEW',
    'SUBSCRIPTION_PLAN_CREATE',
    'SUBSCRIPTION_PLAN_UPDATE',
    'SUBSCRIPTION_PLAN_CHANGE_STATUS',
    // The seeded admin role's banner module (V202610251710__grant_banner_permissions).
    'BANNER_LIST',
    'BANNER_VIEW',
    'BANNER_CREATE',
    'BANNER_UPDATE',
    'BANNER_CHANGE_STATUS',
    'BANNER_DELETE',
    // The seeded admin role's page module (V202610261300__grant_page_permissions).
    'PAGE_VIEW',
    'PAGE_CREATE',
    'PAGE_UPDATE',
    'PAGE_PUBLISH',
    'PAGE_DELETE',
    // The seeded admin role's blog modules (V202610251900, V202610252000).
    'BLOG_VIEW',
    'BLOG_CREATE',
    'BLOG_UPDATE',
    'BLOG_DELETE',
    'BLOG_CATEGORY_VIEW',
    'BLOG_CATEGORY_CREATE',
    'BLOG_CATEGORY_UPDATE',
    'BLOG_CATEGORY_DELETE',
    // The seeded admin role's FAQ module (V202610261100__grant_faq_permissions).
    'FAQ_VIEW',
    'FAQ_CREATE',
    'FAQ_UPDATE',
    'FAQ_PUBLISH',
    'FAQ_DELETE',
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

/** Lists plans but may not open or change them. */
const PLAN_VIEWER_USER: AdminUser = {
  id: 9,
  fullName: 'Pia Plans',
  email: 'plans@example.com',
  phone: null,
  role: { slug: 'plan-viewer', name: 'Plan Viewer' },
  permissions: ['ADMIN_PANEL_ACCESS', 'SUBSCRIPTION_PLAN_LIST'],
};

/** Creates and edits banners, but may neither change their status nor delete them. */
const BANNER_EDITOR_USER: AdminUser = {
  id: 10,
  fullName: 'Bea Banners',
  email: 'banners@example.com',
  phone: null,
  role: { slug: 'banner-editor', name: 'Banner Editor' },
  permissions: [
    'ADMIN_PANEL_ACCESS',
    'BANNER_LIST',
    'BANNER_VIEW',
    'BANNER_CREATE',
    'BANNER_UPDATE',
  ],
};

/** Writes blogs but cannot list categories or delete. */
const BLOG_WRITER_USER: AdminUser = {
  id: 11,
  fullName: 'Wren Writer',
  email: 'blogs@example.com',
  phone: null,
  role: { slug: 'blog-writer', name: 'Blog Writer' },
  permissions: ['ADMIN_PANEL_ACCESS', 'BLOG_VIEW', 'BLOG_CREATE', 'BLOG_UPDATE'],
};

/** Reads blogs only. */
const BLOG_VIEWER_USER: AdminUser = {
  id: 12,
  fullName: 'Bo Reader',
  email: 'blog-viewer@example.com',
  phone: null,
  role: { slug: 'blog-viewer', name: 'Blog Viewer' },
  permissions: ['ADMIN_PANEL_ACCESS', 'BLOG_VIEW'],
};

/** Writes FAQ drafts and edits them, but may neither publish, unpublish nor delete. */
const FAQ_EDITOR_USER: AdminUser = {
  id: 13,
  fullName: 'Fay Faqs',
  email: 'faqs@example.com',
  phone: null,
  role: { slug: 'faq-editor', name: 'FAQ Editor' },
  permissions: ['ADMIN_PANEL_ACCESS', 'FAQ_VIEW', 'FAQ_CREATE', 'FAQ_UPDATE'],
};

/** Writes page drafts and edits them, but may neither publish, unpublish nor delete. */
const PAGE_EDITOR_USER: AdminUser = {
  id: 14,
  fullName: 'Pat Pages',
  email: 'pages@example.com',
  phone: null,
  role: { slug: 'page-editor', name: 'Page Editor' },
  permissions: ['ADMIN_PANEL_ACCESS', 'PAGE_VIEW', 'PAGE_CREATE', 'PAGE_UPDATE'],
};

/** Reads roles only. */
const ROLE_VIEWER_USER: AdminUser = {
  id: 15,
  fullName: 'Rae Roles',
  email: 'roles@example.com',
  phone: null,
  role: { slug: 'role-viewer', name: 'Role Viewer' },
  permissions: ['ADMIN_PANEL_ACCESS', 'ROLE_VIEW'],
};

/** Lists system logs but cannot open their details (no `SYSTEM_LOG_VIEW`) or list users. */
const LOG_VIEWER_USER: AdminUser = {
  id: 16,
  fullName: 'Lou Logs',
  email: 'logs@example.com',
  phone: null,
  role: { slug: 'log-viewer', name: 'Log Viewer' },
  permissions: ['ADMIN_PANEL_ACCESS', 'SYSTEM_LOG_LIST'],
};

export const mockUsers = {
  admin: ADMIN_USER,
  manager: MANAGER_USER,
  appUser: APP_USER,
  editor: EDITOR_USER,
  propertyViewer: PROPERTY_VIEWER_USER,
  leadViewer: LEAD_VIEWER_USER,
  siteVisitViewer: SITE_VISIT_VIEWER_USER,
  planViewer: PLAN_VIEWER_USER,
  bannerEditor: BANNER_EDITOR_USER,
  blogWriter: BLOG_WRITER_USER,
  blogViewer: BLOG_VIEWER_USER,
  faqEditor: FAQ_EDITOR_USER,
  pageEditor: PAGE_EDITOR_USER,
  roleViewer: ROLE_VIEWER_USER,
  logViewer: LOG_VIEWER_USER,
} as const;

/** Mirrors the seeded roles plus custom ones. Permissions match the sign-in accounts above. */
function buildRoles(): MockRole[] {
  const role = (
    id: number,
    slug: string,
    name: string,
    permissions: readonly string[],
    { active = true, description = null as string | null } = {},
  ): MockRole => ({
    id,
    slug,
    name,
    description,
    active,
    permissions,
    createdAt: `2026-10-${String(10 + id).padStart(2, '0')}T09:00:00Z`,
    updatedAt: `2026-11-${String(10 + id).padStart(2, '0')}T11:45:00Z`,
  });
  return [
    role(1, 'super-admin', 'Super Admin', ALL_PERMISSION_CODES, {
      description: 'Full access to every feature; managed by migrations only.',
    }),
    role(2, 'admin', 'Administrator', ADMIN_USER.permissions, {
      description: 'Manages the admin dashboard, content, users and listings.',
    }),
    role(3, 'manager', 'Manager', MANAGER_USER.permissions, { description: 'Browses users.' }),
    role(4, 'editor', 'User Editor', EDITOR_USER.permissions, {
      description: 'Creates and edits users.',
    }),
    role(5, 'role-viewer', 'Role Viewer', ROLE_VIEWER_USER.permissions),
    // App roles: owner-scoped app permissions only, no admin panel access.
    role(6, 'user', 'User', ['PROPERTY_CREATE', 'LEAD_LIST'], {
      description: 'App users: access to their own properties, leads and site visits.',
    }),
    role(7, 'sales-executive', 'Sales Executive', ['LEAD_LIST'], {
      description: 'Handles enquiries in the app.',
    }),
    role(8, 'legacy-partner', 'Legacy Partner', [], { active: false }),
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

const MOCK_IPS = ['203.0.113.5', '198.51.100.24', '192.0.2.77'] as const;
const MOCK_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

function buildLogs(count: number): SystemLog[] {
  const start = Date.parse('2026-11-18T10:00:00Z');
  return Array.from({ length: count }, (_, index) => {
    const module = MODULES[index % MODULES.length] ?? 'faqs';
    const level = LEVELS[index % LEVELS.length] ?? 'info';
    // Every tenth row is a scheduled job: no user and no request details.
    const isJob = index % 10 === 9;
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
      ipAddress: isJob ? null : (MOCK_IPS[index % MOCK_IPS.length] ?? null),
      userAgent: isJob ? null : MOCK_USER_AGENT,
      requestMethod: isJob ? null : level === 'info' ? 'GET' : 'POST',
      requestUrl: isJob ? null : `/api/v1/admin/${module}`,
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
      [PLAN_VIEWER_USER.email ?? '', { user: PLAN_VIEWER_USER, password: MOCK_PASSWORD }],
      [BANNER_EDITOR_USER.email ?? '', { user: BANNER_EDITOR_USER, password: MOCK_PASSWORD }],
      [BLOG_WRITER_USER.email ?? '', { user: BLOG_WRITER_USER, password: MOCK_PASSWORD }],
      [BLOG_VIEWER_USER.email ?? '', { user: BLOG_VIEWER_USER, password: MOCK_PASSWORD }],
      [FAQ_EDITOR_USER.email ?? '', { user: FAQ_EDITOR_USER, password: MOCK_PASSWORD }],
      [PAGE_EDITOR_USER.email ?? '', { user: PAGE_EDITOR_USER, password: MOCK_PASSWORD }],
      [ROLE_VIEWER_USER.email ?? '', { user: ROLE_VIEWER_USER, password: MOCK_PASSWORD }],
      [LOG_VIEWER_USER.email ?? '', { user: LOG_VIEWER_USER, password: MOCK_PASSWORD }],
    ]),
    jar: readJar(),
    csrfToken: 'mock-csrf-token-1',
    registeredEmails: new Set<string>(['taken@example.com']),
    logs: buildLogs(42),
    managedUsers: buildManagedUsers(33),
    roles: buildRoles(),
    /** Slugs of soft-deleted roles: never reused. */
    deletedRoleSlugs: new Set<string>(),
    nextRoleId: 100,
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
    subscriptionPlans: buildSubscriptionPlans(),
    nextPlanId: 100,
    ...bannerState(),
    nextBannerId: 100,
    ...blogState(),
    nextBlogId: 100,
    nextBlogCategoryId: 100,
    faqs: buildFaqs(),
    nextFaqId: 100,
    contentPages: buildContentPages(),
    nextContentPageId: 100,
    nextLogId: 10_000,
    /** Idempotency-Key -> created property id, per owner. */
    createKeys: new Map<string, number>(),
  };
}

function blogState() {
  const { blogs, images } = buildBlogs();
  return {
    blogs,
    deletedBlogIds: new Set<number>(),
    blogImages: images,
    blogCategories: [...MOCK_BLOG_CATEGORIES],
  };
}

function bannerState() {
  const { banners, images } = buildBanners();
  return { banners, deletedBannerIds: new Set<number>(), bannerImages: images };
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

  findRoleById(id: number): MockRole | undefined {
    return state.roles.find((role) => role.id === id);
  },

  saveRole(role: MockRole): void {
    const exists = state.roles.some((row) => row.id === role.id);
    state.roles = exists
      ? state.roles.map((row) => (row.id === role.id ? role : row))
      : [...state.roles, role];
  },

  /** Soft delete: the slug stays reserved. */
  deleteRole(id: number): void {
    const role = this.findRoleById(id);
    if (!role) return;
    state.deletedRoleSlugs.add(role.slug);
    state.roles = state.roles.filter((row) => row.id !== id);
  },

  isRoleSlugTaken(slug: string): boolean {
    return state.deletedRoleSlugs.has(slug) || state.roles.some((role) => role.slug === slug);
  },

  nextRoleId(): number {
    return state.nextRoleId++;
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

  subscriptionPlans(): SubscriptionPlan[] {
    return state.subscriptionPlans;
  },

  findSubscriptionPlan(id: number): SubscriptionPlan | undefined {
    return state.subscriptionPlans.find((plan) => plan.id === id);
  },

  saveSubscriptionPlan(plan: SubscriptionPlan): void {
    const exists = state.subscriptionPlans.some((row) => row.id === plan.id);
    state.subscriptionPlans = exists
      ? state.subscriptionPlans.map((row) => (row.id === plan.id ? plan : row))
      : [...state.subscriptionPlans, plan];
  },

  nextSubscriptionPlanId(): number {
    return state.nextPlanId++;
  },

  /** Banners that are not soft-deleted. */
  banners(): StoredBanner[] {
    return state.banners.filter((banner) => !state.deletedBannerIds.has(banner.id));
  },

  findBanner(id: number): StoredBanner | undefined {
    return this.banners().find((banner) => banner.id === id);
  },

  saveBanner(banner: StoredBanner): void {
    const exists = state.banners.some((row) => row.id === banner.id);
    state.banners = exists
      ? state.banners.map((row) => (row.id === banner.id ? banner : row))
      : [...state.banners, banner];
  },

  /** Soft delete: the row and its image stay, the banner is hidden everywhere. */
  softDeleteBanner(id: number): void {
    state.deletedBannerIds.add(id);
  },

  nextBannerId(): number {
    return state.nextBannerId++;
  },

  bannerImage(fileName: string): Uint8Array | undefined {
    return state.bannerImages.get(fileName);
  },

  storeBannerImage(fileName: string, bytes: Uint8Array): void {
    state.bannerImages.set(fileName, bytes);
  },

  /** Every blog row, soft-deleted ones included (their slugs stay reserved). */
  allBlogs(): StoredBlog[] {
    return state.blogs;
  },

  /** Blogs that are not soft-deleted. */
  blogs(): StoredBlog[] {
    return state.blogs.filter((blog) => !state.deletedBlogIds.has(blog.id));
  },

  findBlog(id: number): StoredBlog | undefined {
    return this.blogs().find((blog) => blog.id === id);
  },

  saveBlog(blog: StoredBlog): void {
    const exists = state.blogs.some((row) => row.id === blog.id);
    state.blogs = exists
      ? state.blogs.map((row) => (row.id === blog.id ? blog : row))
      : [...state.blogs, blog];
  },

  softDeleteBlog(id: number): void {
    state.deletedBlogIds.add(id);
  },

  nextBlogId(): number {
    return state.nextBlogId++;
  },

  blogImage(fileName: string): Uint8Array | undefined {
    return state.blogImages.get(fileName);
  },

  storeBlogImage(fileName: string, bytes: Uint8Array): void {
    state.blogImages.set(fileName, bytes);
  },

  blogCategories(): StoredBlogCategory[] {
    return state.blogCategories;
  },

  addBlogCategory(category: Omit<StoredBlogCategory, 'id'>): StoredBlogCategory {
    const created = { ...category, id: state.nextBlogCategoryId++ };
    state.blogCategories = [...state.blogCategories, created];
    return created;
  },

  faqs(): StoredFaq[] {
    return state.faqs;
  },

  findFaq(id: number): StoredFaq | undefined {
    return state.faqs.find((faq) => faq.id === id);
  },

  saveFaq(faq: StoredFaq): void {
    const exists = state.faqs.some((row) => row.id === faq.id);
    state.faqs = exists
      ? state.faqs.map((row) => (row.id === faq.id ? faq : row))
      : [...state.faqs, faq];
  },

  /** Permanent: FAQs have no soft delete. */
  deleteFaq(id: number): void {
    state.faqs = state.faqs.filter((faq) => faq.id !== id);
  },

  nextFaqId(): number {
    return state.nextFaqId++;
  },

  contentPages(): StoredContentPage[] {
    return state.contentPages;
  },

  findContentPage(id: number): StoredContentPage | undefined {
    return state.contentPages.find((page) => page.id === id);
  },

  saveContentPage(page: StoredContentPage): void {
    const exists = state.contentPages.some((row) => row.id === page.id);
    state.contentPages = exists
      ? state.contentPages.map((row) => (row.id === page.id ? page : row))
      : [...state.contentPages, page];
  },

  /** Permanent: pages have no soft delete. */
  deleteContentPage(id: number): void {
    state.contentPages = state.contentPages.filter((page) => page.id !== id);
  },

  nextContentPageId(): number {
    return state.nextContentPageId++;
  },

  /** Appends an audit entry, as the backend's SystemLogInterceptor does for every admin write. */
  recordLog(entry: Pick<SystemLog, 'module' | 'action' | 'referenceId' | 'referenceType'>): void {
    const user = this.sessionUser();
    state.logs = [
      {
        id: state.nextLogId++,
        user: user
          ? {
              ...user,
              status: 'active',
              userType: user.role.slug,
              deleted: false,
              createdAt: '2026-10-01T08:00:00Z',
            }
          : null,
        logLevel: 'success',
        ipAddress: '203.0.113.5',
        userAgent: 'Mozilla/5.0',
        requestMethod: 'POST',
        requestUrl: `/api/v1/admin/${entry.module}`,
        additionalData: null,
        createdAt: new Date().toISOString(),
        ...entry,
      },
      ...state.logs,
    ];
  },

  createdWithKey(key: string): number | undefined {
    return state.createKeys.get(key);
  },

  rememberCreateKey(key: string, id: number): void {
    state.createKeys.set(key, id);
  },
};
