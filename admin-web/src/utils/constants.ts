export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  activity: '/activity',
  users: '/users',
  properties: '/properties',
  propertyNew: '/properties/new',
  leads: '/leads',
  siteVisits: '/site-visits',
  subscriptionPlans: '/packages-plans',
  banners: '/banners',
  bannerNew: '/banners/new',
  blogs: '/blogs',
  blogNew: '/blogs/new',
  faqs: '/faqs',
  faqNew: '/faqs/new',
  pages: '/pages',
  pageNew: '/pages/new',
  roles: '/roles-permissions',
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
  userList: 'USER_LIST',
  userView: 'USER_VIEW',
  userCreate: 'USER_CREATE',
  userUpdate: 'USER_UPDATE',
  userChangeStatus: 'USER_CHANGE_STATUS',
  userDelete: 'USER_DELETE',
  roleView: 'ROLE_VIEW',
  roleCreate: 'ROLE_CREATE',
  roleUpdate: 'ROLE_UPDATE',
  roleDelete: 'ROLE_DELETE',
  propertyCreate: 'PROPERTY_CREATE',
  propertyListAny: 'PROPERTY_LIST_ANY',
  propertyViewAny: 'PROPERTY_VIEW_ANY',
  propertyUpdateAny: 'PROPERTY_UPDATE_ANY',
  propertyDeleteAny: 'PROPERTY_DELETE_ANY',
  propertyRestoreAny: 'PROPERTY_RESTORE_ANY',
  propertyReview: 'PROPERTY_REVIEW',
  propertyPublish: 'PROPERTY_PUBLISH',
  propertySuspend: 'PROPERTY_SUSPEND',
  propertyLegalReview: 'PROPERTY_LEGAL_REVIEW',
  leadCreate: 'LEAD_CREATE',
  leadListAny: 'LEAD_LIST_ANY',
  leadView: 'LEAD_VIEW',
  leadViewAny: 'LEAD_VIEW_ANY',
  leadUpdate: 'LEAD_UPDATE',
  leadUpdateAny: 'LEAD_UPDATE_ANY',
  leadDelete: 'LEAD_DELETE',
  leadDeleteAny: 'LEAD_DELETE_ANY',
  leadAssign: 'LEAD_ASSIGN',
  siteVisitListAny: 'SITE_VISIT_LIST_ANY',
  siteVisitViewAny: 'SITE_VISIT_VIEW_ANY',
  siteVisitCreateAny: 'SITE_VISIT_CREATE_ANY',
  siteVisitUpdateAny: 'SITE_VISIT_UPDATE_ANY',
  siteVisitDeleteAny: 'SITE_VISIT_DELETE_ANY',
  siteVisitAssignAny: 'SITE_VISIT_ASSIGN_ANY',
  siteVisitUpdateStatusAny: 'SITE_VISIT_UPDATE_STATUS_ANY',
  siteVisitSubmitReportAny: 'SITE_VISIT_SUBMIT_REPORT_ANY',
  subscriptionPlanList: 'SUBSCRIPTION_PLAN_LIST',
  subscriptionPlanView: 'SUBSCRIPTION_PLAN_VIEW',
  subscriptionPlanCreate: 'SUBSCRIPTION_PLAN_CREATE',
  subscriptionPlanUpdate: 'SUBSCRIPTION_PLAN_UPDATE',
  subscriptionPlanChangeStatus: 'SUBSCRIPTION_PLAN_CHANGE_STATUS',
  bannerList: 'BANNER_LIST',
  bannerView: 'BANNER_VIEW',
  bannerCreate: 'BANNER_CREATE',
  bannerUpdate: 'BANNER_UPDATE',
  bannerChangeStatus: 'BANNER_CHANGE_STATUS',
  bannerDelete: 'BANNER_DELETE',
  pageView: 'PAGE_VIEW',
  pageCreate: 'PAGE_CREATE',
  pageUpdate: 'PAGE_UPDATE',
  /** Needed in addition to create/update for any status change (publish or unpublish). */
  pagePublish: 'PAGE_PUBLISH',
  pageDelete: 'PAGE_DELETE',
  blogView: 'BLOG_VIEW',
  blogCreate: 'BLOG_CREATE',
  blogUpdate: 'BLOG_UPDATE',
  blogDelete: 'BLOG_DELETE',
  blogCategoryView: 'BLOG_CATEGORY_VIEW',
  blogCategoryCreate: 'BLOG_CATEGORY_CREATE',
  faqView: 'FAQ_VIEW',
  faqCreate: 'FAQ_CREATE',
  faqUpdate: 'FAQ_UPDATE',
  /** Needed in addition to create/update for any status change (publish or unpublish). */
  faqPublish: 'FAQ_PUBLISH',
  faqDelete: 'FAQ_DELETE',
} as const;

/** Property routes with an id. */
export const propertyRoutes = {
  detail: (id: number) => `${ROUTES.properties}/${id}`,
  edit: (id: number, step?: number) =>
    `${ROUTES.properties}/${id}/edit${step ? `?step=${step}` : ''}`,
} as const;

/** Banner routes with an id. `duplicate` opens the create form prefilled from that banner. */
export const bannerRoutes = {
  edit: (id: number) => `${ROUTES.banners}/${id}/edit`,
  duplicate: (id: number) => `${ROUTES.bannerNew}?from=${id}`,
} as const;

/** Blog routes with an id. `duplicate` opens the create form prefilled from that blog. */
export const blogRoutes = {
  detail: (id: number) => `${ROUTES.blogs}/${id}`,
  edit: (id: number) => `${ROUTES.blogs}/${id}/edit`,
  duplicate: (id: number) => `${ROUTES.blogNew}?from=${id}`,
} as const;

/** FAQ routes with an id. */
export const faqRoutes = {
  edit: (id: number) => `${ROUTES.faqs}/${id}/edit`,
} as const;

/** Content page routes with an id. */
export const contentPageRoutes = {
  edit: (id: number) => `${ROUTES.pages}/${id}/edit`,
} as const;

/** Lead routes with an id. */
export const leadRoutes = {
  detail: (id: number) => `${ROUTES.leads}/${id}`,
} as const;

export const STORAGE_KEYS = {
  activityPageSize: 'admin-web:activity-page-size',
  usersPageSize: 'admin-web:users-page-size',
  propertiesPageSize: 'admin-web:properties-page-size',
  leadsPageSize: 'admin-web:leads-page-size',
  siteVisitsPageSize: 'admin-web:site-visits-page-size',
  subscriptionPlansPageSize: 'admin-web:subscription-plans-page-size',
  bannersPageSize: 'admin-web:banners-page-size',
  blogsPageSize: 'admin-web:blogs-page-size',
  faqsPageSize: 'admin-web:faqs-page-size',
  contentPagesPageSize: 'admin-web:content-pages-page-size',
  sidebarCollapsed: 'admin-web:sidebar-collapsed',
} as const;

export const PAGINATION = {
  defaultPageSize: 20,
  pageSizeOptions: [10, 20, 50, 100],
  maxPageSize: 100,
} as const;

export const LAYOUT = {
  sidebarWidth: 260,
  sidebarCollapsedWidth: 76,
  navbarHeight: 64,
} as const;

export const SEARCH_DEBOUNCE_MS = 400;

/** What search engines typically show; guidance only, not enforced by the backend. */
export const SEO_RECOMMENDED = { title: 60, description: 160 } as const;

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
