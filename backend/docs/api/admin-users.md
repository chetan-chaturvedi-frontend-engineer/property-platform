# Admin Users API

Base path `/api/v1`. Interactive OpenAPI docs: `/swagger-ui.html` (dev profile only).

Dashboard endpoints for every account in the `users` table: admins, builders, employees and app users share
it. A user's role is the role whose `slug` equals `users.user_type` (no foreign key or join table, see
`role/domain/Role`); access always comes from that role's permissions, loaded on
every request. Code: `user/api/AdminUserController`, `user/service/AdminUserService`.

## Authentication and authorization

Admin session cookies (see `admin-auth.md`); state-changing cookie requests need the CSRF header. A Bearer
token also works. Every endpoint needs `ADMIN_PANEL_ACCESS` plus:

| Permission (`roles.permissions` key) | Seeded for | Allows |
|---|---|---|
| `USER_LIST` (`user.list`) | admin, super-admin, and dashboard roles that can create or edit any property (for the property form's Builder field) | `GET /admin/users`, `/stats`, `/roles` |
| `USER_VIEW` (`user.view`) | admin, super-admin | `GET /admin/users/{id}` (list alone does **not** allow details) |
| `USER_CREATE` (`user.create`) | admin, super-admin | `POST /admin/users`; also `/roles` |
| `USER_UPDATE` (`user.update`) | admin, super-admin | `PATCH /admin/users/{id}` (name, email, phone, role); also `/roles` |
| `USER_CHANGE_STATUS` (`user.change_status`) | admin, super-admin | capability next to create/update: any status other than `pending` on create; any status change on update |
| `USER_DELETE` (`user.delete`) | admin, super-admin | `DELETE /admin/users/{id}` |

A missing endpoint permission is **403** (logged as `Access denied: ...`). Rules that depend on the data:

| Rule | Error |
|---|---|
| Only active, non-deleted roles can be assigned | **400** `errors.userType` |
| `super-admin` is never assigned | **403** `user_role_forbidden` |
| A role with `ADMIN_PANEL_ACCESS` is assigned only by a caller holding **every** permission it grants | **403** `user_role_forbidden` |
| A user whose role has `ADMIN_PANEL_ACCESS` is changed/deleted only by a caller holding every permission of that role | **403** `user_role_forbidden` |
| Super admin accounts are never changed or deleted here | **409** `user_protected` |
| Nobody deletes themselves or changes their own `status` or `userType` | **409** `user_self_modification` |
| Status change without `USER_CHANGE_STATUS` | **403** `user_status_forbidden` |
| An account never returns to `pending` | **409** `user_invalid_status_transition` |

App roles (no `ADMIN_PANEL_ACCESS`) only grant access to the user's own data, so any caller with the endpoint
permission may assign them and manage their users. Users are global: there is no tenant or organisation scope.

## Response

`ManagedUser`:

```json
{
  "id": 42,
  "fullName": "Rohit Sharma",
  "email": "rohit@example.com",
  "phone": "+919876543210",
  "status": "active",
  "userType": "sales-executive",
  "role": {"slug": "sales-executive", "name": "Sales Executive", "active": true},
  "emailVerified": true,
  "phoneVerified": false,
  "notificationsEnabled": true,
  "createdAt": "2026-11-01T09:30:00Z",
  "updatedAt": "2026-11-10T12:00:00Z"
}
```

- `role`: the non-deleted role with slug `userType`, `null` when there is none (the user has no permissions).
  An inactive role grants nothing. Lists resolve all roles of a page in one query.
- `status`: `pending`, `active`, `suspended`, `rejected`, `inactive` or `closed`. Only `active` accounts with a
  verified email or phone can sign in.
- Passwords, OTPs, tokens, notification tokens and document paths are never returned.

## `GET /admin/users` — list (`USER_LIST`)

| Query | Notes |
|---|---|
| `search` | name or email contains (case-insensitive), or ≥ 3 digits of the phone; ≤ 100 chars |
| `status` | one status value |
| `userType` | role slug |
| `createdFrom`, `createdTo` | ISO dates, inclusive, UTC days; `createdTo` before `createdFrom` is **400** |
| `page`, `size` | zero-based; default size 20, max 100; a page past the end is empty |
| `sort` | `createdAt` (default, desc), `updatedAt`, `fullName`, `email`, `userType`, `status` or `id`, e.g. `sort=fullName,asc`. Other fields are **400**. `id` always breaks ties |

```json
{"content": [ ... ], "page": 0, "size": 20, "totalElements": 1, "totalPages": 1}
```

Soft-deleted users are never listed or counted.

## `GET /admin/users/stats` — counts (`USER_LIST`)

One aggregate query over non-deleted users; not affected by list filters. Every status key is present.

```json
{"total": 128, "byStatus": {"pending": 9, "active": 101, "suspended": 2, "rejected": 1, "inactive": 14, "closed": 1}}
```

## `GET /admin/users/roles` — role options (`USER_LIST`, `USER_CREATE` or `USER_UPDATE`)

Every non-deleted role from `roles`, by name, for filters and forms. Permissions are not included.

```json
[{"slug": "admin", "name": "Admin", "active": true, "assignable": true},
 {"slug": "super-admin", "name": "Super Admin", "active": true, "assignable": false}]
```

`assignable`: the caller may give this role to a user (see the rules above).

## `GET /admin/users/{id}` — details (`USER_VIEW`)

Returns a `ManagedUser`; **404** `user_not_found` for unknown or deleted ids.

## `POST /admin/users` — create (`USER_CREATE`) → 201

```json
{
  "fullName": "Neha Kapoor",
  "email": "neha@example.com",
  "phone": "+91 65432 10987",
  "password": "Str0ng!Pass",
  "passwordConfirmation": "Str0ng!Pass",
  "userType": "user",
  "status": "active",
  "emailVerified": true
}
```

| Field | Rules |
|---|---|
| `fullName` | required, 2–150 chars, trimmed |
| `email` | required, valid, ≤ 255 chars; stored lowercase; unique, also against deleted accounts |
| `phone` | optional; any format, stored as E.164; unique, also against deleted accounts |
| `password` | required, strong-password policy (8–128, upper, lower, digit, symbol); BCrypt-hashed |
| `passwordConfirmation` | required, equals `password` |
| `userType` | required, an assignable role slug |
| `status` | optional, default `pending`; `pending`, `active` or `inactive`; non-pending needs `USER_CHANGE_STATUS` |
| `emailVerified` | optional, default `false`; `true` only with `status: active`, otherwise **400** `errors.emailVerified` |

**Sign-in ready accounts:** with `"status": "active", "emailVerified": true` the admin vouches for the email, so
the user can sign in right away with the given password (app login, and the admin login if the role grants
`ADMIN_PANEL_ACCESS`). This writes a `User email verified by admin` log entry. Otherwise the account is not
verified: the user verifies their email or phone through the existing OTP flow (`/auth/resend-otp`,
`/auth/verify-otp`) before they can sign in, exactly like a self-registered account. The phone is never marked
verified by an admin.

Unknown fields (e.g. `phoneVerified`, `id`, document fields) are **400**.

## `PATCH /admin/users/{id}` — update (`USER_UPDATE`) → 200

```json
{"fullName": "Neha K.", "email": "neha.k@example.com", "phone": null, "userType": "admin", "status": "suspended"}
```

Partial: omitted fields are kept; `phone: null` clears it; `null` for the other fields is **400**. Sending the
current value of `status` or `userType` is not a change and needs no extra permission. Changing `email` or
`phone` resets that verification flag and ends the user's sessions; any status change away from `active` ends
them too. Passwords are not changed here (unknown field, **400**).

## `DELETE /admin/users/{id}` — soft delete (`USER_DELETE`) → 204

Sets `deleted_at` and ends the user's sessions. Their email and phone stay reserved; their properties, leads
and logs are kept. Deleting again is **404**.

## Audit log

Every successful write is logged automatically (`module: users`, actions `User: create`, `User: update`,
`User: delete`, with the user id as reference). Role and status changes add `User role changed` /
`User status changed` entries with `{"field", "from", "to"}`; sign-in ready accounts add `User email verified by
admin`. Denied requests are logged under `permissions`.
Passwords are never logged.

## Errors

RFC 9457 `ProblemDetail` with a `code`; validation errors are **400** `validation_failed` with an `errors` map.

| Status | Code | When |
|---|---|---|
| 400 | `validation_failed` | `errors` map, field → message |
| 403 | `user_role_forbidden`, `user_status_forbidden` | see the rules above |
| 404 | `user_not_found` | unknown or deleted id |
| 409 | `user_already_exists` | email or phone in use; `errors.email` / `errors.phone` says which |
| 409 | `user_self_modification`, `user_protected`, `user_invalid_status_transition` | see the rules above |
| 429 | `rate_limited` | writes: `app.rate-limit.user-management-write-user` (120/h per admin) |
