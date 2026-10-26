# Blog categories API

Admin management under `/api/v1/admin/blog-categories`. Interactive docs: `/swagger-ui.html` (dev
profile only). Public category endpoints do not exist yet.

JSON fields are camelCase, timestamps ISO-8601 UTC. Errors are RFC 9457 problem details with a
stable `code`, as in the rest of the API; validation errors are **400** with an `errors` map.

## Permissions

Admin endpoints need an admin token (see [admin-auth.md](admin-auth.md)) whose role grants
`admin_panel.access` **and** the endpoint's own permission. The role is the row in `roles` whose
`slug` equals `users.user_type`; it must be active and not deleted. Permissions are loaded from the
role on every request (never cached), so revoking one, deactivating the role or changing `user_type`
takes effect on the next request. Nothing in the request (parameters, headers, body) can change who
the caller is.

| `roles.permissions` key | Code | Allows |
|---|---|---|
| `blog_category.view` | `BLOG_CATEGORY_VIEW` | `GET` list, detail and image download |
| `blog_category.create` | `BLOG_CATEGORY_CREATE` | `POST /admin/blog-categories` |
| `blog_category.update` | `BLOG_CATEGORY_UPDATE` | `PATCH /admin/blog-categories/{id}`, `PUT` and `DELETE /admin/blog-categories/{id}/image` |
| `blog_category.delete` | `BLOG_CATEGORY_DELETE` | `DELETE /admin/blog-categories/{id}` (soft delete) |

Migration `V202610251900__grant_blog_category_permissions` grants all four to the `admin` role
only. To give another role access, add `"blog_category": {"view": true, ...}` to its
`roles.permissions`; no code change.

| Situation | Response |
|---|---|
| no token, invalid or expired token, logged-out session | 401 |
| app user (`user_type = 'user'`) | 403 |
| role without `admin_panel.access`, or without the endpoint's permission | 403 |
| `user_type` with no matching role, role inactive or deleted | 403 |

## Fields

| Field | Rules |
|---|---|
| `title` | required, 1–255 characters, trimmed |
| `slug` | lowercase letters and digits separated by single hyphens (`home-loans`), max 255. Create: optional, generated from the title when omitted. Unique among **all** categories, soft-deleted ones included |
| `icon` | optional UI icon name, max 100: letters, digits, `_`, `:`, `-` (e.g. `home`, `mdi:home-city`). Not a URL, path or markup |
| `image` | optional upload: JPEG, PNG or WebP, max 10 MB, recognized by file content (the name and content type are not trusted). Stored privately under a random key; responses only contain `imageUrl` |
| `status` | `active` (default) or `inactive` |
| `metaTitle` | optional, max 255; blank is stored as empty (`null`) |
| `metaDescription` | optional, max 1000; blank is stored as empty (`null`) |

`id`, `blogCount`, `createdAt`, `updatedAt` and `deletedAt` are always set by the server.
`blogCount` counts the category's non-deleted blogs, drafts included.

### Slug policy

* **Create without `slug`:** generated from the title: `Home Loans & EMI` → `home-loans-and-emi`.
  If taken, a number is appended (`technology`, `technology-2`, `technology-3`, ...). Titles without
  Latin letters or digits get `category`, `category-2`, ...
* **Create or edit with `slug`:** used exactly as sent; **409** `blog_category_slug_taken` when any
  other category (deleted ones included) has it.
* **Editing the title never changes the slug**, so published category URLs keep working. Send
  `slug` to change the URL deliberately; there are no redirects from old slugs.
* Slugs of deleted categories are never reused, so an old URL can never point at a different category.

Slug assignment is serialized in the database (advisory lock), and the unique constraint
`uq_blog_categories_slug` is the final guard; a conflict is always reported as 409, never as 500.

## Endpoints

| Method | Path | Permission | Success |
|---|---|---|---|
| POST | `/api/v1/admin/blog-categories` | `BLOG_CATEGORY_CREATE` | 201 |
| GET | `/api/v1/admin/blog-categories` | `BLOG_CATEGORY_VIEW` | 200 |
| GET | `/api/v1/admin/blog-categories/{id}` | `BLOG_CATEGORY_VIEW` | 200 |
| PATCH | `/api/v1/admin/blog-categories/{id}` | `BLOG_CATEGORY_UPDATE` | 200 |
| PUT | `/api/v1/admin/blog-categories/{id}/image` | `BLOG_CATEGORY_UPDATE` | 200 |
| DELETE | `/api/v1/admin/blog-categories/{id}/image` | `BLOG_CATEGORY_UPDATE` | 200 |
| DELETE | `/api/v1/admin/blog-categories/{id}` | `BLOG_CATEGORY_DELETE` | 204 |
| GET | `/api/v1/admin/blog-categories/{id}/image/{fileName}` | `BLOG_CATEGORY_VIEW` | 200 (image) |

Writes are limited to 120 per admin per hour (429 with `Retry-After`; `app.rate-limit.blog-category-write-user`).

### POST /api/v1/admin/blog-categories

`multipart/form-data`: the fields above as form fields, plus an optional `image` file.

```bash
curl -X POST $API/admin/blog-categories -H "Authorization: Bearer $TOKEN" \
  -F title='Home Loans' -F icon=mdi:bank -F metaTitle='Home loan guides' \
  -F metaDescription='EMI, eligibility and tax benefits explained.' -F image=@home-loans.webp
```

