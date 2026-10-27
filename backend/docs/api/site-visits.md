# Site Visits API

Base path `/api/v1`. Interactive OpenAPI docs: `/swagger-ui.html` (dev profile only).

Two sets of endpoints share one table (`site_visits`):

- **App** `/api/v1/site-visits` (mobile): only visits the caller is related to. Admin permissions are
  never used here.
- **Admin** `/api/v1/admin/site-visits` (dashboard): every visit, `_ANY` permissions only.

## Relationships

| Column | Points to | Set by |
|---|---|---|
| `property_id` | `property_projects.id` | request; never changes |
| `builder_id` | `users.id`, the property's owner (`property_projects.user_id`) | server, from the property; never changes |
| `user_id` (`customer`) | `users.id`, the visitor's account | server (app booking = caller), admin may set or change |
| `assign_id` (`assignee`) | `users.id`, the employee or agent | `/assign` only |
| `scheduled_by` | `users.id` | server: the caller who created the visit |
| `report_submitted_by` | `users.id` | server: the caller who submitted the report |
| `lead_id` | `leads.id` | admin only; must be a lead the caller can view |

There is no separate builders or employees table: builders, agents, admins and visitors are all `users`.

**Relation to a visit** (app endpoints): *builder* = `builder_id` is the caller; *visitor* = `user_id`
is the caller; *assignee* = `assign_id` is the caller **and** they hold `SITE_VISIT_ACCESS_ASSIGNED`.
Unrelated callers get **404** `site_visit_not_found` for every visit endpoint (never 403), and list
queries apply the scope in SQL, so counts, filters and pages never include other visits.

## Authentication and authorization

Every endpoint needs `Authorization: Bearer <accessToken>` (app users: `POST /api/v1/auth/login`,
staff: `POST /api/v1/admin/login`); otherwise **401**. Permissions come from the caller's role and are
loaded on every request. `/api/v1/admin/**` also requires `ADMIN_PANEL_ACCESS`.

| Permission (`roles.permissions` key) | Seeded for | Allows (app endpoints, own visits only) |
|---|---|---|
| `SITE_VISIT_LIST` (`site_visit.list`) | user | list own visits |
| `SITE_VISIT_VIEW` (`site_visit.view`) | user | own visit details |
| `SITE_VISIT_CREATE` (`site_visit.create`) | user | book a published property; record a visit at an own property |
| `SITE_VISIT_UPDATE` (`site_visit.update`) | user | edit fields allowed for the caller's relation (below) |
| `SITE_VISIT_UPDATE_STATUS` (`site_visit.update_status`) | user | builder/assignee: any status change; visitor: cancel only |
| `SITE_VISIT_SUBMIT_REPORT` (`site_visit.submit_report`) | user | builder/assignee: submit the report once |
| `SITE_VISIT_ASSIGN` (`site_visit.assign`) | user | builder: assign own visits |
| `SITE_VISIT_ACCESS_ASSIGNED` (`site_visit.access_assigned`) | nobody | visits assigned to the caller count as theirs; makes the caller assignable |

| Permission | Seeded for | Allows (admin endpoints, every visit) |
|---|---|---|
| `SITE_VISIT_LIST_ANY` | admin | list |
| `SITE_VISIT_VIEW_ANY` | admin | details (list alone does **not** allow details) |
| `SITE_VISIT_CREATE_ANY` | admin | create; setting `assignId` also needs `SITE_VISIT_ASSIGN_ANY` |
| `SITE_VISIT_UPDATE_ANY` | admin | edit fields (admin allow-list) |
| `SITE_VISIT_DELETE_ANY` | admin | soft delete |
| `SITE_VISIT_ASSIGN_ANY` | admin | assign/unassign |
| `SITE_VISIT_UPDATE_STATUS_ANY` | admin | status changes |
| `SITE_VISIT_SUBMIT_REPORT_ANY` | admin | submit or replace any report, including locked ones |

A field agent role is e.g. `{"admin_panel": {"access": true}, "site_visit": {"list": true, "view": true,
"update": true, "update_status": true, "submit_report": true, "access_assigned": true}}`.

### Editable fields per relation (`PATCH .../{id}`)

| Field | Builder | Assignee | Visitor | Admin |
|---|---|---|---|---|
| `visitType`, `name`, `mobile`, `email` | yes | – | – | yes |
| `visitDate`, `visitTime`, `numberOfPeople`, `note` | yes | yes | – | yes |
| `nextFollowUp`, `followUpNote` | yes | yes | – | yes |
| `userId`, `leadId` | – | – | – | yes |

