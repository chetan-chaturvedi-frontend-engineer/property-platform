import { screen, within } from '@testing-library/react';

import { useAuthStore } from '@/store/authStore';
import { MOCK_PASSWORD, mockUsers } from '@/tests/mocks/mockDb';
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
    expect(screen.getByRole('link', { name: /activity log/i })).toBeInTheDocument();
  });

  it('hides permission-gated navigation and content for roles without it', async () => {
    signInAs(mockUsers.manager);
    renderRoutes(routes, { initialPath: '/dashboard' });

    expect(await screen.findByRole('heading', { name: /welcome back, mira/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /activity log/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/recent activity/i)).not.toBeInTheDocument();
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
