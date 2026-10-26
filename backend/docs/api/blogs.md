# Blogs API

Admin management under `/api/v1/admin/blogs`; published blogs and active categories for the mobile
app and website under `/api/v1/public/blogs` and `/api/v1/public/blog-categories`. Category
management: [blog-categories.md](blog-categories.md). Interactive docs: `/swagger-ui.html` (dev profile only).

JSON fields are camelCase, timestamps ISO-8601. Times may be sent with any offset
(`2026-11-01T09:00:00+05:30`) and are stored and returned in UTC. "Now" is always the server clock;
the device clock is never used. Errors are RFC 9457 problem details with a stable `code`; validation
errors are **400** with an `errors` map.

## Publication rules

| `status` | `publishedAt` | Public? |
|---|---|---|
| `draft` | anything (a planned time, or the last publication time) | never |
| `publish` | in the future | not yet: **scheduled**, appears automatically once reached |
| `publish` | now or in the past | yes, **if** its category is active and not deleted |

A blog is **publicly visible** when all of these hold, checked by one shared query rule
(`PublicBlogs.visible`) for the list, the category list, the detail and the image, so they can never
disagree:

```
status = 'publish' AND deleted_at IS NULL AND published_at <= now()
AND category exists, is active and is not deleted
```

* Publishing needs a category. A published blog always has a `publishedAt` (the database enforces it).
* Publishing a draft without `publishedAt` sets it to now. Send `publishedAt` to schedule (future) or
  backdate (past).
* Editing an already published blog keeps `publishedAt` unless you send a new one.
* Back to `draft`: hidden at once; `publishedAt` is kept (shown to admins) until changed.
* Blogs in an **inactive** category stay published but are hidden; admins see
  `publicState: "category_hidden"`. Categories cannot be deleted while blogs use them.

Admin responses include `publicState`, computed with the same rule: `draft`, `scheduled`, `live` or
`category_hidden`.

## Permissions (admin endpoints)

Admin endpoints need an admin token (see [admin-auth.md](admin-auth.md)) whose role grants
`admin_panel.access` **and** the endpoint's own permission. The role is the row in `roles` whose
`slug` equals `users.user_type`; it must be active and not deleted. Permissions are loaded from the
role on every request (never cached), so revoking one, deactivating the role or changing `user_type`
takes effect on the next request. Nothing in the request (parameters, headers, body) can change who
the caller is.

| `roles.permissions` key | Code | Allows |
|---|---|---|
| `blog.view` | `BLOG_VIEW` | `GET` admin list, detail and feature image |
| `blog.create` | `BLOG_CREATE` | `POST /admin/blogs` (draft or publish) |
| `blog.update` | `BLOG_UPDATE` | `PATCH /admin/blogs/{id}` (incl. publish/unpublish/schedule), feature image `PUT`/`DELETE` |
| `blog.delete` | `BLOG_DELETE` | `DELETE /admin/blogs/{id}` (soft delete) |

Migration `V202610252000__grant_blog_permissions` grants all four to the `admin` role only. Blog
category permissions (`blog_category.*`) do not include blogs, and the other way round.

| Situation | Response |
|---|---|
| no token, invalid or expired token, logged-out session | 401 |
| app user (`user_type = 'user'`) | 403 |
| role without `admin_panel.access`, or without the endpoint's permission | 403 |
| `user_type` with no matching role, role inactive or deleted | 403 |

Public endpoints need no token and are GET only; any write to `/api/v1/public/**` is 401.

## Fields

| Field | Rules |
|---|---|
| `title` | required, 1–255 characters, trimmed |
| `slug` | lowercase letters and digits separated by single hyphens, max 255. Optional on create (generated from the title). Unique among **all** blogs, deleted ones included |
| `content` | required, max 100,000 characters, HTML. **Sanitized with an allow-list before it is stored** (see below); 400 when nothing visible is left |
| `shortDescription` | optional plain text, max 1000; used in lists and as the SEO description fallback |
| `categoryId` | optional for drafts, required to publish; an existing, non-deleted category (it may be inactive) |
| `status` | `draft` (default) or `publish` |
| `publishedAt` | optional ISO-8601 instant; see publication rules |
| `metaTitle` | optional, max 255 (public fallback: `title`) |
| `metaDescription` | optional, max 1000 (public fallback: `shortDescription`) |
| `tags` | optional, max 20, each 1–50 characters: letters (any script), digits, spaces and `. _ & + # -`. Normalized: trimmed, inner spaces collapsed, lowercase, duplicates removed (`[" Home  Loans", "home loans"]` → `["home loans"]`). Stored as a JSON array |
| `featureImage` | optional upload: JPEG, PNG or WebP, max 10 MB, recognized by file content. Stored privately under a random key; responses only contain `featureImageUrl` |

