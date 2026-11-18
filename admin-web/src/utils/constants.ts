export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  activity: '/activity',
  profile: '/profile',
  unauthorized: '/unauthorized',
} as const;

/**
 * Permission codes from the backend (`security/Permissions`). The UI only uses them to hide what
 * the user cannot do; the backend enforces every one of them on each request.
 */
export const PERMISSIONS = {
  adminPanelAccess: 'ADMIN_PANEL_ACCESS',
  systemLogList: 'SYSTEM_LOG_LIST',
  systemLogView: 'SYSTEM_LOG_VIEW',
} as const;

export const STORAGE_KEYS = {
  activityPageSize: 'admin-web:activity-page-size',
} as const;

export const PAGINATION = {
  defaultPageSize: 20,
  pageSizeOptions: [10, 20, 50, 100],
  maxPageSize: 100,
} as const;

export const LAYOUT = {
  sidebarWidth: 260,
  navbarHeight: 64,
} as const;

export const SEARCH_DEBOUNCE_MS = 400;

/** Mirrors the backend password policy (`app.auth.password`). */
export const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 128,
} as const;

/** Mirrors the backend upload limits (`app.media`). */
export const UPLOAD_LIMITS = {
  maxImageBytes: 10 * 1024 * 1024,
  maxPdfBytes: 20 * 1024 * 1024,
  maxVideoBytes: 50 * 1024 * 1024,
} as const;
