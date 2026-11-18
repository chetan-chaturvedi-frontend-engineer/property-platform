import { screen } from '@testing-library/react';
import { useLocation } from 'react-router-dom';

import { mockUsers } from '@/tests/mocks/mockDb';
import { renderRoutes, signInAs } from '@/tests/utils/testUtils';

import { ProtectedRoute } from './ProtectedRoute';

function LoginProbe() {
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
  return <p>Login page (from {from ?? 'nowhere'})</p>;
}

const routes = [
  { path: '/login', element: <LoginProbe /> },
  { path: '/unauthorized', element: <p>Unauthorized page</p> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/dashboard', element: <p>Dashboard content</p> },
      {
        element: <ProtectedRoute requiredPermissions={['SYSTEM_LOG_LIST']} />,
        children: [{ path: '/activity', element: <p>Activity content</p> }],
      },
    ],
  },
];

describe('ProtectedRoute', () => {
  it('redirects anonymous users to login and remembers where they were going', async () => {
    renderRoutes(routes, { initialPath: '/dashboard' });

    expect(await screen.findByText('Login page (from /dashboard)')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument();
  });

  it('renders the page for an authenticated user', async () => {
    signInAs(mockUsers.manager);
    renderRoutes(routes, { initialPath: '/dashboard' });

    expect(await screen.findByText('Dashboard content')).toBeInTheDocument();
  });

  it('sends users whose role lacks the permission to the unauthorized page', async () => {
    signInAs(mockUsers.manager);
    renderRoutes(routes, { initialPath: '/activity' });

    expect(await screen.findByText('Unauthorized page')).toBeInTheDocument();
    expect(screen.queryByText('Activity content')).not.toBeInTheDocument();
  });

  it('allows users whose role grants the permission', async () => {
    signInAs(mockUsers.admin);
    renderRoutes(routes, { initialPath: '/activity' });

    expect(await screen.findByText('Activity content')).toBeInTheDocument();
  });
});
