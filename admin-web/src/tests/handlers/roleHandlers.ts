import { http, HttpResponse } from 'msw';

import type { AdminUser } from '@/features/auth/types/auth.types';
import type {
  CreateRoleRequest,
  Role,
  RoleStats,
  RolePermissions,
  UpdateRoleRequest,
} from '@/features/roles/types/role.types';
import type { PageResponse } from '@/types/api.types';

import { type MockRole, mockDb } from '../mocks/mockDb';
import {
  ALL_PERMISSION_CODES,
  codesFromPermissions,
  MOCK_PERMISSION_CATALOG,
  permissionsFromCodes,
} from '../mocks/roleMockData';

import { apiPath, csrfRejection, problem } from './problem';

/** Mirrors `backend/docs/api/admin-roles.md` and `AdminRoleService`. */

const DEFAULT_SLUGS = ['super-admin', 'admin', 'user'];
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SORT_FIELDS = ['id', 'name', 'slug', 'status', 'createdAt', 'updatedAt'] as const;
type SortField = (typeof SORT_FIELDS)[number];

function authorize(
  request: Request,
  permission: string,
  { write = false } = {},
): { error: Response } | { user: AdminUser } {
  if (write) {
    const rejected = csrfRejection(request, mockDb.csrfToken());
    if (rejected) return { error: rejected };
  }
  const user = mockDb.sessionUser();
  if (!user) return { error: problem(401, 'unauthorized', 'Authentication required.') };
  if (!user.permissions.includes(permission)) {
    return { error: problem(403, 'access_denied', 'Access denied.') };
  }
  return { user };
}

const invalid = (field: string, message: string) =>
  problem(400, 'validation_failed', 'Validation failed', { errors: { [field]: message } });
const notFound = () => problem(404, 'role_not_found', 'Role not found.');
const superAdminProtected = () =>
  problem(
    409,
    'role_super_admin_protected',
    'The super admin role cannot be deactivated, deleted or have its permissions changed.',
  );
const escalation = () =>
  problem(
    403,
    'role_permission_escalation',
    'You can only manage roles whose permissions you hold yourself.',
  );
const selfModification = () =>
  problem(
    409,
    'role_self_modification',
    'You cannot change the status or permissions of your own role, or delete it.',
  );
const alreadyExists = (field: 'name' | 'slug') =>
  problem(409, 'role_already_exists', `A role with this ${field} already exists.`, {
    errors: { [field]: 'is already in use' },
  });

const holdsAll = (actor: AdminUser, codes: readonly string[]) =>
  codes.every((code) => actor.permissions.includes(code));
const userCount = (slug: string) =>
  mockDb.managedUsers().filter((user) => user.userType === slug).length;
const isOwnRole = (role: MockRole, actor: AdminUser) => role.slug === actor.role.slug;

