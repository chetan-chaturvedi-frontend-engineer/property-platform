# Builder Teams API

Base path `/api/v1`. Interactive OpenAPI docs: `/swagger-ui.html` (dev profile only).

Three sets of endpoints share one table (`builder_teams`):

- **Builder** `/api/v1/builder-teams` (mobile): the caller's own team (`builder_id` = caller).
- **Employee** `/api/v1/builder-team-memberships` (mobile): the caller's own memberships in other builders'
  teams (`employee_id` = caller); answer invitations.
- **Admin** `/api/v1/admin/builder-teams` (dashboard): every team, `_ANY` permissions, no subscription gating.

## Relationships

| Column | JSON | Points to | Set by |
|---|---|---|---|
| `builder_id` | `builder` | `users.id`, the team owner | app: the caller (token); admin: `builderId`. Never changes |
| `employee_id` | `employee` | `users.id`, the member's own account | app: resolved from `email`/`phone`; admin: `employeeId`. Never changes |
| `user_id` | `invitedBy` | `users.id`, who created the membership | server: the caller. Never changes |

There is no separate builders or employees table: builders, employees and admins are all `users`.
A builder cannot be on their own team (**422** `builder_team_self_membership`).

Memberships outside the caller's scope are **404** `builder_team_member_not_found` on every endpoint (never
403), and list queries apply the scope in SQL, so counts and pages never include other teams.

## Membership lifecycle

```
pending ──accept (employee)──▶ active ◀──active (needs a seat)── inactive
   │  └──reject (employee)──▶ rejected        │──inactive──────────▶ │
   │                                          │                      │
   └────────────revoked (builder/admin)───────┴──────────────────────┘──▶ revoked
```

- App invitations are always `pending`; only the employee accepts or rejects. Admins may create `active`
  directly or move `pending` → `active` (both need `BUILDER_TEAM_MANAGE_STATUS`).
- `rejected` and `revoked` are final: role and permissions can no longer change (**409**
  `builder_team_member_not_editable`), and the builder may invite the same user again (a new row).
- `DELETE` revokes an open membership, then soft-deletes it: it disappears from every endpoint. Site visits,
  leads and reports assigned to the employee are separate records and are not touched.
- At most one open (`pending`, `active`, `inactive`) membership per builder and employee (**409**
  `builder_team_duplicate_membership`, also under concurrent requests).

## Authentication and authorization

Every endpoint needs `Authorization: Bearer <accessToken>`; otherwise **401**. Permissions come from the
caller's role and are loaded on every request. `/api/v1/admin/**` also requires `ADMIN_PANEL_ACCESS`.

| Permission (`roles.permissions` key) | Seeded for | Allows |
|---|---|---|
| `BUILDER_TEAM_LIST` (`builder_team.list`) | user | list own team |
| `BUILDER_TEAM_VIEW` (`builder_team.view`) | user | own team member details |
| `BUILDER_TEAM_CREATE` (`builder_team.create`) | user | invite to own team |
| `BUILDER_TEAM_UPDATE` (`builder_team.update`) | user | PATCH own team members (`notes`; other fields need a capability) |
| `BUILDER_TEAM_DELETE` (`builder_team.delete`) | user | remove own team members |
| `BUILDER_TEAM_MEMBERSHIP_VIEW` (`builder_team_membership.view`) | user | list/detail own memberships |
| `BUILDER_TEAM_MEMBERSHIP_RESPOND` (`builder_team_membership.respond`) | user | accept/reject own invitations |
| `BUILDER_TEAM_LIST_ANY` | admin | admin list |
| `BUILDER_TEAM_VIEW_ANY` | admin | admin details (list alone does **not** allow details) |
| `BUILDER_TEAM_CREATE_ANY` | admin | admin create |
| `BUILDER_TEAM_UPDATE_ANY` | admin | admin PATCH (`notes`; other fields need a capability) |
| `BUILDER_TEAM_DELETE_ANY` | admin | admin soft delete |

