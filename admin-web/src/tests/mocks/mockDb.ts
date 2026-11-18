import type { AdminSessionResponse, AdminUser } from '@/features/auth/types/auth.types';
import type { SystemLog, SystemLogLevel } from '@/features/dashboard/types/systemLog.types';

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
  permissions: ['ADMIN_PANEL_ACCESS', 'SYSTEM_LOG_CREATE', 'SYSTEM_LOG_LIST', 'SYSTEM_LOG_VIEW'],
};

const MANAGER_USER: AdminUser = {
  id: 2,
  fullName: 'Mira Manager',
  email: 'manager@example.com',
  phone: null,
  role: { slug: 'manager', name: 'Manager' },
  permissions: ['ADMIN_PANEL_ACCESS'],
};

const APP_USER: AdminUser = {
  id: 3,
  fullName: 'Uma User',
  email: 'user@example.com',
  phone: null,
  role: { slug: 'user', name: 'User' },
  permissions: [],
};

export const mockUsers = { admin: ADMIN_USER, manager: MANAGER_USER, appUser: APP_USER } as const;

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
    ]),
    jar: readJar(),
    csrfToken: 'mock-csrf-token-1',
    registeredEmails: new Set<string>(['taken@example.com']),
    logs: buildLogs(42),
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
};