`id`, `publicState`, `createdAt`, `updatedAt` and `deletedAt` are always set by the server. Blank
optional text (`"  "`) is stored as empty (`null`).

### Content sanitization

Kept: paragraphs, headings, `strong`/`em`/`u`/`sub`/`sup`, lists, `blockquote`, `pre`/`code`, tables,
links (`http`, `https`, `mailto`; `rel="nofollow noopener noreferrer"` is always added) and images with
`https` sources. Removed: `script`, `style`, `iframe`, `object`, `form`, `svg`, every `on*` event
handler, `style` attributes, `javascript:`/`data:`/`vbscript:` and relative URLs. The response contains
the sanitized HTML, so the editor shows exactly what is stored. Clients should still render it with
their normal HTML view, never by evaluating it.

### Slug policy

* Generated from the title when omitted: `Home Loan Guide 2026` → `home-loan-guide-2026`; taken →
  `-2`, `-3`, ...; titles without Latin letters or digits get `blog`, `blog-2`, ...
* A slug sent by the client is used exactly; **409** `blog_slug_taken` when any other blog (deleted
  ones included) has it.
* **Editing the title never changes the slug.** Changing `slug` changes the public URL immediately
  and the old URL returns 404; there are no redirects, so change slugs of published blogs only deliberately.
* Slug assignment is serialized in the database, and `uq_blogs_slug` is the final guard (always 409, never 500).

## Admin endpoints

| Method | Path | Permission | Success |
|---|---|---|---|
| POST | `/api/v1/admin/blogs` | `BLOG_CREATE` | 201 |
| GET | `/api/v1/admin/blogs` | `BLOG_VIEW` | 200 |
| GET | `/api/v1/admin/blogs/{id}` | `BLOG_VIEW` | 200 |
| PATCH | `/api/v1/admin/blogs/{id}` | `BLOG_UPDATE` | 200 |
| PUT | `/api/v1/admin/blogs/{id}/feature-image` | `BLOG_UPDATE` | 200 |
| DELETE | `/api/v1/admin/blogs/{id}/feature-image` | `BLOG_UPDATE` | 200 |
| DELETE | `/api/v1/admin/blogs/{id}` | `BLOG_DELETE` | 204 |
| GET | `/api/v1/admin/blogs/{id}/feature-image/{fileName}` | `BLOG_VIEW` | 200 (image) |

Writes are limited to 300 per admin per hour (429 with `Retry-After`). JSON bodies on
`/api/v1/admin/blogs/**` may be up to 1 MB (long articles); every other JSON endpoint keeps 64 KB.

### POST /api/v1/admin/blogs

`multipart/form-data`: the fields above as form fields (repeat `tags` for several), plus an optional
`featureImage` file.

```bash
curl -X POST $API/admin/blogs -H "Authorization: Bearer $TOKEN" \
  -F title='Home Loan Guide 2026' -F categoryId=1 -F status=publish \
  -F publishedAt=2026-11-01T09:00:00+05:30 \
  -F shortDescription='Eligibility, EMI and tax benefits.' \
  -F content='<h2>Eligibility</h2><p>Check your CIBIL score first.</p>' \
  -F tags='home loans' -F tags=tax -F metaTitle='Home loan guide (2026)' \
  -F featureImage=@cover.webp
```

**201 Created**

```json
{
  "id": 12,
  "title": "Home Loan Guide 2026",
  "slug": "home-loan-guide-2026",
  "featureImageUrl": "/api/v1/admin/blogs/12/feature-image/3f6c1b2e-8a4d-4f0e-9a51-2b7c9d0e1f23.webp",
  "category": { "id": 1, "title": "Home Loans", "slug": "home-loans", "status": "active" },
  "shortDescription": "Eligibility, EMI and tax benefits.",
  "content": "<h2>Eligibility</h2><p>Check your CIBIL score first.</p>",
  "status": "publish",
  "publicState": "scheduled",
  "publishedAt": "2026-11-01T03:30:00Z",
  "metaTitle": "Home loan guide (2026)",
  "metaDescription": null,
  "tags": ["home loans", "tax"],
  "createdAt": "2026-10-26T12:00:00Z",
  "updatedAt": "2026-10-26T12:00:00Z"
}
```