Capabilities, needed **next to** the scope code (app `CREATE`/`UPDATE`, admin `CREATE_ANY`/`UPDATE_ANY`):

| Permission | Seeded for | Needed to |
|---|---|---|
| `BUILDER_TEAM_ASSIGN_ROLE` | user, admin | change `role` |
| `BUILDER_TEAM_MANAGE_PERMISSIONS` | user, admin | send non-empty `permissions` on create; change `permissions` |
| `BUILDER_TEAM_MANAGE_STATUS` | user, admin | change `status`; admin create with `status: active` |

A missing capability fails the whole PATCH with **403** `builder_team_fields_forbidden` and a `fields`
list; nothing changes. A missing scope permission is **403** `builder_team_action_forbidden`.

### What a membership may grant

A team works on its builder's data, so a membership never carries more than the builder holds right now
(checked for app and admin calls alike; **400** with `errors.role` / `errors.permissions`):

- `role`: an active role (`roles.slug`), not `super-admin`, without admin panel access, and whose
  permissions the builder all holds. Team roles are created by admins as ordinary roles.
- `permissions`: `{"<module>": {"<action>": true|false}}` like `roles.permissions`; every `true` code
  (`MODULE_ACTION`) must be one the builder holds, and never `ADMIN_PANEL_ACCESS` or an `_ANY` code.
  At most 20 modules and 50 actions per module.

Builders and employees must be active app accounts (role without admin panel access); employees must also
be verified. Unknown and ineligible accounts get the same message.

## Subscription gating (builder endpoints only)

The builder's subscription in force (status `active`, inside its start/end window) carries
`no_of_team_members`, copied from the plan (`subscription_plans.no_of_team_members`, admin-editable as
`noOfTeamMembers`). `0` = team management not included (the default for existing plans). **Pending and
active** members use seats; inactive, rejected, revoked and deleted ones do not.

| Action | Needs |
|---|---|
| invite | subscription in force, limit > 0, a free seat |
| reactivate (`inactive` → `active`) | subscription in force, a free seat |
| change `role` / `permissions` | subscription in force, limit > 0 |
| `notes`, deactivate, revoke, delete, list, view | nothing: a builder can always shrink or review their team |
| employee accept/reject | nothing (the seat was counted at invitation) |

Seat checks lock the builder's subscription row, so concurrent invitations cannot exceed the limit.
Expiry or a downgrade never removes members; it only blocks new seats.

| Code (403) | When |
|---|---|
| `subscription_required` | no subscription in force (none, pending, cancelled, not started) |
| `subscription_expired` | the last subscription in force has ended |
| `team_management_not_included` | the subscription's limit is 0; `plan` |
| `team_member_limit_reached` | `plan`, `teamMemberLimit`, `currentTeamMembers`, `remainingTeamMembers` |

## Response

All endpoints return a `BuilderTeamMember` (lists: `PageResponse` of them):

```json
{
  "id": 25,
  "builder":   {"id": 10, "fullName": "Bob", "email": null, "phone": null},
  "employee":  {"id": 45, "fullName": "Alice", "email": "alice@example.com", "phone": "+919876500001"},
  "invitedBy": {"id": 10, "fullName": "Bob", "email": null, "phone": null},
  "role": "sales-executive",
  "permissions": {"lead": {"view": true}},
  "status": "active",
  "joinedAt": "2026-10-27T10:00:00Z",
  "notes": "Pune site team",
  "createdAt": "2026-10-27T09:00:00Z",
  "updatedAt": "2026-10-27T10:00:00Z"
}
```

Visibility: admin sees everyone's `email`/`phone`; the builder sees the employee's `email`/`phone` only
after they have joined (`joinedAt` set), so an invitation reveals nothing beyond what the builder typed;
the employee sees names only and `notes` is `null`. Passwords, tokens and documents are never returned.

