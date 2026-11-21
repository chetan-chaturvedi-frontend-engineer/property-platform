import type { EntityId } from '@/types/common.types';

/** Paths relative to the API base URL (`env.apiBaseUrl`, e.g. `/api/v1`). */
export const API_ENDPOINTS = {
  auth: {
    register: '/auth/register',
  },
  admin: {
    login: '/admin/login',
    refresh: '/admin/refresh',
    logout: '/admin/logout',
    me: '/admin/me',
    csrf: '/admin/csrf',
  },
  systemLogs: {
    list: '/admin/system-logs',
    detail: (id: EntityId) => `/admin/system-logs/${id}`,
  },
  users: {
    list: '/admin/users',
    stats: '/admin/users/stats',
    roles: '/admin/users/roles',
    detail: (id: EntityId) => `/admin/users/${id}`,
  },
  leads: {
    list: '/admin/leads',
    stats: '/admin/leads/stats',
    detail: (id: EntityId) => `/admin/leads/${id}`,
    assign: (id: EntityId) => `/admin/leads/${id}/assign`,
  },
  siteVisits: {
    list: '/admin/site-visits',
    stats: '/admin/site-visits/stats',
    detail: (id: EntityId) => `/admin/site-visits/${id}`,
    assign: (id: EntityId) => `/admin/site-visits/${id}/assign`,
    status: (id: EntityId) => `/admin/site-visits/${id}/status`,
    report: (id: EntityId) => `/admin/site-visits/${id}/report`,
  },
  subscriptionPlans: {
    list: '/admin/subscription-plans',
    detail: (id: EntityId) => `/admin/subscription-plans/${id}`,
    status: (id: EntityId) => `/admin/subscription-plans/${id}/status`,
  },
  banners: {
    list: '/admin/banners',
    detail: (id: EntityId) => `/admin/banners/${id}`,
    image: (id: EntityId) => `/admin/banners/${id}/image`,
  },
  blogs: {
    list: '/admin/blogs',
    detail: (id: EntityId) => `/admin/blogs/${id}`,
    featureImage: (id: EntityId) => `/admin/blogs/${id}/feature-image`,
  },
  blogCategories: {
    list: '/admin/blog-categories',
  },
  faqs: {
    list: '/admin/faqs',
    detail: (id: EntityId) => `/admin/faqs/${id}`,
    /** Public, no session needed: the configured categories (backend `app.faq.categories`). */
    categories: '/public/faq-categories',
  },
  pages: {
    list: '/admin/pages',
    detail: (id: EntityId) => `/admin/pages/${id}`,
  },
  properties: {
    list: '/admin/properties',
    stats: '/admin/properties/stats',
    amenities: '/admin/properties/amenities',
    detail: (id: EntityId) => `/admin/properties/${id}`,
    restore: (id: EntityId) => `/admin/properties/${id}/restore`,
    wizard: (id: EntityId) => `/admin/properties/${id}/wizard`,
    step: (id: EntityId, step: 1 | 2 | 4 | 6) => `/admin/properties/${id}/steps/${step}`,
    preview: (id: EntityId) => `/admin/properties/${id}/preview`,
    submit: (id: EntityId) => `/admin/properties/${id}/submit`,
    publish: (id: EntityId) => `/admin/properties/${id}/publish`,
    status: (id: EntityId) => `/admin/properties/${id}/status`,
    legalStatus: (id: EntityId) => `/admin/properties/${id}/legal-status`,
    apartments: (id: EntityId) => `/admin/properties/${id}/apartments`,
    propertyAmenities: (id: EntityId) => `/admin/properties/${id}/amenities`,
    nearbyPlaces: (id: EntityId) => `/admin/properties/${id}/nearby-places`,
    media: (id: EntityId) => `/admin/properties/${id}/media`,
    mediaItem: (id: EntityId, mediaId: EntityId) => `/admin/properties/${id}/media/${mediaId}`,
  },
} as const;