| Status | `code` | When |
|---|---|---|
| 400 | `validation_failed` | missing/invalid/too long field, unknown or deleted category, `publish` without a category, malformed tag, content with nothing safe left, file that is not a JPEG/PNG/WebP |
| 409 | `blog_slug_taken` | the given `slug` is used by another blog (also a deleted one) |
| 413 | `file_too_large` | image above 10 MB |

```json
{ "status": 400, "title": "Bad Request", "detail": "Validation failed", "code": "validation_failed",
  "errors": { "categoryId": "is required to publish" } }
```

Unknown multipart fields (`id`, `createdAt`, `deletedAt`, `publicState`, ...) are ignored. Nothing is
stored when a request fails: validation runs before the upload, and an upload whose transaction
fails is deleted.

### GET /api/v1/admin/blogs

Every non-deleted blog: drafts, scheduled, live and category-hidden ones. Items have no `content`,
`metaTitle` or `metaDescription` (use the detail for the editor). Two queries per page (blogs, then their categories).

| Parameter | Description |
|---|---|
| `search` | title or slug contains (case-insensitive, max 100; `%` and `_` are literal) |
| `status` | `draft` / `publish` |
| `categoryId` | positive id |
| `tag` | one tag, normalized like stored tags (`TAX` matches `tax`) |
| `publishedFrom`, `publishedTo`, `createdFrom`, `createdTo` | inclusive ISO-8601 bounds |
| `page` | zero-based, default 0 |
| `size` | default 20, max 100 (larger values are capped) |
| `sort` | `field,asc` or `field,desc`, repeatable; fields `createdAt` (default, desc), `updatedAt`, `publishedAt`, `title`, `slug`, `status`, `id`. Others → 400 |

The project-wide paging parameters are used instead of `per_page` / `sort_by` / `sort_order`:
`per_page=50&sort_by=published_at&sort_order=desc` is `size=50&sort=publishedAt,desc`. `totalPages`
is the last-page count (pages are zero-based).

```json
{
  "content": [
    {
      "id": 12, "title": "Home Loan Guide 2026", "slug": "home-loan-guide-2026",
      "featureImageUrl": "/api/v1/admin/blogs/12/feature-image/3f6c1b2e-....webp",
      "category": { "id": 1, "title": "Home Loans", "slug": "home-loans", "status": "active" },
      "shortDescription": "Eligibility, EMI and tax benefits.",
      "status": "publish", "publicState": "scheduled", "publishedAt": "2026-11-01T03:30:00Z",
      "tags": ["home loans", "tax"], "createdAt": "2026-10-26T12:00:00Z", "updatedAt": "2026-10-26T12:00:00Z"
    }
  ],
  "page": 0, "size": 20, "totalElements": 1, "totalPages": 1
}
```

### GET /api/v1/admin/blogs/{id}

The full blog (same shape as the create response), drafts included. 404 `blog_not_found` for unknown
or soft-deleted blogs; 400 for a non-numeric or out-of-range id.

### PATCH /api/v1/admin/blogs/{id}

Partial update (JSON). Omitted fields keep their value. `null` clears `shortDescription`, `metaTitle`,
`metaDescription`, `tags`, and (drafts only) `categoryId` and `publishedAt`; it is rejected for
`title`, `slug`, `content` and `status`. Status, `publishedAt` and category are validated on the
merged result. Unknown or protected fields (`id`, `featureImage`, `featureImageUrl`, `publicState`,
`createdAt`, `updatedAt`, `deletedAt`, ...) are rejected with 400. PUT is not offered (405), as
elsewhere in the API.

| Request | Result |
|---|---|
| `{"status":"publish"}` on a draft | live now (category required) |
| `{"status":"publish","publishedAt":"2026-12-01T00:00:00Z"}` | scheduled |
| `{"publishedAt":"..."}` on a published blog | rescheduled / backdated |
| `{"status":"draft"}` | hidden immediately; `publishedAt` kept |
| `{"publishedAt":null}` on a published blog | 400 |
| `{"categoryId":null}` on a published blog | 400 `categoryId: is required to publish` |
| `{"slug":"new-url"}` | public URL changes; old URL 404 |

**200 OK** with the updated blog (new `updatedAt`). 404 for unknown or deleted blogs.

### Feature image

