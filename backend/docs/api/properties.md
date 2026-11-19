# Property Management API

Base path `/api/v1`. Interactive OpenAPI docs: `/swagger-ui.html` (dev profile only).

## Authentication and authorization

- Every endpoint except `/api/v1/public/**` needs `Authorization: Bearer <accessToken>` from
  `POST /api/v1/auth/login`. Missing or invalid token: **401**.
- Permissions come from the user's role (`users.user_type` = `roles.slug`), loaded on every request.
  Nothing in the request (body, query, headers) can grant permissions or change the owner.

| Permission | Seeded for | Allows |
|---|---|---|
| `PROPERTY_CREATE` | user, admin | create properties (subject to subscription and limit) |
| `PROPERTY_CREATE_WITHOUT_SUBSCRIPTION` | admin | create without subscription or limit |
| `PROPERTY_LIST`, `PROPERTY_VIEW`, `PROPERTY_UPDATE`, `PROPERTY_DELETE` | user | own properties only |
| `PROPERTY_LIST_ANY`, `PROPERTY_VIEW_ANY`, `PROPERTY_UPDATE_ANY`, `PROPERTY_DELETE_ANY`, `PROPERTY_RESTORE_ANY` | admin | every owner's properties |
| `PROPERTY_REVIEW` | admin | approve / reject |
| `PROPERTY_PUBLISH` | admin | publish / unpublish |
| `PROPERTY_SUSPEND` | admin | suspend / resume |
| `PROPERTY_LEGAL_REVIEW` | admin | change the legal approval status |

New roles (e.g. a manager) get exactly the permissions in their `roles.permissions` JSON; a role
name grants nothing by itself. `/api/v1/admin/**` additionally requires `ADMIN_PANEL_ACCESS`.

**Ownership.** A property is visible to its owner and to holders of `PROPERTY_VIEW_ANY`. Anyone else
gets **404** (never 403), so ids cannot be probed. A visible property without the permission for the
action gets **403** `property_action_forbidden`. Apartments and media are always looked up through
their parent property, so a child id of another property is 404.

## Creating properties: eligibility and limits

`POST /properties` requires, checked on the server:

1. `PROPERTY_CREATE` (or `PROPERTY_CREATE_WITHOUT_SUBSCRIPTION`, which skips 4-5);
2. a verified email or phone (403 `account_verification_required`);
3. account status `active` (403 `account_inactive`);
4. a subscription in force: status `active` and `starts_at <= now < ends_at` (lifetime: no end).
   Otherwise 403 `subscription_required`, or `subscription_expired` if the last one ran out;
5. a free slot: the subscription's `no_of_properties` (copied from the plan; `null` = unlimited)
   must exceed the owner's non-deleted properties **in any status, drafts included**. Otherwise 403:

```json
{ "status": 403, "code": "property_limit_reached",
  "detail": "You have reached your property limit. Upgrade your subscription to add more properties.",
  "plan": "Basic", "propertyLimit": 5, "currentProperties": 5, "remainingProperties": 0 }
```

Editing never uses a slot. Deleting (soft delete) frees one; restoring a property needs one again.
The subscription row is locked during creation, so parallel requests cannot exceed the limit.

**Idempotency.** Send `Idempotency-Key: <8-100 chars [A-Za-z0-9_-]>` with a create. A retry with the
same key returns the original property with **200** instead of creating another one (409
`idempotency_key_reused` if that property was deleted).

## Responses and errors

Success responses are the resource itself (no envelope); JSON fields are camelCase, times ISO-8601 UTC.
Errors are RFC 9457 problem details with a stable `code`:

```json
{ "status": 400, "title": "Bad Request", "detail": "Validation failed", "code": "validation_failed",
  "errors": { "projectName": "must not be blank", "userId": "is not allowed" } }
```

| Status | When |
|---|---|
| 200 / 201 / 204 | read or update / created / deleted |
| 400 `validation_failed` | invalid fields (field -> message); **unknown fields are rejected** (`is not allowed`), so clients cannot send `userId`, `slug`, `publicationStatus`, `legalApprovalStatus`, ... |
| 401 | no or invalid token |
| 403 | missing permission, ineligible account or subscription, property limit |
| 404 | not found or not yours |
| 409 | `property_version_conflict`, `property_not_editable`, `property_invalid_status_transition`, media/apartment limits |
| 413 `file_too_large` | upload above the type's limit |
| 422 `property_incomplete` | submit/approve/publish with missing data (`missing`: step -> fields) |
| 429 | rate limit (`Retry-After` header) |

