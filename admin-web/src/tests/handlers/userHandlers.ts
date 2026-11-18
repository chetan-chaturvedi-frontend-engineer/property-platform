import { http, HttpResponse } from 'msw';

import type { AdminUser } from '@/features/auth/types/auth.types';
import {
  type CreateUserRequest,
  isCreateStatus,
  type ManagedUser,
  type UpdateUserRequest,
  USER_STATUSES,
  type UserRoleOption,
  type UserStats,
  type UserStatus,
} from '@/features/users/types/user.types';
import type { PageResponse } from '@/types/api.types';

import { type MockRole, mockDb, type StoredUser } from '../mocks/mockDb';

import { apiPath, csrfRejection, problem } from './problem';

/** Mirrors `backend/docs/api/admin-users.md` and `AdminUserService`. */

const SORT_FIELDS = [
  'id',
  'createdAt',
  'updatedAt',
  'fullName',
  'email',
  'userType',
  'status',
] as const;
type SortField = (typeof SORT_FIELDS)[number];
const STRONG_PASSWORD = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function authorize(
  request: Request,
  permissions: readonly string[],
  { write = false } = {},
): { error: Response } | { user: AdminUser } {
  if (write) {
    const rejected = csrfRejection(request, mockDb.csrfToken());
    if (rejected) {
      return { error: rejected };
    }
  }
  const user = mockDb.sessionUser();
  if (!user) {
    return { error: problem(401, 'unauthorized', 'Authentication required.') };
  }
  if (!permissions.some((permission) => user.permissions.includes(permission))) {
    return { error: problem(403, 'access_denied', 'Access denied.') };
  }
  return { user };
}

const notFound = () => problem(404, 'user_not_found', 'User not found.');
const roleForbidden = () =>
  problem(
    403,
    'user_role_forbidden',
    'You can only manage users and assign roles whose permissions you hold yourself.',
  );
const statusForbidden = () =>
  problem(
    403,
    'user_status_forbidden',
    'You are not allowed to change the status of user accounts.',
  );

function toManaged(user: StoredUser): ManagedUser {
  const role = mockDb.findRole(user.userType);
  return { ...user, role: role ? { slug: role.slug, name: role.name, active: role.active } : null };
}

const isPrivileged = (role: MockRole) => role.permissions.includes('ADMIN_PANEL_ACCESS');
const holdsAll = (actor: AdminUser, role: MockRole) =>
  role.permissions.every((permission) => actor.permissions.includes(permission));

function isAssignable(role: MockRole, actor: AdminUser): boolean {
  return (
    role.active && role.slug !== 'super-admin' && (!isPrivileged(role) || holdsAll(actor, role))
  );
}

/** null when the actor may assign the role, otherwise the error response. */
function checkAssignable(slug: string, actor: AdminUser): Response | null {
  const role = mockDb.findRole(slug);
  if (!role?.active) {
    return problem(400, 'validation_failed', 'Validation failed', {
      errors: { userType: 'must be an active role' },
    });
  }
  return isAssignable(role, actor) ? null : roleForbidden();
}

/** null when the actor may change or delete the user, otherwise the error response. */
function checkManageable(user: StoredUser, actor: AdminUser): Response | null {
  const role = mockDb.findRole(user.userType);
  if (!role) return null;
  if (role.slug === 'super-admin') {
    return problem(
      409,
      'user_protected',
      'This account is protected and cannot be changed or deleted here.',
    );
  }
  return isPrivileged(role) && !holdsAll(actor, role) ? roleForbidden() : null;
}

function isSortField(value: string): value is SortField {
  return (SORT_FIELDS as readonly string[]).includes(value);
}

function compare(a: StoredUser, b: StoredUser, field: SortField): number {
  if (field === 'id') return a.id - b.id;
  return (a[field] ?? '').localeCompare(b[field] ?? '');
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return phone.trim().startsWith('+') ? `+${digits}` : `+91${digits}`;
}

/** Field formats shared by create and update; `undefined` fields are skipped. */
function validate(body: UpdateUserRequest & { password?: string }) {
  const errors: Record<string, string> = {};
  if (body.fullName !== undefined) {
    const name = body.fullName.trim();
    if (name.length < 2 || name.length > 150) errors.fullName = 'size must be between 2 and 150';
  }
  if (body.email !== undefined && !EMAIL.test(body.email)) {
    errors.email = 'must be a well-formed email address';
  }
  if (body.phone && body.phone.replace(/\D/g, '').length < 10) {
    errors.phone = 'must be a valid phone number';
  }
  if (body.status !== undefined && !(USER_STATUSES as readonly string[]).includes(body.status)) {
    errors.status = 'must be a user status';
  }
  if (body.password !== undefined && !STRONG_PASSWORD.test(body.password)) {
    errors.password = 'does not meet the password policy';
  }
  return Object.keys(errors).length > 0
    ? problem(400, 'validation_failed', 'Validation failed', { errors })
    : null;
}

