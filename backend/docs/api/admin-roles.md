# Admin Roles API

Base path `/api/v1`. Interactive OpenAPI docs: `/swagger-ui.html` (dev profile only).

Dashboard endpoints for the roles in the `roles` table and the permissions they grant. A user's role is the role
whose `slug` equals `users.user_type`; permissions are stored per role as `{"<module>": {"<action>": true}}` and
grant the code `<MODULE>_<ACTION>` (upper case, see `security/Permissions`). They are read on every request, so
changes apply to the next request of every user holding the role. Code: `role/api/AdminRoleController`,
`role/service/AdminRoleService`, `role/service/PermissionCatalog`.

## Authentication and authorization

Admin session cookies (see `admin-auth.md`); state-changing cookie requests need the CSRF header. A Bearer
token also works. Every endpoint needs `ADMIN_PANEL_ACCESS` plus:

| Permission (`roles.permissions` key) | Seeded for | Allows |
|---|---|---|
| `ROLE_VIEW` (`role.view`) | admin, super-admin | `GET /admin/roles`, `/stats`, `/permissions`, `/{id}` |
| `ROLE_CREATE` (`role.create`) | admin, super-admin | `POST /admin/roles` |
| `ROLE_UPDATE` (`role.update`) | admin, super-admin | `PATCH /admin/roles/{id}` (details, status, permissions) |
| `ROLE_DELETE` (`role.delete`) | admin, super-admin | `DELETE /admin/roles/{id}` |

A missing endpoint permission is **403** (logged as `Access denied: ...`). Rules that depend on the data:

| Rule | Error |
|---|---|
| Only permissions from the catalog (`GET /admin/roles/permissions`) can be stored | **400** `errors.permissions` |
| A caller only creates, changes or deletes a role whose permissions, before and after the change, they **all** hold | **403** `role_permission_escalation` |
| `super-admin` is managed by migrations only: never created, changed or deleted here | **409** `role_slug_reserved` / `role_super_admin_protected` |
| Default roles (`super-admin`, `admin`, `user`) are never deleted | **409** `role_default_protected` |
| Nobody changes the `status` or `permissions` of their own role, or deletes it (renaming it is allowed) | **409** `role_self_modification` |
| A role still assigned to non-deleted users is not deleted | **409** `role_in_use` (`userCount`) |
| Names are unique among non-deleted roles (case-insensitive); slugs are unique forever | **409** `role_already_exists` |

To move users to another role, use `PATCH /admin/users/{id}` with `userType` (see `admin-users.md`); list a
role's users with `GET /admin/users?userType=<slug>`.

## Response

`Role`:

```json
{
  "id": 4,
  "name": "Sales Manager",
  "slug": "sales-manager",
  "description": "Runs the sales team",
  "status": "active",
  "permissions": {
    "admin_panel": {"access": true},
    "lead": {"list_any": true, "view_any": true, "assign": false}
  },
  "defaultRole": false,
  "superAdmin": false,
  "userCount": 3,
  "manageable": true,
  "ownRole": false,
  "createdAt": "2026-11-21T09:30:00Z",
  "updatedAt": "2026-11-21T10:00:00Z"
}
```

- `permissions`: missing or `false` means not granted. An `inactive` role grants nothing at all.
- `description`: `null` when not set.
- `userCount`: non-deleted users holding the role (one query per page).
- `manageable`: the caller holds every permission the role grants and it is not super admin, so they may edit it.
- `ownRole`: the caller's own role; its status and permissions are read-only for them and it cannot be deleted.
- The flags only guide the UI; every write checks the same rules again.

## `GET /admin/roles` — list (`ROLE_VIEW`)

| Query | Notes |
|---|---|
| `search` | name, slug or description contains (case-insensitive); ≤ 100 chars |
| `status` | `active` or `inactive` |
| `page`, `size` | zero-based; default size 20, max 100 |
| `sort` | `name` (default, asc), `slug`, `status`, `createdAt`, `updatedAt` or `id`. Other fields are **400**. `id` always breaks ties |

```json
{"content": [ ... ], "page": 0, "size": 20, "totalElements": 6, "totalPages": 1}
```

Soft-deleted roles are never listed or counted.