**Optimistic locking.** Property responses carry `ETag: "<version>"` and a `version` field. Send
`If-Match: "<version>"` on any write (including apartment, amenity, media and status changes); if
someone changed the property meanwhile you get 409 `property_version_conflict` with `currentVersion`.
Every change, including to children, increments the version.

**Rate limits (per user):** create 20/h, uploads 120/h, workflow actions and deletes 60/h, preview 120/15 min.

## Property lifecycle

Three independent statuses:

- `projectInfo.projectStatus` (construction): `upcoming`, `under_construction`, `ready_to_move`, `completed`, `on_hold`, `cancelled`. Set by the owner in step 4.
- `projectInfo.legalApprovalStatus`: `pending`, `approved`, `rejected`, `not_applicable`. Only `PROPERTY_LEGAL_REVIEW`.
- `publicationStatus`: the workflow below. Only `published` properties are public.

| Action | From | To | Who | Notes |
|---|---|---|---|---|
| `submit` | draft, rejected | pending_review | owner or `PROPERTY_UPDATE_ANY` | steps 1-6 complete |
| `approve` | pending_review | approved | `PROPERTY_REVIEW` | complete |
| `reject` | pending_review | rejected | `PROPERTY_REVIEW` | `reason` required, shown to owner |
| `publish` | approved | published | `PROPERTY_PUBLISH` | complete |
| `unpublish` | published | approved | `PROPERTY_PUBLISH` | |
| `suspend` | approved, published | suspended | `PROPERTY_SUSPEND` | `reason` required |
| `resume` | suspended | approved | `PROPERTY_SUSPEND` | publish again afterwards |
| `archive` | any except archived | archived | owner or `PROPERTY_UPDATE_ANY` | final, read-only |

Repeating an action whose target status the property already has succeeds without changes (safe
retries). Any other disallowed transition: 409. Owners cannot edit while `pending_review`,
`suspended` or `archived` (409 `property_not_editable`); an owner's edit of an `approved` or
`published` property sets it back to `draft` (logged as `reverted_to_draft`) until it is reviewed
again. Edits by `PROPERTY_UPDATE_ANY` never change the status. Every change is recorded in
`statusHistory` (admins also see `actorUserId`).

## Endpoints

### Properties — `/api/v1/properties`

| Method | Path | Description |
|---|---|---|
| POST | `/properties` and `/properties/drafts` | create a draft with step 1 (201; 200 for an idempotent retry) |
| GET | `/properties` | my properties (paged) |
| GET | `/properties/{id}` | full property |
| PATCH | `/properties/{id}` | sections `details`, `location`, `projectInfo`, `mediaSettings` in one atomic update |
| DELETE | `/properties/{id}` | soft delete (204); children and files are kept |
| GET | `/properties/{id}/wizard` | step completion |
| PATCH | `/properties/{id}/steps/1`, `/2`, `/4`, `/6` | save one step |
| GET | `/properties/{id}/preview` | full property incl. missing fields per step |
| POST | `/properties/{id}/submit` | submit for review |
| POST | `/properties/{id}/publish` | publish an approved property |
| PATCH | `/properties/{id}/status` | `{"action": "...", "reason": "..."}` |
| PATCH | `/properties/{id}/legal-status` | `{"status": "approved", "reason": "..."}` |

**List parameters:** `page` (0-based), `size` (max 100), `sort` = `createdAt|updatedAt|projectName|city|publishedAt` with `,asc|desc`
(default `updatedAt,desc`); filters `search` (name, builder, slug), `propertyType`, `city`, `state`,
`locality` (case-insensitive), `pincode`, `projectStatus`, `publicationStatus`, `createdFrom/To`,
`updatedFrom/To` (ISO-8601). `ownerId` and `deleted` are rejected here (admin list only). Response:

```json
{ "content": [ { "id": 101, "slug": "green-valley-residency", "projectName": "Green Valley Residency",
  "publicationStatus": "draft", "wizardStep": 3, "version": 4, "...": "..." } ],
  "page": 0, "size": 20, "totalElements": 1, "totalPages": 1 }
```

### Wizard steps

Partial updates (PATCH): an omitted field keeps its value; an explicit `null` clears an optional field
and is rejected (400) for a required one.

