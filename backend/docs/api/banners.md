# Banners API

Admin management under `/api/v1/admin/banners`; live banners for the mobile app and website under
`/api/v1/public/banners`. Interactive docs: `/swagger-ui.html` (dev profile only).

JSON fields are camelCase, timestamps ISO-8601. Dates may be sent with any offset
(`2026-11-01T00:00:00+05:30`) and are stored and returned in UTC (`2026-10-31T18:30:00Z`). "Now" is
always the server clock; the device clock is never used.

## Permissions

Admin endpoints need an admin token (see [admin-auth.md](admin-auth.md)) whose role grants
`admin_panel.access` **and** the endpoint's own permission. The role is the row in `roles` whose
`slug` equals `users.user_type`; it must be active and not deleted. Permissions are loaded from the
role on every request, so revoking one, deactivating the role or changing `user_type` takes effect on
the next request. Nothing in the request (parameters, headers, body) can change who the caller is.

| `roles.permissions` key | Code | Allows |
|---|---|---|
| `banner.list` | `BANNER_LIST` | `GET /admin/banners` |
| `banner.view` | `BANNER_VIEW` | `GET /admin/banners/{id}`, admin image download |
| `banner.create` | `BANNER_CREATE` | `POST /admin/banners` (inactive banners) |
| `banner.update` | `BANNER_UPDATE` | `PATCH /admin/banners/{id}`, `PUT /admin/banners/{id}/image` |
| `banner.change_status` | `BANNER_CHANGE_STATUS` | additionally needed to create an active banner or change any status |
| `banner.delete` | `BANNER_DELETE` | `DELETE /admin/banners/{id}` (soft delete) |

Migration `V202610251710__grant_banner_permissions` grants all six to the `admin` role only. To give
another role access, add `"banner": {"list": true, ...}` to its `roles.permissions`; no code change.

| Situation | Response |
|---|---|
| no token, invalid or expired token, logged-out session | 401 |
| app user (`user_type = 'user'`) | 403 |
| role without `admin_panel.access`, or without the endpoint's permission | 403 |
| `user_type` with no matching role, role inactive or deleted | 403 |
| status change without `BANNER_CHANGE_STATUS` | 403 `banner_status_change_forbidden` |

## Fields

| Field | Rules |
|---|---|
| `title` | required, 1–255 characters, trimmed |
| `type` | required, one of `app.banner.types` (default `promotion`, `announcement`, `offer`) |
| `placement` | required, one of `app.banner.placements` (default `home_top`, `home_middle`, `property_list`, `property_detail`) |
| `linkType` | `internal` or `external`; given together with `link`, or both omitted (no link) |
| `link` | max 2048. **internal**: a path inside an allowed app route (`app.banner.internal-link-prefixes`, e.g. `/offers/diwali`, `/properties/42?ref=banner`); `//host`, `..`, backslashes, fragments and unknown routes are rejected. **external**: `https://` only, no credentials, default port; `http:`, `javascript:`, `data:` etc. are rejected |
| `image` | upload: JPEG, PNG or WebP, max 10 MB, recognized by file content (the name and content type are not trusted). Stored privately under a random key; responses only contain `imageUrl` |
| `status` | `active` or `inactive`; default `inactive` |
| `startDate`, `endDate` | optional ISO-8601 instants, both inclusive; `endDate` must not be before `startDate` |

`id`, `createdAt`, `updatedAt` and `deleteAt` are always set by the server.

**Displayed** (public list) when: `status = active` AND not deleted AND (`startDate` is empty or
≤ now) AND (`endDate` is empty or ≥ now). Admin responses show this as `displayState`: `inactive`,
`scheduled` (start in the future), `live` or `expired`.

## Admin endpoints

| Method | Path | Permission | Success |
|---|---|---|---|
| POST | `/api/v1/admin/banners` | `BANNER_CREATE` (+ `BANNER_CHANGE_STATUS` if not inactive) | 201 |
| GET | `/api/v1/admin/banners` | `BANNER_LIST` | 200 |
| GET | `/api/v1/admin/banners/{id}` | `BANNER_VIEW` | 200 |
| PATCH | `/api/v1/admin/banners/{id}` | `BANNER_UPDATE` (+ `BANNER_CHANGE_STATUS` to change status) | 200 |
| PUT | `/api/v1/admin/banners/{id}/image` | `BANNER_UPDATE` | 200 |
| DELETE | `/api/v1/admin/banners/{id}` | `BANNER_DELETE` | 204 |
| GET | `/api/v1/admin/banners/{id}/image/{fileName}` | `BANNER_VIEW` | 200 (image) |

Writes are limited to 120 per admin per hour (429 with `Retry-After`).

### POST /api/v1/admin/banners

`multipart/form-data`: the `image` file plus the fields above as form fields.

```bash
curl -X POST $API/admin/banners -H "Authorization: Bearer $TOKEN" \
  -F image=@diwali.webp -F title='Diwali sale' -F type=offer -F placement=home_top \
  -F linkType=internal -F link=/offers/diwali -F status=active \
  -F startDate=2026-11-01T00:00:00+05:30 -F endDate=2026-11-15T23:59:59+05:30
```

**201 Created**

```json
{
  "id": 1,
  "title": "Diwali sale",
  "type": "offer",
  "placement": "home_top",
  "linkType": "internal",
  "link": "/offers/diwali",
  "imageUrl": "/api/v1/admin/banners/1/image/3f6c1b2e-8a4d-4f0e-9a51-2b7c9d0e1f23.webp",
  "status": "active",
  "displayState": "scheduled",
  "startDate": "2026-10-31T18:30:00Z",
  "endDate": "2026-11-15T18:29:59Z",
  "createdAt": "2026-10-25T12:00:00Z",
  "updatedAt": "2026-10-25T12:00:00Z"
}
```