function toRole(role: MockRole, actor: AdminUser): Role {
  const superAdmin = role.slug === 'super-admin';
  return {
    id: role.id,
    name: role.name,
    slug: role.slug,
    description: role.description,
    status: role.active ? 'active' : 'inactive',
    permissions: permissionsFromCodes(role.permissions),
    defaultRole: DEFAULT_SLUGS.includes(role.slug),
    superAdmin,
    userCount: userCount(role.slug),
    manageable: !superAdmin && holdsAll(actor, role.permissions),
    ownRole: isOwnRole(role, actor),
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

const nameTaken = (name: string, excludeId?: number) =>
  mockDb
    .roles()
    .some((role) => role.id !== excludeId && role.name.toLowerCase() === name.trim().toLowerCase());

function validName(name: unknown): string | null {
  return typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 100
    ? null
    : 'size must be between 2 and 100';
}

function parsePermissions(value: unknown): { codes: string[] } | { error: Response } {
  if (value === undefined) return { codes: [] };
  if (value === null || typeof value !== 'object')
    return { error: invalid('permissions', 'must not be null') };
  const parsed = codesFromPermissions(value as RolePermissions);
  return 'unknown' in parsed
    ? { error: invalid('permissions', `has an unknown permission: ${parsed.unknown}`) }
    : parsed;
}

const isSortField = (value: string): value is SortField =>
  (SORT_FIELDS as readonly string[]).includes(value);

export const roleHandlers = [
  http.get(apiPath('/admin/roles/stats'), ({ request }) => {
    const auth = authorize(request, 'ROLE_VIEW');
    if ('error' in auth) return auth.error;
    const roles = mockDb.roles();
    const adminSlugs = new Set(
      roles
        .filter((role) => role.active && role.permissions.includes('ADMIN_PANEL_ACCESS'))
        .map((role) => role.slug),
    );
    const body: RoleStats = {
      totalRoles: roles.length,
      activeRoles: roles.filter((role) => role.active).length,
      defaultRoles: roles.filter((role) => DEFAULT_SLUGS.includes(role.slug)).length,
      totalPermissions: ALL_PERMISSION_CODES.length,
      adminUsers: mockDb.managedUsers().filter((user) => adminSlugs.has(user.userType)).length,
    };
    return HttpResponse.json(body);
  }),

  http.get(apiPath('/admin/roles/permissions'), ({ request }) => {
    const auth = authorize(request, 'ROLE_VIEW');
    if ('error' in auth) return auth.error;
    return HttpResponse.json(MOCK_PERMISSION_CATALOG);
  }),

  http.get(apiPath('/admin/roles'), ({ request }) => {
    const auth = authorize(request, 'ROLE_VIEW');
    if ('error' in auth) return auth.error;
    const url = new URL(request.url);
    const search = (url.searchParams.get('search') ?? '').trim().toLowerCase();
    const status = url.searchParams.get('status');
    if (status && status !== 'active' && status !== 'inactive')
      return invalid('status', 'must be a role status');
    const [field = 'name', direction = 'asc'] = (url.searchParams.get('sort') ?? 'name,asc').split(
      ',',
    );
    if (!isSortField(field)) return invalid('sort', `must be one of ${SORT_FIELDS.join(', ')}`);
    const page = Math.max(0, Number(url.searchParams.get('page') ?? 0));
    const size = Math.min(100, Math.max(1, Number(url.searchParams.get('size') ?? 20)));

    const rows = mockDb
      .roles()
      .map((role) => toRole(role, auth.user))
      .filter(
        (role) =>
          (!search ||
            role.name.toLowerCase().includes(search) ||
            role.slug.includes(search) ||
            (role.description ?? '').toLowerCase().includes(search)) &&
          (!status || role.status === status),
      )
      .sort((a, b) => {
        const order =
          field === 'id' ? a.id - b.id : String(a[field]).localeCompare(String(b[field]));
        return (direction === 'desc' ? -order : order) || a.id - b.id;
      });
    const body: PageResponse<Role> = {
      content: rows.slice(page * size, page * size + size),
      page,
      size,
      totalElements: rows.length,
      totalPages: Math.ceil(rows.length / size),
    };
    return HttpResponse.json(body);
  }),

  http.get(apiPath('/admin/roles/:id'), ({ request, params }) => {
    const auth = authorize(request, 'ROLE_VIEW');
    if ('error' in auth) return auth.error;
    const role = mockDb.findRoleById(Number(params.id));
    return role ? HttpResponse.json(toRole(role, auth.user)) : notFound();
  }),

  http.post(apiPath('/admin/roles'), async ({ request }) => {
    const auth = authorize(request, 'ROLE_CREATE', { write: true });
    if ('error' in auth) return auth.error;
    const body = (await request.json()) as CreateRoleRequest & Record<string, unknown>;
    const unknownField = Object.keys(body).find(
      (key) => !['name', 'slug', 'description', 'status', 'permissions'].includes(key),
    );
    if (unknownField) return invalid(unknownField, 'is not a recognized field');
    const nameError = validName(body.name);
    if (nameError) return invalid('name', nameError);
    if (
      typeof body.slug !== 'string' ||
      !SLUG.test(body.slug) ||
      body.slug.length < 2 ||
      body.slug.length > 30
    ) {
      return invalid('slug', 'must be lowercase letters, digits and single hyphens');
    }
    if (body.description !== undefined && body.description.length > 500) {
      return invalid('description', 'size must be between 0 and 500');
    }
    if (body.status !== undefined && body.status !== 'active' && body.status !== 'inactive') {
      return invalid('status', 'must be a role status');
    }
    const permissions = parsePermissions(body.permissions);
    if ('error' in permissions) return permissions.error;
    if (nameTaken(body.name)) return alreadyExists('name');
    if (body.slug === 'super-admin')
      return problem(409, 'role_slug_reserved', 'This role slug is reserved.');
    if (mockDb.isRoleSlugTaken(body.slug)) return alreadyExists('slug');
    if (!holdsAll(auth.user, permissions.codes)) return escalation();

    const now = new Date().toISOString();
    const role: MockRole = {
      id: mockDb.nextRoleId(),
      slug: body.slug,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      active: body.status !== 'inactive',
      permissions: permissions.codes,
      createdAt: now,
      updatedAt: now,
    };
    mockDb.saveRole(role);
    return HttpResponse.json(toRole(role, auth.user), { status: 201 });
  }),

  http.patch(apiPath('/admin/roles/:id'), async ({ request, params }) => {
    const auth = authorize(request, 'ROLE_UPDATE', { write: true });
    if ('error' in auth) return auth.error;
    const body = (await request.json()) as UpdateRoleRequest & Record<string, unknown>;
    const unknownField = Object.keys(body).find(
      (key) => !['name', 'description', 'status', 'permissions'].includes(key),
    );
    if (unknownField) return invalid(unknownField, 'is not a recognized field');
    const role = mockDb.findRoleById(Number(params.id));
    if (!role) return notFound();
    if (body.name !== undefined) {
      const nameError = validName(body.name);
      if (nameError) return invalid('name', nameError);
    }
    if (body.status !== undefined && body.status !== 'active' && body.status !== 'inactive') {
      return invalid('status', 'must be a role status');
    }
    const permissions = body.permissions === undefined ? null : parsePermissions(body.permissions);
    if (permissions && 'error' in permissions) return permissions.error;
    if (role.slug === 'super-admin') return superAdminProtected();
    if (!holdsAll(auth.user, role.permissions)) return escalation();

    const newStatus =
      body.status !== undefined && (body.status === 'active') !== role.active ? body.status : null;
    const newCodes =
      permissions &&
      (permissions.codes.length !== role.permissions.length ||
        permissions.codes.some((code) => !role.permissions.includes(code)))
        ? permissions.codes
        : null;
    if ((newStatus || newCodes) && isOwnRole(role, auth.user)) return selfModification();
    if (
      body.name !== undefined &&
      body.name.trim() !== role.name &&
      nameTaken(body.name, role.id)
    ) {
      return alreadyExists('name');
    }
    if (newCodes && !holdsAll(auth.user, newCodes)) return escalation();

    const updated: MockRole = {
      ...role,
      name: body.name?.trim() ?? role.name,
      description:
        body.description === undefined ? role.description : body.description?.trim() || null,
      active: newStatus ? newStatus === 'active' : role.active,
      permissions: newCodes ?? role.permissions,
      updatedAt: new Date(Math.max(Date.now(), Date.parse(role.updatedAt) + 1000)).toISOString(),
    };
    mockDb.saveRole(updated);
    return HttpResponse.json(toRole(updated, auth.user));
  }),

  http.delete(apiPath('/admin/roles/:id'), ({ request, params }) => {
    const auth = authorize(request, 'ROLE_DELETE', { write: true });
    if ('error' in auth) return auth.error;
    const role = mockDb.findRoleById(Number(params.id));
    if (!role) return notFound();
    if (role.slug === 'super-admin') return superAdminProtected();
    if (DEFAULT_SLUGS.includes(role.slug)) {
      return problem(409, 'role_default_protected', 'Default roles cannot be deleted.');
    }
    if (!holdsAll(auth.user, role.permissions)) return escalation();
    if (isOwnRole(role, auth.user)) return selfModification();
    const users = userCount(role.slug);
    if (users > 0) {
      return problem(
        409,
        'role_in_use',
        `This role is assigned to ${users} user(s). Assign them another role before deleting it.`,
      );
    }
    mockDb.deleteRole(role.id);
    return new HttpResponse(null, { status: 204 });
  }),
];
