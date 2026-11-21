import { lazy } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';

import { RouteErrorPage } from '@/components/common/ErrorBoundary/RouteErrorPage';
import { GuestRoute } from '@/features/auth/components/GuestRoute';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { PERMISSIONS, ROUTES } from '@/utils/constants';

import { AuthLayout } from './layouts/AuthLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { MainLayout } from './layouts/MainLayout';

// Each page is its own chunk, downloaded on first visit.
const LoginPage = lazy(() =>
  import('@/features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('@/features/auth/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const ActivityLogPage = lazy(() =>
  import('@/features/dashboard/pages/ActivityLogPage').then((m) => ({
    default: m.ActivityLogPage,
  })),
);
const UsersPage = lazy(() =>
  import('@/features/users/pages/UsersPage').then((m) => ({ default: m.UsersPage })),
);
const PropertiesPage = lazy(() =>
  import('@/features/properties/pages/PropertiesPage').then((m) => ({ default: m.PropertiesPage })),
);
const PropertyDetailsPage = lazy(() =>
  import('@/features/properties/pages/PropertyDetailsPage').then((m) => ({
    default: m.PropertyDetailsPage,
  })),
);
const PropertyWizardPage = lazy(() =>
  import('@/features/properties/pages/PropertyWizardPage').then((m) => ({
    default: m.PropertyWizardPage,
  })),
);
const LeadsPage = lazy(() =>
  import('@/features/leads/pages/LeadsPage').then((m) => ({ default: m.LeadsPage })),
);
const LeadDetailsPage = lazy(() =>
  import('@/features/leads/pages/LeadDetailsPage').then((m) => ({ default: m.LeadDetailsPage })),
);
const SiteVisitsPage = lazy(() =>
  import('@/features/siteVisits/pages/SiteVisitsPage').then((m) => ({
    default: m.SiteVisitsPage,
  })),
);
const SubscriptionPlansPage = lazy(() =>
  import('@/features/subscriptionPlans/pages/SubscriptionPlansPage').then((m) => ({
    default: m.SubscriptionPlansPage,
  })),
);
const BannersPage = lazy(() =>
  import('@/features/banners/pages/BannersPage').then((m) => ({ default: m.BannersPage })),
);
const BannerFormPage = lazy(() =>
  import('@/features/banners/pages/BannerFormPage').then((m) => ({ default: m.BannerFormPage })),
);
const BlogsPage = lazy(() =>
  import('@/features/blogs/pages/BlogsPage').then((m) => ({ default: m.BlogsPage })),
);
const BlogFormPage = lazy(() =>
  import('@/features/blogs/pages/BlogFormPage').then((m) => ({ default: m.BlogFormPage })),
);
const BlogDetailsPage = lazy(() =>
  import('@/features/blogs/pages/BlogDetailsPage').then((m) => ({ default: m.BlogDetailsPage })),
);
const FaqsPage = lazy(() =>
  import('@/features/faqs/pages/FaqsPage').then((m) => ({ default: m.FaqsPage })),
);
const FaqFormPage = lazy(() =>
  import('@/features/faqs/pages/FaqFormPage').then((m) => ({ default: m.FaqFormPage })),
);
const ContentPagesPage = lazy(() =>
  import('@/features/contentPages/pages/ContentPagesPage').then((m) => ({
    default: m.ContentPagesPage,
  })),
);
const ContentPageFormPage = lazy(() =>
  import('@/features/contentPages/pages/ContentPageFormPage').then((m) => ({
    default: m.ContentPageFormPage,
  })),
);
const ProfilePage = lazy(() =>
  import('@/features/profile/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const NotFoundPage = lazy(() =>
  import('./pages/StatusPage').then((m) => ({ default: m.NotFoundPage })),
);
const UnauthorizedPage = lazy(() =>
  import('./pages/StatusPage').then((m) => ({ default: m.UnauthorizedPage })),
);

/**
 * Route guards decide what to render; they do not secure data. The backend checks the session and
 * the specific permission on every API call.
 */
export const routes: RouteObject[] = [
  {
    element: <MainLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Navigate to={ROUTES.dashboard} replace /> },

      // Authentication routes: only for signed-out users.
      {
        element: <GuestRoute />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              { path: ROUTES.login, element: <LoginPage /> },
              { path: ROUTES.register, element: <RegisterPage /> },
            ],
          },
        ],
      },

      // Private routes: any signed-in admin-panel user.
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              { path: ROUTES.dashboard, element: <DashboardPage /> },
              { path: ROUTES.profile, element: <ProfilePage /> },
              // Role-based: only roles that grant the permission.
              {
                element: <ProtectedRoute requiredPermissions={[PERMISSIONS.systemLogList]} />,
                children: [{ path: ROUTES.activity, element: <ActivityLogPage /> }],
              },
              {
                element: <ProtectedRoute requiredPermissions={[PERMISSIONS.userList]} />,
                children: [{ path: ROUTES.users, element: <UsersPage /> }],
              },
              {
                // The list is the admin view of every lead; a lead's own permissions (view own or
                // any) are checked by the backend on the details route.
                element: <ProtectedRoute requiredPermissions={[PERMISSIONS.leadListAny]} />,
                children: [
                  { path: ROUTES.leads, element: <LeadsPage /> },
                  { path: `${ROUTES.leads}/:id`, element: <LeadDetailsPage /> },
                ],
              },
              {
                element: <ProtectedRoute requiredPermissions={[PERMISSIONS.siteVisitListAny]} />,
                children: [{ path: ROUTES.siteVisits, element: <SiteVisitsPage /> }],
              },
              {
                element: (
                  <ProtectedRoute requiredPermissions={[PERMISSIONS.subscriptionPlanList]} />
                ),
                children: [{ path: ROUTES.subscriptionPlans, element: <SubscriptionPlansPage /> }],
              },
              {
                element: <ProtectedRoute requiredPermissions={[PERMISSIONS.bannerList]} />,
                children: [
                  { path: ROUTES.banners, element: <BannersPage /> },
                  {
                    element: <ProtectedRoute requiredPermissions={[PERMISSIONS.bannerCreate]} />,
                    children: [{ path: ROUTES.bannerNew, element: <BannerFormPage /> }],
                  },
                  {
                    // The form loads the banner first, which needs the view permission.
                    element: (
                      <ProtectedRoute
                        requiredPermissions={[PERMISSIONS.bannerUpdate, PERMISSIONS.bannerView]}
                      />
                    ),
                    children: [{ path: `${ROUTES.banners}/:id/edit`, element: <BannerFormPage /> }],
                  },
                ],
              },
              {
                // Every blog screen reads blogs; the list, detail and editor need BLOG_VIEW.
                element: <ProtectedRoute requiredPermissions={[PERMISSIONS.blogView]} />,
                children: [
                  { path: ROUTES.blogs, element: <BlogsPage /> },
                  {
                    element: <ProtectedRoute requiredPermissions={[PERMISSIONS.blogCreate]} />,
                    children: [{ path: ROUTES.blogNew, element: <BlogFormPage /> }],
                  },
                  { path: `${ROUTES.blogs}/:id`, element: <BlogDetailsPage /> },
                  {
                    element: <ProtectedRoute requiredPermissions={[PERMISSIONS.blogUpdate]} />,
                    children: [{ path: `${ROUTES.blogs}/:id/edit`, element: <BlogFormPage /> }],
                  },
                ],
              },
              {
                // Every FAQ screen reads FAQs (the list, the editor and its suggested order).
                element: <ProtectedRoute requiredPermissions={[PERMISSIONS.faqView]} />,
                children: [
                  { path: ROUTES.faqs, element: <FaqsPage /> },
                  {
                    element: <ProtectedRoute requiredPermissions={[PERMISSIONS.faqCreate]} />,
                    children: [{ path: ROUTES.faqNew, element: <FaqFormPage /> }],
                  },
                  {
                    element: <ProtectedRoute requiredPermissions={[PERMISSIONS.faqUpdate]} />,
                    children: [{ path: `${ROUTES.faqs}/:id/edit`, element: <FaqFormPage /> }],
                  },
                ],
              },
              {
                // Every page screen reads pages (the list and the editor, which loads the page).
                element: <ProtectedRoute requiredPermissions={[PERMISSIONS.pageView]} />,
                children: [
                  { path: ROUTES.pages, element: <ContentPagesPage /> },
                  {
                    element: <ProtectedRoute requiredPermissions={[PERMISSIONS.pageCreate]} />,
                    children: [{ path: ROUTES.pageNew, element: <ContentPageFormPage /> }],
                  },
                  {
                    element: <ProtectedRoute requiredPermissions={[PERMISSIONS.pageUpdate]} />,
                    children: [
                      { path: `${ROUTES.pages}/:id/edit`, element: <ContentPageFormPage /> },
                    ],
                  },
                ],
              },
              {
                element: <ProtectedRoute requiredPermissions={[PERMISSIONS.propertyListAny]} />,
                children: [{ path: ROUTES.properties, element: <PropertiesPage /> }],
              },
              {
                element: (
                  <ProtectedRoute
                    requiredPermissions={[PERMISSIONS.propertyCreate, PERMISSIONS.propertyViewAny]}
                  />
                ),
                children: [{ path: ROUTES.propertyNew, element: <PropertyWizardPage /> }],
              },
              {
                element: <ProtectedRoute requiredPermissions={[PERMISSIONS.propertyViewAny]} />,
                children: [
                  { path: `${ROUTES.properties}/:id`, element: <PropertyDetailsPage /> },
                  {
                    element: (
                      <ProtectedRoute requiredPermissions={[PERMISSIONS.propertyUpdateAny]} />
                    ),
                    children: [
                      { path: `${ROUTES.properties}/:id/edit`, element: <PropertyWizardPage /> },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },

      // Public routes.
      { path: ROUTES.unauthorized, element: <UnauthorizedPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
