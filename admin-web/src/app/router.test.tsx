import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { useAuthStore } from '@/store/authStore';
import { apiPath } from '@/tests/handlers/problem';
import { MOCK_PASSWORD, mockUsers } from '@/tests/mocks/mockDb';
import { server } from '@/tests/mocks/server';
import { renderRoutes, signInAs } from '@/tests/utils/testUtils';

import { routes } from './router';

describe('app routes', () => {
  it('signs in and lands on the page the user originally asked for', async () => {
    const { user, router } = renderRoutes(routes, { initialPath: '/profile' });

    await user.type(await screen.findByLabelText(/email or phone/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/^password/i), MOCK_PASSWORD);
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/profile');
    expect(useAuthStore.getState().status).toBe('authenticated');
  });

  it('offers no self-registration link on the login page', async () => {
    renderRoutes(routes, { initialPath: '/login' });

    expect(await screen.findByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /register/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/no account yet/i)).not.toBeInTheDocument();
  });

  it('shows the server error for wrong credentials', async () => {
    const { user } = renderRoutes(routes, { initialPath: '/login' });

    await user.type(await screen.findByLabelText(/email or phone/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Wrong@1234');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The provided credentials are invalid.',
    );
    expect(useAuthStore.getState().status).toBe('anonymous');
  });

  it('shows the dashboard with recent activity for an admin', async () => {
    signInAs(mockUsers.admin);
    renderRoutes(routes, { initialPath: '/dashboard' });

    expect(await screen.findByRole('heading', { name: /welcome back, asha/i })).toBeInTheDocument();
    const table = await screen.findByRole('table', { name: /five most recent/i });
    expect(await within(table).findAllByRole('row')).toHaveLength(6);
    expect(screen.getByRole('link', { name: /system logs/i })).toBeInTheDocument();
  });

  it('hides permission-gated navigation and content for roles without it', async () => {
    signInAs(mockUsers.manager);
    renderRoutes(routes, { initialPath: '/dashboard' });

    expect(await screen.findByRole('heading', { name: /welcome back, mira/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /system logs/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/recent activity/i)).not.toBeInTheDocument();
  });

  it('opens user management from the grouped sidebar and marks the link active', async () => {
    signInAs(mockUsers.admin);
    const { user, router } = renderRoutes(routes, { initialPath: '/dashboard' });

    const nav = await screen.findByRole('navigation', { name: /main navigation/i });
    expect(within(nav).getByText('Management')).toBeInTheDocument();
    await user.click(within(nav).getByRole('link', { name: 'Users' }));

    expect(await screen.findByRole('heading', { name: 'Users' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/users');
    expect(within(nav).getByRole('link', { name: 'Users' })).toHaveClass('active');
  });

  it('blocks direct URL access to user management without USER_LIST', async () => {
    const noUserAccess = { ...mockUsers.manager, permissions: ['ADMIN_PANEL_ACCESS'] };
    signInAs(noUserAccess);
    server.use(http.get(apiPath('/admin/me'), () => HttpResponse.json(noUserAccess)));
    const { router } = renderRoutes(routes, { initialPath: '/users' });

    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/unauthorized');
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
  });

  it('opens property management from the sidebar and keeps the link active on a property', async () => {
    signInAs(mockUsers.admin);
    const { user, router } = renderRoutes(routes, { initialPath: '/dashboard' });

    const nav = await screen.findByRole('navigation', { name: /main navigation/i });
    await user.click(within(nav).getByRole('link', { name: 'Properties' }));
    expect(await screen.findByRole('heading', { name: 'Properties' })).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: 'View Dream Heights Apartments' }));
    expect(await screen.findByRole('heading', { name: 'Property details' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/properties/1');
    expect(within(nav).getByRole('link', { name: 'Properties' })).toHaveClass('active');
  });

  it('guards property routes by permission, not only by hiding the link', async () => {
    signInAs(mockUsers.manager);
    renderRoutes(routes, { initialPath: '/properties' });
    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Properties' })).not.toBeInTheDocument();
  });

  it('lets a view-only user see properties but not open the editor', async () => {
    signInAs(mockUsers.propertyViewer);
    server.use(http.get(apiPath('/admin/me'), () => HttpResponse.json(mockUsers.propertyViewer)));
    const { router } = renderRoutes(routes, { initialPath: '/properties/1/edit' });

    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/unauthorized');
  });

  it('collapses the desktop sidebar to icons and remembers it', async () => {
    signInAs(mockUsers.admin);
    const { user } = renderRoutes(routes, { initialPath: '/dashboard' });

    await user.click(await screen.findByRole('button', { name: 'Collapse sidebar' }));

    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(within(nav).queryByText('Management')).not.toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Users' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
    expect(window.localStorage.getItem('admin-web:sidebar-collapsed')).toBe('true');
  });

  it('sends signed-in users away from the login page', async () => {
    signInAs(mockUsers.manager);
    const { router } = renderRoutes(routes, { initialPath: '/login' });

    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/dashboard');
  });

  it('renders the not found page for unknown paths', async () => {
    renderRoutes(routes, { initialPath: '/no-such-page' });

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});