| Step | Endpoint | Fields |
|---|---|---|
| 1 Property details | `POST /properties`, `PATCH .../steps/1` | `propertyType` (apartment, villa, commercial), `projectName` (≤150), `builderCompanyName` (≤150), `reraNumber` (≤50), `gstNumber` (GSTIN, upper case), `projectEmail`, `projectPhone` (stored E.164, default region IN). The slug is generated from the name once and never changes. |
| 2 Location | `PATCH .../steps/2` | `projectAddress`, `city`, `locality`, `pincode` (6 digits), `state`, `landmark`, `latitude` (−90..90), `longitude` (−180..180) — both coordinates or neither; stored as given, not geocoded |
| 3 Unit types | `/properties/{id}/apartments` | see below |
| 4 Project information | `PATCH .../steps/4` | `totalTowersBlocks`, `totalUnitsFlats` (≥0), `projectStatus`, `landArea` (>0, needs `landAreaUnit`: sq_ft, sq_m, acre, hectare), `possessionStartDate` ≤ `possessionEndDate`, `projectDescription` (≤10 000), `projectHighlights` (≤20 strings of ≤200) |
| 5 Amenities | `PUT /properties/{id}/amenities` | `{"amenityIds": [1, 3, 5]}` |
| 6 Media | `/properties/{id}/media`, `PATCH .../steps/6` | uploads below; `threeDTourUrl` (https on matterport.com, kuula.co, momento360.com) |
| 7 Preview and submit | `GET .../preview`, `POST .../submit` | |

**Completion** is computed from saved data (clients cannot mark steps done): 1 always; 2 address,
city, locality, PIN code, state; 3 at least one configuration, each with an area range; 4 a project
description; 5 at least one amenity; 6 at least one photo; 7 submitted. `wizard.currentStep` is the
first incomplete step (7 when ready), also stored as `wizardStep` for lists.

```json
"wizard": { "propertyId": 101, "version": 4, "publicationStatus": "draft", "currentStep": 3,
  "completedSteps": [1, 2], "readyToSubmit": false,
  "steps": [ { "step": 3, "key": "apartments", "title": "Unit types and apartments",
               "complete": false, "missing": ["apartments"] }, "..." ] }
```

### Apartments (step 3) — `/api/v1/properties/{id}/apartments`

| Method | Path | Description |
|---|---|---|
| GET | `/apartments` | list |
| POST | `/apartments` | add one (201) |
| PUT | `/apartments` | save the complete set: `{"apartments": [ ... ]}` — items with `id` are updated, without `id` created, unlisted ones deleted; list order = display order; atomic |
| GET / PUT / DELETE | `/apartments/{apartmentId}` | one configuration (PUT replaces all its fields) |
| GET / PUT | `/apartments/{apartmentId}/amenities` | apartment-specific amenities |
| GET / POST | `/apartments/{apartmentId}/media` | list / upload `floor_plan_image`, `plan_pdf`, `photo` |
| PUT | `/apartments/{apartmentId}/media/order` | reorder |
| DELETE | `/apartments/{apartmentId}/media/{mediaId}` | delete |
| GET | `/apartments/{apartmentId}/media/{mediaId}/content` | download |

Fields: `apartmentName` (≤100), `apartmentType` (1bhk, 2bhk, 3bhk, 4bhk, penthouse — several per
property allowed), `startingPrice` (≥0), `currency` (default INR), `description`, `bedrooms`,
`bathrooms` (required, ≥0), `balconies`, `carParking` (default 0), `areaMin` > 0 and `areaMax` ≥
`areaMin` (required, the advertised range), optional measurements `carpetArea`, `builtUpArea`,
`superBuiltUpArea` (>0), `balconyArea` (≥0), `areaUnit` (sq_ft default, sq_m), `highlights`, `displayOrder`.
At most 50 configurations.

```json
{ "apartmentName": "2 BHK Type A", "apartmentType": "2bhk", "startingPrice": 7500000,
  "bedrooms": 2, "bathrooms": 2, "balconies": 1, "areaMin": 950, "areaMax": 1100, "carpetArea": 800,
  "highlights": ["Corner unit"] }
```