Errors (RFC 9457 problem details, as in the rest of the API):

| Status | `code` | When |
|---|---|---|
| 400 | `validation_failed` | missing or invalid field, unsupported type/placement/status, unsafe link, `endDate` before `startDate`, missing image, file that is not a JPEG/PNG/WebP or whose extension does not match its content |
| 403 | `banner_status_change_forbidden` | `status` other than `inactive` without `BANNER_CHANGE_STATUS` |
| 413 | `file_too_large` | image above 10 MB |

```json
{ "status": 400, "title": "Bad Request", "detail": "Validation failed", "code": "validation_failed",
  "errors": { "link": "must be an https URL without credentials" } }
```

Nothing is stored when a request fails: validation runs before the upload, and an upload whose
transaction fails is deleted.

### GET /api/v1/admin/banners

Every non-deleted banner, including inactive, scheduled and expired ones.

| Parameter | Description |
|---|---|
| `search` | title contains (case-insensitive, max 100; `%` and `_` are literal) |
| `status` | `active` / `inactive` |
| `type`, `placement` | exact value (format-checked, so retired values can still be found) |
| `linkType` | `internal` / `external` |
| `startDateFrom`, `startDateTo`, `endDateFrom`, `endDateTo` | inclusive ISO-8601 bounds |
| `page` | zero-based, default 0 |
| `size` | default 20, max 100 (larger values are capped) |
| `sort` | `field,asc` or `field,desc`; fields `createdAt` (default, desc), `updatedAt`, `title`, `type`, `placement`, `status`, `startDate`, `endDate`. Others → 400 |

```http
GET /api/v1/admin/banners?status=active&placement=home_top&sort=startDate,asc&page=0&size=20
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

```json
{
  "content": [ { "id": 1, "title": "Diwali sale", "...": "..." } ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

### GET /api/v1/admin/banners/{id}

Same shape as the create response. 404 `banner_not_found` for unknown or soft-deleted banners;
400 for a non-numeric id.

### PATCH /api/v1/admin/banners/{id}

Partial update (JSON). Omitted fields keep their value; `null` clears `linkType`, `link`,
`startDate` and `endDate` and is rejected for `title`, `type`, `placement` and `status`. The link pair
and the schedule are checked on the merged result, so changing `linkType` to `external` while the
saved link is an internal path is rejected. Unknown or protected fields (`id`, `image`, `createdAt`,
`updatedAt`, `deleteAt`, ...) are rejected with 400. The image has its own endpoint. PUT
(full replacement) is not offered; the project uses PATCH for edits.

```http
PATCH /api/v1/admin/banners/1
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{ "title": "Diwali mega sale", "endDate": "2026-11-20T18:29:59Z" }
```

**200 OK** with the updated banner (new `updatedAt`). 404 for unknown or deleted banners.

```json
{ "status": 403, "title": "Forbidden", "detail": "You are not allowed to change the status of banners.",
  "code": "banner_status_change_forbidden" }
```

### PUT /api/v1/admin/banners/{id}/image

`multipart/form-data` with `image`; same file rules as create. **200 OK** with the banner and its
new `imageUrl`. The old file is deleted after the change commits, and only if no banner row (deleted
ones included) still references it. An invalid file leaves the current image untouched.

### DELETE /api/v1/admin/banners/{id}

Soft delete: sets `delete_at`; the row and its image file are kept. **204 No Content**. The banner
then returns 404 everywhere, is not listed, and is never shown publicly. Deleting it again: 404.

## Public endpoints (mobile app and website)

No authentication, GET only. Administrative fields (status, timestamps, deletion, storage keys) are
never returned.

### GET /api/v1/public/banners

| Parameter | Description |
|---|---|
| `placement` | optional, must be a configured placement (otherwise 400) |
| `page`, `size` | as above (default 20, max 100) |

Only live banners (see **Displayed** above), ordered by placement, then newest first. Every other
parameter, including `status`, `sort` or anything about deletion, is ignored. Responses carry
`Cache-Control: max-age=60, public`, so activation, expiry and deletion reach clients within a minute.

```http
GET /api/v1/public/banners?placement=home_top
```

```json
{
  "content": [
    {
      "id": 1,
      "title": "Diwali sale",
      "type": "offer",
      "placement": "home_top",
      "linkType": "internal",
      "link": "/offers/diwali",
      "imageUrl": "/api/v1/public/banners/1/image/3f6c1b2e-8a4d-4f0e-9a51-2b7c9d0e1f23.webp",
      "startDate": "2026-10-31T18:30:00Z",
      "endDate": "2026-11-15T18:29:59Z"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

No live banners: `200` with `"content": []`.

### GET /api/v1/public/banners/{id}/image/{fileName}

The `imageUrl` of a live banner. 404 when the banner is inactive, scheduled, expired or deleted, or
the file name is not its current image. The URL changes whenever the image is replaced, so responses
are cacheable for an hour (`Cache-Control: max-age=3600, public`). Served with
`X-Content-Type-Options: nosniff`.

## Configuration

```yaml
app:
  banner:
    types: promotion, announcement, offer
    placements: home_top, home_middle, property_list, property_detail
    internal-link-prefixes: /, /properties, /projects, /offers, /blogs, /pages, /faqs, /subscription-plans
  rate-limit:
    banner-write-user: { max-requests: 120, window: 1h }
```

Values must be lowercase snake_case (types, placements) or lowercase route paths; the app refuses to
start otherwise. `/` allows the home page only, not every path. Removing a value does not change
existing banners, but they must be given a supported value the next time that field is edited.