function conflict(field: 'email' | 'phone') {
  return problem(409, 'user_already_exists', 'A user with this email or phone already exists.', {
    errors: { [field]: 'is already in use' },
  });
}

function uniqueness(
  email: string | undefined,
  phone: string | null | undefined,
  excludeId?: number,
) {
  const others = mockDb.managedUsers().filter((user) => user.id !== excludeId);
  if (email && others.some((user) => user.email === email.trim().toLowerCase())) {
    return conflict('email');
  }
  if (phone && others.some((user) => user.phone === normalizePhone(phone))) {
    return conflict('phone');
  }
  return null;
}

export const userHandlers = [
  http.get(apiPath('/admin/users/stats'), ({ request }) => {
    const auth = authorize(request, ['USER_LIST']);
    if ('error' in auth) return auth.error;
    const byStatus = Object.fromEntries(USER_STATUSES.map((status) => [status, 0])) as Record<
      UserStatus,
      number
    >;
    for (const user of mockDb.managedUsers()) {
      byStatus[user.status] += 1;
    }
    const body: UserStats = { total: mockDb.managedUsers().length, byStatus };
    return HttpResponse.json(body);
  }),

  http.get(apiPath('/admin/users/roles'), ({ request }) => {
    const auth = authorize(request, ['USER_LIST', 'USER_CREATE', 'USER_UPDATE']);
    if ('error' in auth) return auth.error;
    const body: UserRoleOption[] = [...mockDb.roles()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((role) => ({
        slug: role.slug,
        name: role.name,
        active: role.active,
        assignable: isAssignable(role, auth.user),
      }));
    return HttpResponse.json(body);
  }),

  http.get(apiPath('/admin/users'), ({ request }) => {
    const auth = authorize(request, ['USER_LIST']);
    if ('error' in auth) return auth.error;
    const params = new URL(request.url).searchParams;
    const page = Number(params.get('page') ?? 0);
    const size = Math.min(Number(params.get('size') ?? 20), 100);
    const search = params.get('search')?.trim().toLowerCase() ?? '';
    const status = params.get('status');
    const userType = params.get('userType');
    const createdFrom = params.get('createdFrom');
    const createdTo = params.get('createdTo');
    if (createdFrom && createdTo && createdFrom > createdTo) {
      return problem(400, 'validation_failed', 'Validation failed', {
        errors: { createdTo: 'must not be before createdFrom' },
      });
    }
    const [sortField = 'createdAt', direction = 'desc'] = (params.get('sort') ?? '').split(',');
    if (params.get('sort') && !isSortField(sortField)) {
      return problem(400, 'validation_failed', 'Validation failed', {
        errors: { sort: `must be one of ${SORT_FIELDS.join(', ')}` },
      });
    }
    const digits = search.replace(/\D/g, '');

    const filtered = mockDb
      .managedUsers()
      .filter(
        (user) =>
          (!status || user.status === status) &&
          (!userType || user.userType === userType) &&
          (!createdFrom || user.createdAt.slice(0, 10) >= createdFrom) &&
          (!createdTo || user.createdAt.slice(0, 10) <= createdTo) &&
          (!search ||
            user.fullName.toLowerCase().includes(search) ||
            user.email.toLowerCase().includes(search) ||
            (digits.length >= 3 && (user.phone ?? '').includes(digits))),
      )
      .sort((a, b) => {
        const field = isSortField(sortField) ? sortField : 'createdAt';
        const result = compare(a, b, field) || a.id - b.id;
        return direction === 'asc' ? result : -result;
      });
    const body: PageResponse<ManagedUser> = {
      content: filtered.slice(page * size, page * size + size).map(toManaged),
      page,
      size,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / size),
    };
    return HttpResponse.json(body);
  }),

  http.get(apiPath('/admin/users/:id'), ({ request, params }) => {
    const auth = authorize(request, ['USER_VIEW']);
    if ('error' in auth) return auth.error;
    const user = mockDb.findManagedUser(Number(params.id));
    return user ? HttpResponse.json(toManaged(user)) : notFound();
  }),

  http.post(apiPath('/admin/users'), async ({ request }) => {
    const auth = authorize(request, ['USER_CREATE'], { write: true });
    if ('error' in auth) return auth.error;
    const body = (await request.json()) as Partial<CreateUserRequest>;
    const missing: Record<string, string> = {};
    for (const field of [
      'fullName',
      'email',
      'password',
      'passwordConfirmation',
      'userType',
    ] as const) {
      if (!body[field]) missing[field] = 'must not be blank';
    }
    if (body.password && body.password !== body.passwordConfirmation) {
      missing.passwordConfirmation = 'must match password';
    }
    if (body.status && !isCreateStatus(body.status)) {
      missing.status = 'must be pending, active or inactive';
    }
    if (body.emailVerified === true && body.status !== 'active') {
      missing.emailVerified = 'requires status active';
    }
    if (Object.keys(missing).length > 0) {
      return problem(400, 'validation_failed', 'Validation failed', { errors: missing });
    }
    const status = body.status ?? 'pending';
    if (status !== 'pending' && !auth.user.permissions.includes('USER_CHANGE_STATUS')) {
      return statusForbidden();
    }
    const rejected =
      checkAssignable(body.userType ?? '', auth.user) ??
      validate(body) ??
      uniqueness(body.email, body.phone);
    if (rejected) return rejected;

    const created = mockDb.addManagedUser({
      fullName: (body.fullName ?? '').trim(),
      email: (body.email ?? '').trim().toLowerCase(),
      phone: body.phone ? normalizePhone(body.phone) : null,
      status,
      userType: body.userType ?? '',
      emailVerified: body.emailVerified === true,
      phoneVerified: false,
      notificationsEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    });
    return HttpResponse.json(toManaged(created), { status: 201 });
  }),

  http.patch(apiPath('/admin/users/:id'), async ({ request, params }) => {
    const auth = authorize(request, ['USER_UPDATE'], { write: true });
    if ('error' in auth) return auth.error;
    const existing = mockDb.findManagedUser(Number(params.id));
    if (!existing) return notFound();
    const unmanageable = checkManageable(existing, auth.user);
    if (unmanageable) return unmanageable;

    const body = (await request.json()) as UpdateUserRequest;
    const statusChange = body.status !== undefined && body.status !== existing.status;
    const roleChange = body.userType !== undefined && body.userType !== existing.userType;
    if (existing.id === auth.user.id && (statusChange || roleChange)) {
      return problem(
        409,
        'user_self_modification',
        'You cannot delete your own account or change your own role or status.',
      );
    }
    if (statusChange) {
      if (!auth.user.permissions.includes('USER_CHANGE_STATUS')) return statusForbidden();
      if (body.status === 'pending') {
        return problem(
          409,
          'user_invalid_status_transition',
          'An account cannot return to pending once it has left it.',
        );
      }
    }
    const rejected =
      (roleChange ? checkAssignable(body.userType ?? '', auth.user) : null) ??
      validate(body) ??
      uniqueness(body.email, body.phone, existing.id);
    if (rejected) return rejected;

    const email = body.email?.trim().toLowerCase();
    const updated: StoredUser = {
      ...existing,
      ...(body.fullName !== undefined ? { fullName: body.fullName.trim() } : {}),
      ...(email !== undefined && email !== existing.email ? { email, emailVerified: false } : {}),
      ...(body.phone !== undefined
        ? { phone: body.phone ? normalizePhone(body.phone) : null, phoneVerified: false }
        : {}),
      ...(roleChange ? { userType: body.userType } : {}),
      ...(statusChange ? { status: body.status } : {}),
      updatedAt: new Date().toISOString(),
    };
    mockDb.replaceManagedUser(updated);
    return HttpResponse.json(toManaged(updated));
  }),

  http.delete(apiPath('/admin/users/:id'), ({ request, params }) => {
    const auth = authorize(request, ['USER_DELETE'], { write: true });
    if ('error' in auth) return auth.error;
    const user = mockDb.findManagedUser(Number(params.id));
    if (!user) return notFound();
    if (user.id === auth.user.id) {
      return problem(
        409,
        'user_self_modification',
        'You cannot delete your own account or change your own role or status.',
      );
    }
    const unmanageable = checkManageable(user, auth.user);
    if (unmanageable) return unmanageable;
    mockDb.deleteManagedUser(user.id);
    return new HttpResponse(null, { status: 204 });
  }),
];
