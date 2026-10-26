# Leads CRM API

Base path `/api/v1`. Interactive OpenAPI docs: `/swagger-ui.html` (dev profile only). Postman collection:
[`leads.postman_collection.json`](leads.postman_collection.json).

## Authentication and authorization

- Every endpoint needs `Authorization: Bearer <accessToken>`: app users from `POST /api/v1/auth/login`,
  staff from `POST /api/v1/admin/login`. Missing or invalid token: **401**.
- Permissions come from the user's role (`users.user_type` = `roles.slug`, JSON `roles.permissions`),
  loaded on every request, so role changes apply immediately. A role name grants nothing by itself;
  nothing in a request (body, query, path) can grant permissions or set the creator/actor.

| Permission (`roles.permissions` key) | Seeded for | Allows |
|---|---|---|
| `LEAD_CREATE` (`lead.create`) | user, admin | create leads |
| `LEAD_LIST`, `LEAD_VIEW`, `LEAD_UPDATE` (`lead.list/view/update`) | user | **own** leads only |
| `LEAD_DELETE` (`lead.delete`) | user | leads the caller **created** |
| `LEAD_LIST_ANY`, `LEAD_VIEW_ANY`, `LEAD_UPDATE_ANY`, `LEAD_DELETE_ANY` | admin | every lead |
| `LEAD_ASSIGN` (`lead.assign`) | admin | set/change the assignee (on create or via `/assign`) |
| `LEAD_ACCESS_ASSIGNED` (`lead.access_assigned`) | nobody | leads assigned to the caller count as their own (list, view, update, nested) |
| `LEAD_SCHEDULE_VIEW/CREATE/UPDATE/DELETE` (`lead_schedule.*`) | user, admin | schedules of leads the caller can view |
| `LEAD_INTERACTION_VIEW/CREATE/UPDATE/DELETE` (`lead_interaction.*`) | user, admin | interactions of leads the caller can view |

`/api/v1/admin/**` additionally requires `ADMIN_PANEL_ACCESS`. A custom role (e.g. a sales manager)
gets exactly what its JSON grants, e.g. `{"admin_panel": {"access": true}, "lead": {"list_any": true,
"view_any": true}, "lead_interaction": {"view": true}}` is a read-only auditor.

**Ownership.** A lead is *own* when `createdBy` is the caller, or when `assignedTo` is the caller and
they hold `LEAD_ACCESS_ASSIGNED`. Own leads, and all leads with `LEAD_VIEW_ANY`, are *visible*;
anything else is **404** (never 403), so ids cannot be probed. A visible lead without the permission
for the action is **403** `lead_action_forbidden`. Schedules and interactions are looked up by their id
**and** the lead id in the path, so a child id of another lead is 404. List queries apply the scope in
SQL, so `totalElements`, filters and search never include other users' leads.

**Assignees** (`assignedTo` on a lead or schedule) must be active accounts whose role lets them view
the lead once assigned: `LEAD_VIEW_ANY`, the creator with `LEAD_VIEW`, or `LEAD_ACCESS_ASSIGNED` +
`LEAD_VIEW`. Anyone else (unknown, deleted, suspended, plain app users) gets 400 `assignedTo: must be an
active user who can work on this lead`. Callers may always assign a schedule to themselves.

## Responses and errors

The project's standard format: success responses are the resource itself (no envelope); lists are
`{ "content": [...], "page": 0, "size": 20, "totalElements": 1, "totalPages": 1 }`. JSON fields are
camelCase. **Times** are ISO-8601 instants; requests may use `Z` or an offset
(`2026-11-01T10:00:00+05:30`), responses are always UTC (`2026-11-01T04:30:00Z`); convert to local time
in the client. Dates (`moveInDate`) are `yyyy-MM-dd`. Errors are RFC 9457 problem details with a `code`:

```json
{ "status": 400, "title": "Bad Request", "detail": "Validation failed", "code": "validation_failed",
  "errors": { "phone": "must be a valid phone number", "createdBy": "is not allowed" } }
```

| Status | When |
|---|---|
| 200 / 201 / 204 | read or update / created / deleted |
| 400 `validation_failed` | invalid body, query or path values (field -> message). **Unknown fields are rejected** (`is not allowed`), so `createdBy`, `interactedBy`, `id`, timestamps, ... cannot be sent. (The project uses 400, not 422, for validation.) |
| 401 | no or invalid token |
| 403 `lead_action_forbidden` | visible lead, missing permission; any request without the needed permission |
| 404 `lead_not_found`, `lead_schedule_not_found`, `lead_interaction_not_found` | not found or not visible |
| 409 `lead_invalid_status_transition`, `lead_schedule_not_editable` | state conflicts |
| 429 `rate_limited` | per-user rate limit, with `Retry-After` |
| 500 | unexpected; never contains internals |

**Rate limits (per user):** lead creation 120/h; all other lead, schedule and interaction writes 600/h.