`PUT /api/v1/admin/blogs/{id}/feature-image` (`multipart/form-data` with `featureImage`) replaces it;
`DELETE` removes it. **200 OK** with the blog. The old file is deleted after the change commits, and
only if no blog row (deleted ones included) still references it. An invalid file leaves the current
image untouched.

### DELETE /api/v1/admin/blogs/{id}

Soft delete: sets `deleted_at`; the row, its feature image and its slug are kept, the category is
not touched. **204 No Content**. The blog then returns 404 everywhere (admin and public) and is not
listed. Deleting it again: 404.

## Public endpoints (mobile app and website)

No authentication, GET only. Only publicly visible blogs (see publication rules) and active
categories are ever returned; anything else is a plain 404 that does not reveal whether it exists.
Status, timestamps other than `publishedAt`, deletion data, category ids/status and storage keys are
never returned. Responses carry `Cache-Control: max-age=60, public`, so publishing, unpublishing,
scheduled times and deletions reach clients within a minute (images: one hour; their URLs change when
the image is replaced). Parameters other than those listed (`status`, `sort`, `includeDrafts`, ...)
are ignored.

### GET /api/v1/public/blogs

| Parameter | Description |
|---|---|
| `search` | title or short description contains (case-insensitive, max 100) |
| `category` | category slug (an unknown or inactive one gives an empty list) |
| `tag` | one tag, normalized like stored tags |
| `page`, `size` | zero-based page, size default 20, max 100 |

Newest publication first (`publishedAt` desc, then id). Invalid `category` format or malformed `tag` → 400.

```http
GET /api/v1/public/blogs?category=home-loans&tag=tax&page=0&size=20
```

```json
{
  "content": [
    {
      "id": 12,
      "title": "Home Loan Guide 2026",
      "slug": "home-loan-guide-2026",
      "featureImageUrl": "/api/v1/public/blogs/home-loan-guide-2026/feature-image/3f6c1b2e-....webp",
      "shortDescription": "Eligibility, EMI and tax benefits.",
      "category": { "title": "Home Loans", "slug": "home-loans" },
      "tags": ["home loans", "tax"],
      "publishedAt": "2026-11-01T03:30:00Z",
      "metaTitle": "Home loan guide (2026)",
      "metaDescription": "Eligibility, EMI and tax benefits."
    }
  ],
  "page": 0, "size": 20, "totalElements": 1, "totalPages": 1
}
```

No visible blogs: `200` with `"content": []`.

### GET /api/v1/public/blogs/{slug}

The list fields plus `content` (sanitized HTML). 404 `blog_not_found` for drafts, scheduled, deleted
and category-hidden blogs, unknown slugs and malformed slugs alike (slugs are matched exactly, they are
not case-normalized). There is no public preview of drafts; admins use the admin detail endpoint.

```json
{ "status": 404, "title": "Not Found", "detail": "Blog not found.", "code": "blog_not_found" }
```

### GET /api/v1/public/blogs/{slug}/feature-image/{fileName}

The `featureImageUrl` of a visible blog; 404 otherwise. Served with `X-Content-Type-Options: nosniff`.

### GET /api/v1/public/blog-categories

Active, non-deleted categories by title: `id`, `title`, `slug`, `icon`, `imageUrl`, `metaTitle`
(fallback: title), `metaDescription`. Paged like the blog list.

### GET /api/v1/public/blog-categories/{slug}/blogs

The category's visible blogs, same shape, rules and order as `GET /api/v1/public/blogs`. 404
`blog_category_not_found` when the category is unknown, inactive or deleted.

### GET /api/v1/public/blog-categories/{slug}/image/{fileName}

The `imageUrl` of an active category; 404 otherwise.

## Indexes

From `V202610251810`: unique `slug`; `category_id`; `(status, created_at)`; partial
`(published_at DESC, id DESC)` and `(category_id, published_at DESC)` for published, non-deleted rows,
which serve the public feeds. `V202610252010` adds `created_at` and `published_at` for the admin
filters and sorts. Text search (`ILIKE '%term%'`) and the tag filter are not indexed; both run within
the indexed feed or the small admin table.

## Configuration

```yaml
app:
  rate-limit:
    blog-write-user: { max-requests: 300, window: 1h }
  http:
    large-json-body-paths: /api/v1/admin/blogs/
    max-large-json-body-size: 1MB
  media:
    max-image-size: 10MB   # shared with all other image uploads
```
