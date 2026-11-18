import { http, HttpResponse } from 'msw';

import type { LoginRequest, RegisterRequest } from '@/features/auth/types/auth.types';

import { MOCK_CSRF_HEADER, mockDb } from '../mocks/mockDb';

import { apiPath, csrfRejection, problem } from './problem';

const unauthorized = () => problem(401, 'unauthorized', 'Authentication required.');

export const authHandlers = [
  http.get(apiPath('/admin/csrf'), () =>
    HttpResponse.json({ headerName: MOCK_CSRF_HEADER, token: mockDb.csrfToken() }),
  ),

  http.post(apiPath('/admin/login'), async ({ request }) => {
    const rejected = csrfRejection(request, mockDb.csrfToken());
    if (rejected) {
      return rejected;
    }
    const body = (await request.json()) as Partial<LoginRequest>;
    if (!body.identifier || !body.password) {
      return problem(400, 'validation_failed', 'Validation failed', {
        errors: {
          ...(!body.identifier ? { identifier: 'must not be blank' } : {}),
          ...(!body.password ? { password: 'must not be blank' } : {}),
        },
      });
    }
    const account = mockDb.findAccount(body.identifier);
    if (!account || account.password !== body.password) {
      return problem(401, 'invalid_credentials', 'The provided credentials are invalid.');
    }
    if (!account.user.permissions.includes('ADMIN_PANEL_ACCESS')) {
      return problem(
        403,
        'admin_access_denied',
        'You do not have permission to access the admin panel.',
      );
    }
    return HttpResponse.json(mockDb.startSession(account.user));
  }),

  http.post(apiPath('/admin/refresh'), ({ request }) => {
    const rejected = csrfRejection(request, mockDb.csrfToken());
    if (rejected) {
      return rejected;
    }
    const session = mockDb.refreshSession();
    return session
      ? HttpResponse.json(session)
      : problem(401, 'invalid_token', 'The refresh token is invalid or has expired.');
  }),

  http.get(apiPath('/admin/me'), () => {
    const user = mockDb.sessionUser();
    return user ? HttpResponse.json(user) : unauthorized();
  }),

  http.post(apiPath('/admin/logout'), ({ request }) => {
    const rejected = csrfRejection(request, mockDb.csrfToken());
    if (rejected) {
      return rejected;
    }
    if (!mockDb.sessionUser()) {
      return unauthorized();
    }
    mockDb.endSession();
    return HttpResponse.json({ message: 'Logged out.' });
  }),

  http.post(apiPath('/auth/register'), async ({ request }) => {
    const body = (await request.json()) as RegisterRequest;
    if (mockDb.isEmailRegistered(body.email)) {
      return problem(409, 'account_exists', 'An account with this email or phone already exists.');
    }
    if (body.phone.replace(/\D/g, '').length < 10) {
      return problem(400, 'validation_failed', 'Validation failed', {
        errors: { phone: 'must be a valid phone number' },
      });
    }
    mockDb.register(body.email);
    return HttpResponse.json(
      {
        message: 'Verification required. Enter the code sent to your email or phone.',
        status: 'pending',
        emailVerified: false,
        phoneVerified: false,
      },
      { status: 201 },
    );
  }),
];