## Leads — `/api/v1/leads`

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/leads` | `LEAD_CREATE` (+ `LEAD_ASSIGN` with `assignedTo`) | create (201) |
| GET | `/leads` | `LEAD_LIST_ANY` (all) or `LEAD_LIST` (own) | paged list |
| GET | `/leads/{id}` | `LEAD_VIEW` own / `LEAD_VIEW_ANY` | details |
| PATCH | `/leads/{id}` | `LEAD_UPDATE` own / `LEAD_UPDATE_ANY` | partial update |
| DELETE | `/leads/{id}` | `LEAD_DELETE` creator / `LEAD_DELETE_ANY` | soft delete (204) |
| PATCH | `/leads/{id}/assign` | `LEAD_ASSIGN` + visible lead | `{"assignedTo": 12}`; `null` unassigns |
| GET | `/admin/leads` | `ADMIN_PANEL_ACCESS` + `LEAD_LIST_ANY` | all leads (same parameters) |

### Fields

| Field | Type | Rules |
|---|---|---|
| `leadName` | string | **required**, max 150 |
| `phone` | string | **required**, any common format (default region India), stored E.164 (`+919876543210`) |
| `alternatePhone` | string | optional, same as phone |
| `email` | string | optional, valid email, max 255, stored lower-case |
| `purpose` | enum | **required**: `buy`, `rent`, `lease`, `sell` |
| `source` | enum | `website`, `facebook`, `instagram`, `referral`, `walk_in`, `phone_call`, `other` (default) |
| `status` | enum | `new` (default), `contacted`, `interested`, `qualified`, `site_visit_scheduled`, `negotiation`, `converted`, `lost`, `on_hold` |
| `priority` | enum | `low`, `medium` (default), `high`, `urgent` |
| `propertyType` | enum | `apartment`, `flat`, `villa`, `independent_house`, `plot`, `commercial`, `office`, `shop`, `other` |
| `bhk` | string | `studio`, `1rk`, or a bedroom count `1`-`99` with optional `.5` |
| `budgetMin`, `budgetMax` | number | >= 0, 2 decimals; `budgetMax >= budgetMin` |
| `budgetCurrency` | string | ISO 4217, default `INR` |
| `area` / `areaUnit` | number / enum | area > 0 needs a unit: `sq_ft`, `sq_m`, `acre`, `hectare` |
| `preferredLocation` | string | where the customer wants the property; max 500 |
| `location` | string | where the customer is now; max 255 |
| `possession` | enum | `ready_to_move`, `within_3_months`, `within_6_months`, `within_1_year`, `after_1_year`, `flexible` |
| `moveInDate` | date | `yyyy-MM-dd` |
| `floorPreference` | string | free text, max 50 |
| `facing` | enum | `north`, `south`, `east`, `west`, `north_east`, `north_west`, `south_east`, `south_west` |
| `furnishing` | enum | `furnished`, `semi_furnished`, `unfurnished` |
| `parking` | enum | `not_required`, `two_wheeler`, `four_wheeler`, `both` |
| `amenities` | string[] | up to 50 slugs from `GET /api/v1/amenities` (unknown slugs rejected, duplicates removed) |
| `loanRequired` | boolean | default `false` |
| `additionalNote` | string | max 5000 |
| `nextFollowUpAt` | instant | next planned contact |
| `lostReason` | string | max 500; **required when status is `lost`**, cleared when the status moves on |
| `assignedTo` | id | create only, needs `LEAD_ASSIGN`; afterwards use `/assign` |

Read-only: `id`, `createdBy` / `assignedTo` (`{"id": 7, "fullName": "Asha"}`, never contact details),
`lastContactedAt` (from interactions), `createdAt`, `updatedAt`.

**PATCH** semantics: omitted fields keep their value, explicit `null` clears optional fields and is
rejected for required ones. Cross-field rules are checked against the saved values.

**Status rules** (in `LeadStatus.canChangeTo`): a `converted` lead keeps that status (409
`lead_invalid_status_transition`); every other status, including `lost`, can move to any status.
Interaction outcomes never change the status.

### List parameters

`page` (0-based), `size` (default 20, capped at 100), `sort` = `createdAt|updatedAt|leadName|status|
nextFollowUpAt|lastContactedAt|budgetMax` with `,asc|desc` (default `createdAt,desc`; other properties
are 400). Filters: `search` (name or email substring, case-insensitive, or 3+ phone digits; max 100),
`status`, `priority`, `source`, `purpose`, `propertyType`, `assignedTo`, `createdBy`,
`preferredLocation` (substring), `budgetMin`/`budgetMax` (leads whose budget overlaps), `createdFrom`/
`createdTo`, `nextFollowUpFrom`/`nextFollowUpTo` (inclusive instants; end before start is 400).

### Example

```http
POST /api/v1/leads
{ "leadName": "Ravi Kumar", "phone": "98765 43210", "email": "ravi@example.com", "purpose": "buy",
  "source": "walk_in", "propertyType": "apartment", "bhk": "2", "budgetMin": 5000000, "budgetMax": 7500000,
  "preferredLocation": "Whitefield", "amenities": ["gymnasium"], "nextFollowUpAt": "2026-11-01T10:00:00+05:30" }