A caller who is builder *and* assignee gets both lists. A field outside the caller's list fails the
whole request with **403** `site_visit_fields_forbidden` (`fields` lists them); the visitor gets
**403** `site_visit_action_forbidden`. Unknown fields (`builderId`, `assignId`, `status`, report fields,
timestamps, ...) are **400** `is not allowed`. Visit details (everything except the follow-up fields
and `leadId`) change only while the visit is upcoming; otherwise **409** `site_visit_not_editable`.

**Assignees** must be active and be either the visit's builder, a holder of `SITE_VISIT_VIEW_ANY`, or a
holder of `SITE_VISIT_ACCESS_ASSIGNED` + `SITE_VISIT_VIEW`. Anyone else (unknown, suspended, plain app
users) gets 400 `assignId`, so visitor details are never pushed to arbitrary accounts.

## Lifecycle

```
scheduled ─┬─> confirmed ─┬─> completed   (visit date reached; actualVisitDate, default now)
rescheduled┘              ├─> no_show     (visit date reached)
  ▲                       └─> cancelled   (cancellationReason required; cancelledAt = now)
  └── date/time changed on an upcoming visit (scheduled, confirmed or rescheduled)
```

- `completed`, `cancelled` and `no_show` are final. `rescheduled` is never requested directly.
- The report can only be submitted for a **completed** visit. In the app it is **locked** once
  submitted (409 `site_visit_report_locked`); admins with `SITE_VISIT_SUBMIT_REPORT_ANY` replace it.
- Assignment works on upcoming and completed visits.

## Scheduling rules

- `visitDate` (`yyyy-MM-dd`) and `visitTime` (`HH:mm` or `HH:mm:ss`) are **local wall-clock values at
  the property** (zone `app.site-visit.time-zone`, default `Asia/Kolkata`), not UTC. Every other time
  (`nextFollowUp`, `actualVisitDate`, `cancelledAt`, `createdAt`, ...) is an ISO-8601 UTC instant.
- New and moved visits: today or later, within `app.site-visit.max-advance-days` (90), and not earlier
  than now when the date is today.
- A visitor account holds one **upcoming** booking per property and slot; a repeat (e.g. a retried
  request) is **409** `site_visit_duplicate`. Other slots and new bookings after a cancellation are fine.
  Enforced by the unique index `uq_site_visits_active_booking`.

## Responses and errors

Same as every other module: the resource itself (no envelope); lists are
`{ "content": [...], "page": 0, "size": 20, "totalElements": 1, "totalPages": 1 }`; errors are
RFC 9457 problem details with a `code`. Validation is **400** (not 422) with an `errors` map.

| Status | Code | When |
|---|---|---|
| 400 | `validation_failed` | invalid values, unknown fields, unusable `propertyId`/`userId`/`assignId`/`leadId` |
| 401 | | no or invalid token |
| 403 | `site_visit_action_forbidden` | missing permission, or relation not allowed for the action |
| 403 | `site_visit_fields_forbidden` | fields outside the caller's allow-list |
| 404 | `site_visit_not_found` | unknown, deleted or not related to the caller |
| 409 | `site_visit_invalid_status_transition`, `site_visit_not_editable`, `site_visit_not_due`, `site_visit_report_not_allowed`, `site_visit_report_locked`, `site_visit_duplicate` | state conflicts |
| 429 | | rate limit: 30 bookings/h, 600 other writes/h per user |

Users in responses are `{ "id", "fullName" }` only, never contact details. For a caller who is
**only the visitor**, `leadId`, `report`, `nextFollowUp` and `followUpNote` are `null` (and `interest`
and `nextFollowUp` in lists). Deleted visits are excluded everywhere.

```json
{
  "id": 12, "visitCode": "SV-100012",
  "property": { "id": 25, "projectName": "Green Acres", "slug": "green-acres", "city": "Pune", "locality": "Baner" },
  "builder": { "id": 7, "fullName": "Bob" }, "customer": { "id": 3, "fullName": "Alice" },
  "assignee": { "id": 9, "fullName": "Carol" }, "assignedAt": "2026-11-01T05:00:00Z",
  "scheduledBy": { "id": 3, "fullName": "Alice" }, "leadId": null,
  "visitType": "site_visit", "visitDate": "2026-11-02", "visitTime": "10:30:00", "status": "completed",
  "name": "Ravi Kumar", "mobile": "+919876543210", "email": "ravi@example.com", "numberOfPeople": 3,
  "note": null, "actualVisitDate": "2026-11-02T05:10:00Z", "cancelledAt": null, "cancellationReason": null,
  "report": { "interest": "high", "visitNote": "Liked the clubhouse", "duration": 45, "visitedWith": "Spouse",
              "feedback": "Good", "rating": 5, "submittedBy": { "id": 9, "fullName": "Carol" } },
  "nextFollowUp": "2026-11-05T04:30:00Z", "followUpNote": "Send price sheet",
  "createdAt": "2026-11-01T04:00:00Z", "updatedAt": "2026-11-02T06:00:00Z"
}
```