Lists: `page` (zero-based), `size` (default 20, max 100), `sort` = `createdAt` (default, desc), `updatedAt`,
`joinedAt`, `status` or `role`, e.g. `sort=createdAt,asc`. Other sort fields are **400**.

```json
{"content": [ ... ], "page": 0, "size": 20, "totalElements": 1, "totalPages": 1}
```

Errors are RFC 9457 `ProblemDetail` with a `code`; validation errors are **400** `validation_failed` with
an `errors` map. Unknown request fields (e.g. `builderId`, `userId`, `status` on app create) are rejected
with **400**, never ignored. Writes are rate limited per user (**429**).

## Builder endpoints (mobile)

### `POST /builder-teams` — invite (`BUILDER_TEAM_CREATE`) → 201

```json
{"email": "alice@example.com", "role": "sales-executive", "permissions": {"lead": {"view": true}}, "notes": "optional"}
```

Exactly one of `email` or `phone` (any format; normalized to E.164) of an active, verified account.
`permissions` optional (non-empty needs `BUILDER_TEAM_MANAGE_PERMISSIONS`); `notes` ≤ 2000 characters.
Rate limit: `app.rate-limit.builder-team-create-user` (30/h).

### `GET /builder-teams` — list own team (`BUILDER_TEAM_LIST`)

Query: `search` (employee name, email, or ≥ 3 phone digits; ≤ 100 chars), `role`, `status`, paging.

### `GET /builder-teams/{id}` — details (`BUILDER_TEAM_VIEW`)

### `PATCH /builder-teams/{id}` — update (`BUILDER_TEAM_UPDATE` + capabilities)

```json
{"role": "user", "permissions": {"site_visit": {"view": true}}, "status": "inactive", "notes": null}
```

All fields optional; `permissions` replaces the whole object; `notes: null` clears. `status`: `active`
(reactivate an inactive member only; **409** `builder_team_invalid_status_transition` otherwise),
`inactive` or `revoked`.

### `DELETE /builder-teams/{id}` — remove (`BUILDER_TEAM_DELETE`) → 204

## Employee endpoints (mobile)

### `GET /builder-team-memberships` — own memberships (`BUILDER_TEAM_MEMBERSHIP_VIEW`)

Query: `status` (e.g. `pending` for open invitations), paging.

### `GET /builder-team-memberships/{id}` (`BUILDER_TEAM_MEMBERSHIP_VIEW`)

### `POST /builder-team-memberships/{id}/accept` / `/reject` (`BUILDER_TEAM_MEMBERSHIP_RESPOND`) → 200

Pending invitations only; anything else is **409** `builder_team_invalid_status_transition`.

## Admin endpoints (dashboard)

### `POST /admin/builder-teams` — create (`BUILDER_TEAM_CREATE_ANY`) → 201

```json
{"builderId": 10, "employeeId": 45, "role": "sales-executive", "permissions": {}, "status": "active", "notes": "optional"}
```

`status`: `pending` (default) or `active` (needs `BUILDER_TEAM_MANAGE_STATUS`). Not gated by the builder's
subscription or team limit.

### `GET /admin/builder-teams` — list (`BUILDER_TEAM_LIST_ANY`)

Query: `search`, `builderId`, `employeeId`, `role`, `status`, `createdFrom`, `createdTo` (ISO-8601,
inclusive), paging.

### `GET /admin/builder-teams/{id}` (`BUILDER_TEAM_VIEW_ANY`)

### `PATCH /admin/builder-teams/{id}` (`BUILDER_TEAM_UPDATE_ANY` + capabilities)

Same body as the builder PATCH; `status: active` also activates a pending invitation.

### `DELETE /admin/builder-teams/{id}` (`BUILDER_TEAM_DELETE_ANY`) → 204

## Not covered yet

- Team members acting on the builder's data: stored `permissions` are not yet applied by the property,
  lead or site visit modules.
- Notifications to the invited employee, an employee "leave team" action, and activity log entries (the
  activity log module does not exist yet; actions are written to the application log).