**201 Created**

```json
{
  "id": 1,
  "title": "Home Loans",
  "slug": "home-loans",
  "icon": "mdi:bank",
  "imageUrl": "/api/v1/admin/blog-categories/1/image/3f6c1b2e-8a4d-4f0e-9a51-2b7c9d0e1f23.webp",
  "status": "active",
  "metaTitle": "Home loan guides",
  "metaDescription": "EMI, eligibility and tax benefits explained.",
  "blogCount": 0,
  "createdAt": "2026-10-26T12:00:00Z",
  "updatedAt": "2026-10-26T12:00:00Z"
}
```

| Status | `code` | When |
|---|---|---|
| 400 | `validation_failed` | missing/blank/too long title, invalid slug, icon or status, too long meta fields, file that is not a JPEG/PNG/WebP, empty file, or extension not matching the content |
| 409 | `blog_category_slug_taken` | the given `slug` is used by another category (also a deleted one) |
| 413 | `file_too_large` | image above 10 MB |

```json
{ "status": 400, "title": "Bad Request", "detail": "Validation failed", "code": "validation_failed",
  "errors": { "slug": "must be lowercase letters and digits separated by single hyphens" } }
```

```json
{ "status": 409, "title": "Conflict", "detail": "Another blog category already uses this slug.",
  "code": "blog_category_slug_taken", "field": "slug" }
```

Unknown multipart fields (`id`, `createdAt`, `deletedAt`, `image` as text, ...) are ignored. Nothing is
stored when a request fails: validation runs before the upload, and an upload whose transaction
fails is deleted.

### GET /api/v1/admin/blog-categories

Every non-deleted category, active and inactive. Two queries per page (categories, then their blog
counts), whatever the page size.

| Parameter | Description |
|---|---|
| `search` | title or slug contains (case-insensitive, max 100; `%` and `_` are literal) |
| `status` | `active` / `inactive` |
| `page` | zero-based, default 0 |
| `size` | default 20, max 100 (larger values are capped) |
| `sort` | `field,asc` or `field,desc`, repeatable; fields `createdAt` (default, desc), `updatedAt`, `title`, `slug`, `status`, `id`. Others → 400 |

The project-wide paging parameters are used instead of `per_page` / `sort_by` / `sort_order`:
`per_page=50&sort_by=title&sort_order=asc` is `size=50&sort=title,asc`. The `page` here is zero-based;
`totalPages` is the "last page" count.

```http
GET /api/v1/admin/blog-categories?status=active&search=loan&sort=title,asc&page=0&size=20
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

```json
{
  "content": [ { "id": 1, "title": "Home Loans", "slug": "home-loans", "blogCount": 12, "...": "..." } ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

### GET /api/v1/admin/blog-categories/{id}

Same shape as the create response. 404 `blog_category_not_found` for unknown or soft-deleted
categories; 400 for a non-numeric or out-of-range id.

### PATCH /api/v1/admin/blog-categories/{id}

Partial update (JSON). Omitted fields keep their value; `null` clears `icon`, `metaTitle` and
`metaDescription` and is rejected for `title`, `slug` and `status`. Unknown or protected fields (`id`,
`image`, `imageUrl`, `blogCount`, `createdAt`, `updatedAt`, `deletedAt`, ...) are rejected with 400.
Full replacement with PUT is not offered (405), as elsewhere in the API.

```http
PATCH /api/v1/admin/blog-categories/1
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{ "title": "Home Finance", "status": "inactive", "icon": null }
```

**200 OK** with the updated category (new `updatedAt`; the slug is still `home-loans`). 404 for
unknown or deleted categories; 409 `blog_category_slug_taken` when a new `slug` is taken.

### PUT /api/v1/admin/blog-categories/{id}/image

`multipart/form-data` with `image`; same file rules as create. **200 OK** with the category and its
new `imageUrl`. The old file is deleted after the change commits, and only if no category row
(deleted ones included) still references it. An invalid file leaves the current image untouched.

### DELETE /api/v1/admin/blog-categories/{id}/image

Removes the image (`imageUrl` becomes `null`); the file is deleted after commit under the same rule.
**200 OK** with the category, also when it had no image.

### DELETE /api/v1/admin/blog-categories/{id}

Soft delete: sets `deleted_at`; the row, its image file and its slug are kept. **204 No Content**.
The category then returns 404 everywhere and is not listed. Deleting it again: 404.

**Refused while in use.** While any non-deleted blog (draft or published) belongs to the category:

```json
{ "status": 409, "title": "Conflict", "detail": "The blog category is used by blogs. Move or delete them first.",
  "code": "blog_category_in_use", "blogCount": 2 }
```

Move those blogs to another category, or delete them, first. Blogs are never deleted or modified by
a category delete. Soft-deleted blogs do not block it and keep their `category_id` (the row still
exists, so the foreign key stays valid). The category row is locked during the check, so a blog
cannot be assigned to it between the check and the delete.

## Configuration

```yaml
app:
  rate-limit:
    blog-category-write-user: { max-requests: 120, window: 1h }
  media:
    max-image-size: 10MB   # shared with all other image uploads
```