## `GET /admin/roles/stats` — counts (`ROLE_VIEW`)

Not affected by list filters.

```json
{"totalRoles": 6, "activeRoles": 5, "defaultRoles": 3, "totalPermissions": 124, "adminUsers": 15}
```

- `totalPermissions`: permissions in the catalog.
- `adminUsers`: non-deleted users whose active role grants `ADMIN_PANEL_ACCESS`.

## `GET /admin/roles/permissions` — permission catalog (`ROLE_VIEW`)

Every module and action a role can grant, in display order. It mirrors `security/Permissions` exactly (a test
fails when they differ), so new permissions appear here without client changes.

```json
[
  {"key": "admin_panel", "label": "Admin Panel", "actions": [{"key": "access", "code": "ADMIN_PANEL_ACCESS"}]},
  {"key": "lead", "label": "Leads / Enquiries", "actions": [
    {"key": "list", "code": "LEAD_LIST"}, {"key": "view", "code": "LEAD_VIEW"}, ...,
    {"key": "access_assigned", "code": "LEAD_ACCESS_ASSIGNED"}]}
]
```

Actions differ per module (e.g. `list`, `view`, `create`, `update`, `delete`, `change_status`, `publish`, `_any`
variants for admin-wide access). Owner-scoped actions (without `_any`) only cover the user's own data.

## `GET /admin/roles/{id}` — details (`ROLE_VIEW`)

Returns a `Role`; **404** `role_not_found` for unknown or deleted ids.

## `POST /admin/roles` — create (`ROLE_CREATE`) → 201

```json
{
  "name": "Sales Manager",
  "slug": "sales-manager",
  "description": "Runs the sales team",
  "status": "active",
  "permissions": {"admin_panel": {"access": true}, "lead": {"list_any": true, "view_any": true}}
}
```

| Field | Rules |
|---|---|
| `name` | required, 2–100 chars, trimmed; unique among non-deleted roles (case-insensitive) |
| `slug` | required, 2–30 chars, `^[a-z0-9]+(-[a-z0-9]+)*$`; unique also against deleted roles; never changes |
| `description` | optional, ≤ 500 chars; blank is stored as `null` |
| `status` | optional, default `active`; `active` or `inactive` |
| `permissions` | optional, default none; ≤ 100 modules; catalog keys only, boolean values; every `true` must be held by the caller |

Unknown fields (e.g. `id`) are **400**.

## `PATCH /admin/roles/{id}` — update (`ROLE_UPDATE`) → 200

```json
{"name": "Sales Team", "description": null, "status": "inactive",
 "permissions": {"lead": {"list_any": false, "view_any": true}}}
```

Partial: omitted fields are kept; `description: null` clears it; `null` for the other fields is **400**.
`permissions` replaces **all** of the role's permissions. Sending the current `status` or `permissions` is not a
change (so it is allowed on your own role). `slug` cannot be changed (unknown field, **400**).

## `DELETE /admin/roles/{id}` — soft delete (`ROLE_DELETE`) → 204

Sets `deleted_at`. The slug stays reserved, so users still pointing at it can never inherit a new role's
permissions. Deleting again is **404**.

## Audit log

Every successful write is logged automatically (`module: roles`, actions `Role: create`, `Role: update`,
`Role: delete`, with the role id as reference). Creating a role adds `Role permissions granted`, changing its
permissions adds `Role permissions changed`, both with `{"added": [codes], "removed": [codes]}`; status changes add
`Role status changed` with `{"field", "from", "to"}`. Denied requests are logged under `permissions`.

## Errors

RFC 9457 `ProblemDetail` with a `code`; validation errors are **400** `validation_failed` with an `errors` map.

| Status | Code | When |
|---|---|---|
| 400 | `validation_failed` | `errors` map, field → message |
| 403 | `role_permission_escalation` | see the rules above |
| 404 | `role_not_found` | unknown or deleted id |
| 409 | `role_already_exists` | name or slug in use; `errors.name` / `errors.slug` says which |
| 409 | `role_slug_reserved`, `role_super_admin_protected`, `role_default_protected`, `role_self_modification`, `role_in_use` | see the rules above |
| 429 | `rate_limited` | writes: `app.rate-limit.role-write-user` (120/h per admin) |