## App endpoints

### `POST /site-visits` — book (201)

```json
{ "propertyId": 25, "visitType": "site_visit", "visitDate": "2026-11-02", "visitTime": "10:30",
  "name": "Ravi Kumar", "mobile": "98765 43210", "email": "ravi@example.com", "numberOfPeople": 3,
  "note": "Weekend preferred" }
```

Required: `propertyId`, `visitDate`, `visitTime`, `name`, `mobile`. `visitType` defaults to
`site_visit`, `numberOfPeople` to 1 (1–100). `mobile` accepts any common format and is stored as
E.164; `email` is stored lower-case. A **published** property books the caller as visitor; the
caller's **own** property (any status) records a visit with no visitor account (walk-in). Anything
else is 400 `propertyId: must be a published property`, whether or not it exists. Status is
`scheduled`.

### `GET /site-visits` — my visits

Query: `propertyId`, `status`, `visitType`, `visitDateFrom`, `visitDateTo` (inclusive),
`when=upcoming|past` (by visit date, property time zone), `relation=builder|assignee|visitor`,
`page` (0-based), `size` (max 100), `sort` (`visitDate` (also sorts by time), `createdAt`,
`updatedAt`, `nextFollowUp`, `status`; default `visitDate,desc`). Other sort fields are 400.

### `GET /site-visits/{id}`

### `PATCH /site-visits/{id}` — edit (fields per relation, see above)

```json
{ "visitDate": "2026-11-03", "visitTime": "16:00", "numberOfPeople": 5 }
```

Omitted fields keep their value; `null` clears optional ones.

### `PATCH /site-visits/{id}/status`

```json
{ "status": "cancelled", "cancellationReason": "Travelling" }
{ "status": "completed", "actualVisitDate": "2026-11-02T05:10:00Z" }
```

`status`: `confirmed`, `completed`, `cancelled`, `no_show`. `cancellationReason` only (and required)
for `cancelled`; `actualVisitDate` only for `completed`, not in the future.

### `PATCH /site-visits/{id}/assign` — builder only

```json
{ "assignId": 9 }
```

`null` unassigns.

### `POST /site-visits/{id}/report` — builder or assignee, completed visits, once

```json
{ "interest": "high", "visitNote": "Liked the clubhouse", "duration": 45, "visitedWith": "Spouse",
  "feedback": "Good", "rating": 5, "nextFollowUp": "2026-11-05T04:30:00Z", "followUpNote": "Send price sheet" }
```

`interest` is required (`low`, `medium`, `high`, `not_interested`); `duration` 1–1440 minutes;
`rating` 1–5; `nextFollowUp` after `actualVisitDate`. The whole report is replaced, so omitted fields
are cleared. The submitter is the caller.

## Admin endpoints

| Method and path | Permission |
|---|---|
| `GET /admin/site-visits` | `SITE_VISIT_LIST_ANY` |
| `POST /admin/site-visits` | `SITE_VISIT_CREATE_ANY` (+ `SITE_VISIT_ASSIGN_ANY` with `assignId`) |
| `GET /admin/site-visits/{id}` | `SITE_VISIT_VIEW_ANY` |
| `PATCH /admin/site-visits/{id}` | `SITE_VISIT_UPDATE_ANY` |
| `DELETE /admin/site-visits/{id}` (204, soft delete) | `SITE_VISIT_DELETE_ANY` |
| `PATCH /admin/site-visits/{id}/assign` | `SITE_VISIT_ASSIGN_ANY` |
| `PATCH /admin/site-visits/{id}/status` | `SITE_VISIT_UPDATE_STATUS_ANY` |
| `POST /admin/site-visits/{id}/report` | `SITE_VISIT_SUBMIT_REPORT_ANY` |

Bodies are the app bodies, plus on create: `userId` (active user), `assignId`, `leadId` (a lead the
caller can view), `nextFollowUp`, `followUpNote`. Any property that is not deleted can be used; the
builder always comes from the property.

List query: `search` (visitor name, email, mobile digits (3+), visit code), `propertyId`, `builderId`,
`assignId`, `userId`, `leadId`, `status`, `visitType`, `interest`, `visitDateFrom`, `visitDateTo`,
`nextFollowUpFrom`, `nextFollowUpTo`, plus the same paging and sorting as the app list.

There is no `PUT`: updates are partial (`PATCH`), like every other module.