### Amenities and nearby places

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/amenities` | active amenity catalog (read-only for all users) |
| GET / PUT | `/api/v1/properties/{id}/amenities` | `{"amenityIds": [...]}`: active ids, no duplicates, max 100; replaces the set |
| GET / PUT | `/api/v1/properties/{id}/nearby-places` | `{"places": [{"placeName", "placeType", "distanceKm", "latitude", "longitude"}]}`, max 30; replaces the list |

Place types: school, hospital, shopping_mall, metro_station, railway_station, airport, bus_stop, other.
`distanceKm` 0–99 999.99. Distances are returned with `distanceSource: "manual"` (unverified).

### Media (step 6) — `/api/v1/properties/{id}/media`

| Method | Path | Description |
|---|---|---|
| GET | `/media` | list (sort order) |
| POST | `/media` (multipart) | `file` + `mediaType` (photo, video, brochure), optional `title`, `description`, `primary` |
| POST | `/media` (JSON) | external video `{"mediaType": "video", "url": "https://www.youtube.com/watch?v=..."}` |
| PATCH | `/media/{mediaId}` | `title`, `description`, `primary: true` (photos: becomes the cover) |
| PUT | `/media/order` | `{"mediaIds": [...]}` — every id once, in the new order |
| DELETE | `/media/{mediaId}` | delete (the file is removed after the deletion commits) |
| GET | `/media/{mediaId}/content` | download, same access rules as the property |

Upload rules: the real type is detected from the file's content (signature); client content type and
name are not trusted, and the extension must match the content. Photos JPEG/PNG/WebP ≤ 10 MB, video
MP4 ≤ 50 MB, brochure PDF ≤ 20 MB. Per property: 50 photos, 10 videos, 1 brochure; per apartment: 10
floor plans, 1 plan PDF, 20 photos. Files are stored privately under random keys; responses contain a
download `url`, never the storage path. The first photo becomes the cover; one cover per property.
External videos: https on youtube.com, youtu.be or vimeo.com only.

```bash
curl -X POST "$API/api/v1/properties/101/media" -H "Authorization: Bearer $TOKEN" \
  -F mediaType=photo -F title="Front view" -F file=@front.jpg