```

```json
201
{ "id": 101, "createdBy": { "id": 7, "fullName": "Alice" }, "assignedTo": null, "source": "walk_in",
  "status": "new", "priority": "medium", "purpose": "buy", "leadName": "Ravi Kumar", "phone": "+919876543210",
  "email": "ravi@example.com", "propertyType": "apartment", "bhk": "2", "budgetMin": 5000000,
  "budgetMax": 7500000, "budgetCurrency": "INR", "amenities": ["gymnasium"], "loanRequired": false,
  "lastContactedAt": null, "nextFollowUpAt": "2026-11-01T04:30:00Z", "createdAt": "2026-10-27T09:00:00Z", "...": "..." }
```

Deleting a lead is a soft delete: it disappears from every list and URL; its schedules and
interactions are kept in the database (and hidden with it). Lead creation is not idempotent: a
repeated submit creates a second lead (the same customer may legitimately enquire twice).

## Schedules — `/api/v1/leads/{leadId}/schedules`

The lead must be visible to the caller (404 otherwise); each endpoint needs its permission (403).

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `` | `LEAD_SCHEDULE_CREATE` | create a `pending` schedule (201) |
| GET | `` | `LEAD_SCHEDULE_VIEW` | paged; `status` filter; sort `scheduledAt` (default desc), `createdAt`, `updatedAt` |
| GET | `/{scheduleId}` | `LEAD_SCHEDULE_VIEW` | details |
| PATCH | `/{scheduleId}` | `LEAD_SCHEDULE_UPDATE` | edit, complete or cancel |
| POST | `/{scheduleId}/reschedule` | `LEAD_SCHEDULE_UPDATE` | `{"scheduledAt", "reminderAt", "reason"}`; returns the replacement (201) |
| DELETE | `/{scheduleId}` | `LEAD_SCHEDULE_DELETE` | soft delete (204); cancel instead to keep it visible |

Fields: `scheduleType` (**required**: `call`, `follow_up`, `meeting`, `site_visit`, `video_call`,
`other`), `title` (**required**, max 150), `description` (max 5000), `scheduledAt` (**required**
instant, past allowed), `durationMinutes` (1-1440), `location` (max 255), `assignedTo` (see assignees),
`reminderAt` (not after `scheduledAt`). Read-only: `createdBy`, `status`, `completedAt`,
`rescheduledFromId`, timestamps.

Lifecycle: `pending` -> `completed` (PATCH `{"status": "completed", "completionNote": "..."}`, sets
`completedAt`), `cancelled` (PATCH `{"status": "cancelled"}`) or `rescheduled` (POST `/reschedule`:
the original row keeps its time and gets `status: rescheduled` and the reason as `completionNote`; a
new pending row with `rescheduledFromId` is created, both in one transaction). Only pending schedules
change (409 `lead_schedule_not_editable`), except that a completed one accepts a corrected
`completionNote`. `scheduledAt` is not accepted by PATCH (use `/reschedule`).

## Interactions — `/api/v1/leads/{leadId}/interactions`

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `` | `LEAD_INTERACTION_CREATE` | record (201); the caller becomes `interactedBy` |
| GET | `` | `LEAD_INTERACTION_VIEW` | paged history; `type` filter; sort `interactionAt` (default desc) or `createdAt` |
| GET | `/{interactionId}` | `LEAD_INTERACTION_VIEW` | details |
| PATCH | `/{interactionId}` | `LEAD_INTERACTION_UPDATE` | partial update; `interactedBy` never changes |
| DELETE | `/{interactionId}` | `LEAD_INTERACTION_DELETE` | soft delete (204) |

Fields: `type` (**required**: `call`, `whatsapp`, `email`, `sms`, `meeting`, `site_visit`, `note`,
`other`), `interactionAt` (**required**; when it happened, not in the future beyond 5 minutes of clock
skew), `note` (max 10000; required for `note`), `outcome` (`interested`, `not_interested`, `no_answer`,
`follow_up_required`, `site_visit_planned`, `negotiation`, `converted`, `other`), `nextFollowUpAt` (not
before `interactionAt`), `durationSeconds` (0-86400). `createdAt` is when it was recorded.

Effects on the lead, in the same transaction with the lead row locked: `lastContactedAt` is always the
latest `interactionAt` of the remaining non-`note` interactions (recomputed on create, update and
delete); a `nextFollowUpAt` sent with an interaction becomes the lead's `nextFollowUpAt`.

## Audit

Creation, status changes, assignment, rescheduling and deletions are logged with ids only (lead,
actor, assignee), never customer details. A persistent activity log can subscribe once the
`activitylog` module exists.