```

### Admin — `/api/v1/admin/properties` (needs `ADMIN_PANEL_ACCESS`)

The admin dashboard's HttpOnly session cookie is only sent to `/api/v1/admin/**`, so the dashboard
uses these routes. They call the same services as `/api/v1/properties/...`: ownership, editability,
workflow, subscription and rate-limit rules are identical. Writes from the cookie session need the
CSRF header (see `admin-auth.md`); `If-Match` and `Idempotency-Key` work as above.

Every route also needs `PROPERTY_VIEW_ANY`, because every property response here is the **admin
view**: it adds `owner` (id, name, email, phone) and `statusHistory[].actorUserId`, and media `url`s
point at the admin content routes below. Writes return the whole admin view of the property (not
the single child item), so the dashboard gets the new `version` in one response.

| Method | Path | Extra permission | Description |
|---|---|---|---|
| GET | `/admin/properties` | `PROPERTY_LIST_ANY` (not `_VIEW_ANY`) | all owners; extra filters `ownerId`, `deleted` = exclude (default), only, include. Items add `ownerId`, `deletedAt`, and the display extras `startingPrice` (lowest configuration price), `apartmentTypes` (distinct, display order) and `coverUrl` (primary photo, else the first; admin content path). Extras without a value are omitted |
| GET | `/admin/properties/stats` | `PROPERTY_LIST_ANY` (not `_VIEW_ANY`) | counts, see below |
| POST | `/admin/properties` | `PROPERTY_CREATE` | create a draft owned by the signed-in admin (201; 200 for an idempotent retry) |
| GET | `/admin/properties/{id}` | | admin view |
| PATCH | `/admin/properties/{id}` | (service: `PROPERTY_UPDATE_ANY` or owner) | several steps at once |
| DELETE | `/admin/properties/{id}` | (service: `PROPERTY_DELETE_ANY`) | soft delete (204) |
| POST | `/admin/properties/{id}/restore` | `PROPERTY_RESTORE_ANY` (not `_VIEW_ANY`) | undo a soft delete; needs a free slot in the owner's subscription |
| GET | `/admin/properties/{id}/wizard` | | step completion |
| PATCH | `/admin/properties/{id}/steps/1`, `/2`, `/4`, `/6` | (service: `PROPERTY_UPDATE_ANY`) | save one step |
| GET | `/admin/properties/{id}/preview` | | admin view incl. missing fields; preview rate limit |
| POST | `/admin/properties/{id}/submit` | (service: `PROPERTY_UPDATE_ANY`) | submit for review |
| POST | `/admin/properties/{id}/publish` | `PROPERTY_PUBLISH` | publish an approved property |
| PATCH | `/admin/properties/{id}/status` | (service: per action, see the lifecycle table) | `{"action": "...", "reason": "..."}` |
| PATCH | `/admin/properties/{id}/legal-status` | `PROPERTY_LEGAL_REVIEW` | `{"status": "approved", "reason": "..."}` |
| GET | `/admin/properties/amenities` | | active amenity catalog |
| PUT | `/admin/properties/{id}/apartments` | (service: `PROPERTY_UPDATE_ANY`) | step 3, the complete set (as `PUT /properties/{id}/apartments`) |
| PUT | `/admin/properties/{id}/amenities` | (service: `PROPERTY_UPDATE_ANY`) | step 5 |
| PUT | `/admin/properties/{id}/nearby-places` | (service: `PROPERTY_UPDATE_ANY`) | nearby places |
| POST | `/admin/properties/{id}/media` | (service: `PROPERTY_UPDATE_ANY`) | multipart upload, or JSON external video (201) |
| PATCH / DELETE | `/admin/properties/{id}/media/{mediaId}` | (service: `PROPERTY_UPDATE_ANY`) | title, description, cover / delete |
| PUT | `/admin/properties/{id}/media/order` | (service: `PROPERTY_UPDATE_ANY`) | reorder |
| GET | `/admin/properties/{id}/media/{mediaId}/content` | | download (the admin view's media `url`) |
| GET | `/admin/properties/{id}/apartments/{apartmentId}/media/{mediaId}/content` | | download a configuration's file |

"(service: ...)" means the permission is checked in the service, as for the app routes: a visible
property without it is 403 `property_action_forbidden`.

**Statistics** (`GET /admin/properties/stats`, one aggregate query). `total` and both maps count
non-deleted properties, so each map adds up to `total`; every status is present (0 when none).
`deleted` counts soft-deleted properties separately.

```json
{ "total": 26,
  "byPublicationStatus": { "draft": 4, "pending_review": 5, "approved": 5, "published": 6,
                           "rejected": 2, "suspended": 2, "archived": 2 },
  "byLegalApprovalStatus": { "pending": 7, "approved": 13, "rejected": 6, "not_applicable": 0 },
  "deleted": 1 }
```

### Public — `/api/v1/public/properties` (no login)

| Method | Path | Description |
|---|---|---|
| GET | `/public/properties` | published properties; `search`, `propertyType`, `city`, `state`, `locality`, `projectStatus`, `apartmentType`, `minPrice`, `maxPrice`; sort `publishedAt` (default), `projectName`, `city` |
| GET | `/public/properties/{slug}` | published property (no owner, GST, email or phone; no workflow data) |
| GET | `/public/properties/{slug}/media/{mediaId}/content` | public file download |
| GET | `/public/properties/{slug}/apartments/{apartmentId}/media/{mediaId}/content` | |

Each result carries `id` (use it as `propertyId` when booking a site visit), `startingPrice` (lowest apartment starting price, `null` if none), `apartmentTypes` (distinct types, display order) and `coverUrl` (primary photo, else the first photo; a public content path or an external URL, `null` if no photo). The detail response also carries `id`.

Drafts, pending, approved-but-unpublished, rejected, suspended, archived and deleted properties are 404.

## Workflows

**Owner (mobile app)**

```http
POST /api/v1/properties                       Idempotency-Key: 7f9c2e1a-create
{ "propertyType": "apartment", "projectName": "Green Valley Residency",
  "builderCompanyName": "Green Builders", "projectEmail": "sales@green.example.com",
  "projectPhone": "+91 98765 43210" }
-> 201, ETag: "1", { "id": 101, "slug": "green-valley-residency", "publicationStatus": "draft", ... }

PATCH /api/v1/properties/101/steps/2          If-Match: "1"
{ "projectAddress": "Plot 12, Baner Road", "city": "Pune", "locality": "Baner",
  "pincode": "411045", "state": "Maharashtra" }
PUT   /api/v1/properties/101/apartments       { "apartments": [ { ...2 BHK... }, { ...3 BHK... } ] }
PATCH /api/v1/properties/101/steps/4          { "projectStatus": "under_construction", "projectDescription": "..." }
PUT   /api/v1/properties/101/amenities        { "amenityIds": [1, 2, 7] }
POST  /api/v1/properties/101/media            (multipart photo)
GET   /api/v1/properties/101/preview          -> wizard.readyToSubmit = true
POST  /api/v1/properties/101/submit           -> publicationStatus "pending_review"
```

**Administrator (dashboard, cookie session + X-XSRF-TOKEN)**

```http
GET   /api/v1/admin/properties/stats
GET   /api/v1/admin/properties?publicationStatus=pending_review&sort=updatedAt,asc
GET   /api/v1/admin/properties/101
PATCH /api/v1/admin/properties/101/legal-status   If-Match: "7"  { "status": "approved", "reason": "RERA verified" }
PATCH /api/v1/admin/properties/101/status         If-Match: "8"  { "action": "approve" }
POST  /api/v1/admin/properties/101/publish        If-Match: "9"  -> publicationStatus "published"
# or
PATCH /api/v1/admin/properties/101/status         { "action": "reject", "reason": "Photos are blurry." }
```

Publishing does not require `legalApprovalStatus = approved`; the dashboard warns before publishing
when the legal review is still pending or rejected.
