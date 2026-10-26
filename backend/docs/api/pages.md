# Pages API

Content pages (About us, Privacy policy, Terms and conditions, ...). Admin management under
`/api/v1/admin/pages`; published pages for the mobile app and website under `/api/v1/public/pages`.
Interactive docs: `/swagger-ui.html` (dev profile only).

JSON fields are camelCase, timestamps ISO-8601 UTC. Errors are RFC 9457 problem details with a stable
`code`; validation errors are **400** with an `errors` map of field → message.

## Visibility rule

A page is **public** only while `status = 'publish'`. The rule is part of every public database query
(list, counts and detail), so drafts are never loaded for public requests. Unpublishing or deleting a
page hides it on the next request; clients may keep a cached copy for up to 60 seconds
(`Cache-Control: max-age=60, public`). The server keeps no response cache.

`type` (`static` / `system`) is a label for the admin dashboard and clients. It does not change
permissions, visibility or routing: a published system page is public like any other, and system pages
need the same permissions to edit or delete.

## Permissions (admin endpoints)

Admin endpoints need an admin token (see [admin-auth.md](admin-auth.md)) whose role grants
`admin_panel.access` **and** the endpoint's own permission. The role is the row in `roles` whose
`slug` equals `users.user_type`; it must be active and not deleted. Permissions are loaded from the
role on every request, so revoking one, deactivating the role or changing `user_type` takes effect on
the next request. Nothing in the request (parameters, headers, body) can change who the caller is.

| `roles.permissions` key | Code | Allows |
|---|---|---|
| `page.view` | `PAGE_VIEW` | `GET` admin list and detail (drafts included) |
| `page.create` | `PAGE_CREATE` | `POST /admin/pages` (as draft) |
| `page.update` | `PAGE_UPDATE` | `PATCH /admin/pages/{id}` (every field except status) |
| `page.publish` | `PAGE_PUBLISH` | **in addition** to create/update: any status change — creating as `publish`, publishing or unpublishing |
| `page.delete` | `PAGE_DELETE` | `DELETE /admin/pages/{id}` (permanent) |

Migration `V202610261300__grant_page_permissions` grants all five to the `admin` role only.
`page.publish` alone opens no endpoint.

| Situation | Response |
|---|---|
| no token, invalid or expired token, logged-out session | 401 |
| app user (`user_type = 'user'`) | 403 |
| role without `admin_panel.access`, or without the endpoint's permission | 403 |
| `user_type` with no matching role, role inactive or deleted | 403 |
| status change without `PAGE_PUBLISH` | 403 `page_publish_forbidden` (nothing in the request is saved) |

Admin dashboard: hide Add/Edit/Delete/Publish controls the user's role does not grant (from the admin
login response's permissions), but the server enforces every rule above regardless.

## Fields

| Field | Rules |
|---|---|
| `heading` | required, plain text, trimmed, 1–255 characters. Not HTML: render it as text |
| `subHeading` | optional plain text, max 255; blank is stored as `null` |
| `slug` | lowercase letters and digits separated by single hyphens (`about-us`), max 255, unique. Optional on create: generated from the heading (`About Us & Team` → `about-us-and-team`, then `-2`, `-3`, ... when taken; `page` when the heading has no Latin letters or digits). A given slug is used as is; 409 `page_slug_taken` when another page has it. Never changed by a heading edit |
| `content` | required, max 100,000 characters, HTML. **Sanitized with an allow-list before it is stored**; 400 when no text or image is left |
| `type` | `static` (default) or `system` |
| `status` | `draft` (default) or `publish` |
| `metaTitle` | optional plain text, max 255 |
| `metaDescription` | optional plain text, max 1,000 |
| `metaKeywords` | optional plain text, max 1,000, comma-separated (`privacy, data protection`) |

`id`, `createdAt` and `updatedAt` are set by the server; sending them (or any other unknown field) is a
400 `is not allowed`. Optional text fields are trimmed; blank is stored as `null`.

### Content sanitization

Same allow-list as blog content. Kept: paragraphs, headings, inline formatting, lists, quotes, code,
tables, links (`http`, `https`, `mailto`; `rel="nofollow noopener noreferrer"` is always added) and
`https` images. Removed: `script`, `style`, `iframe`, `form`, `svg`, every `on*` handler,
`style`/`class` attributes, `javascript:`/`data:` and relative URLs. Responses contain the sanitized
HTML. Clients render it with their normal safe HTML view, never by evaluating it. `heading`,
`subHeading` and the meta fields are stored as sent (trimmed) and must be escaped when rendered.

## Admin endpoints

| Method | Path | Permission | Success |
|---|---|---|---|
| POST | `/api/v1/admin/pages` | `PAGE_CREATE` (+ `PAGE_PUBLISH` for `publish`) | 201 |
| GET | `/api/v1/admin/pages` | `PAGE_VIEW` | 200 |
| GET | `/api/v1/admin/pages/{id}` | `PAGE_VIEW` | 200 |
| PATCH | `/api/v1/admin/pages/{id}` | `PAGE_UPDATE` (+ `PAGE_PUBLISH` to change status) | 200 |
| DELETE | `/api/v1/admin/pages/{id}` | `PAGE_DELETE` | 204 |

Writes are limited to 120 per admin per hour (429 with `Retry-After`). Bodies must be
`application/json` (415 otherwise), max 1 MB.

### POST /api/v1/admin/pages

```json
{ "heading": "Privacy policy",
  "subHeading": "How we handle your data",
  "content": "<h2>What we collect</h2><p>See our <a href=\"https://example.com/contact\">contact page</a>.</p>",
  "type": "static", "status": "draft",
  "metaTitle": "Privacy policy | PropertyPro",
  "metaDescription": "What we collect and why.",
  "metaKeywords": "privacy, data protection" }
```

**201 Created**

```json
{
  "id": 1,
  "heading": "Privacy policy",
  "subHeading": "How we handle your data",
  "slug": "privacy-policy",
  "content": "<h2>What we collect</h2><p>See our <a href=\"https://example.com/contact\" rel=\"nofollow noopener noreferrer\">contact page</a>.</p>",
  "type": "static",
  "status": "draft",
  "metaTitle": "Privacy policy | PropertyPro",
  "metaDescription": "What we collect and why.",
  "metaKeywords": "privacy, data protection",
  "createdAt": "2026-10-26T12:00:00Z",
  "updatedAt": "2026-10-26T12:00:00Z"
}
```

```json
{ "status": 400, "title": "Bad Request", "detail": "Validation failed", "code": "validation_failed",
  "errors": { "type": "must be static or system" } }
```

```json
{ "status": 409, "title": "Conflict", "detail": "Another page already uses this slug.",
  "code": "page_slug_taken", "field": "slug" }
```

### GET /api/v1/admin/pages

Drafts and published pages. Items have no `content` or meta fields (use the detail).

| Parameter | Description |
|---|---|
| `search` | heading, sub heading or slug contains (case-insensitive, max 100; `%` and `_` are literal) |
| `status` | `draft` / `publish` |
| `type` | `static` / `system` |
| `page` | zero-based, default 0 |
| `size` | default 20, max 100 (larger values are capped) |
| `sort` | `field,asc` or `field,desc`, repeatable; `createdAt` (default, desc), `heading`, `slug`, `type`, `status`, `updatedAt`, `id`. `id` desc is appended as tiebreaker. Others → 400 |

```json
{
  "content": [
    { "id": 1, "heading": "Privacy policy", "subHeading": "How we handle your data", "slug": "privacy-policy",
      "type": "static", "status": "draft", "createdAt": "2026-10-26T12:00:00Z", "updatedAt": "2026-10-26T12:00:00Z" }
  ],
  "page": 0, "size": 20, "totalElements": 1, "totalPages": 1
}
```

### GET /api/v1/admin/pages/{id}

The full page (same shape as the create response). 404 `page_not_found` for unknown ids; 400 for a
non-numeric or out-of-range id.

### PATCH /api/v1/admin/pages/{id}

Partial update (JSON). Omitted fields keep their value. `null` clears `subHeading`, `metaTitle`,
`metaDescription` and `metaKeywords`, and is rejected (400) for `heading`, `slug`, `content`, `type` and
`status`. Sending the page's own slug or current status is not a change (no conflict, no
`PAGE_PUBLISH` needed). PUT is not offered (405).

```json
{ "slug": "privacy", "status": "publish", "metaKeywords": null }
```

**200 OK** with the updated page. 404 for unknown ids, including pages deleted before the update.

### DELETE /api/v1/admin/pages/{id}

Permanent delete (pages have no soft delete), for system pages too. **204 No Content**. Deleting it
again: 404 `page_not_found`. The admin UI should confirm first (showing the heading), and warn more
strongly for `system` pages, which clients may link to.

## Public endpoints (mobile app and website)

No authentication, GET only (writes are 401). Only published pages; anything else is a plain 404 that
does not reveal whether a draft exists. Responses never contain `id`, `type`, `status`, timestamps or
other admin data. Parameters other than those listed (`status`, `type`, `search`, `sort`,
`includeDrafts`, ...) are ignored.

### GET /api/v1/public/pages

Heading, sub heading and slug of published pages (no content), for menus and footers. Always ordered
by `heading`, then creation order. `page` (zero-based) and `size` (default 20, max 100).

```json
{
  "content": [
    { "heading": "About us", "subHeading": "Who we are", "slug": "about-us" },
    { "heading": "Privacy policy", "subHeading": null, "slug": "privacy-policy" }
  ],
  "page": 0, "size": 20, "totalElements": 2, "totalPages": 1
}
```

### GET /api/v1/public/pages/{slug}

```http
GET /api/v1/public/pages/privacy-policy
```

```json
{
  "heading": "Privacy policy",
  "subHeading": "How we handle your data",
  "slug": "privacy-policy",
  "content": "<h2>What we collect</h2><p>...</p>",
  "metaTitle": "Privacy policy | PropertyPro",
  "metaDescription": "What we collect and why.",
  "metaKeywords": "privacy, data protection"
}
```

404 `page_not_found` for drafts, unknown and malformed slugs alike. Use `metaTitle` (fallback
`heading`) for the document title and `metaDescription` for the description meta tag.

## Indexes

From `V202610261200`: unique `slug` (public detail and slug checks); `(status, type)` serves the
public list and the admin status and status + type filters; `(type)` the admin type filter. Text
search (`LIKE '%term%'`) is not indexed; it runs within the small pages table.

## Configuration

```yaml
app:
  http:
    large-json-body-paths: /api/v1/admin/blogs/, /api/v1/admin/pages
  rate-limit:
    page-write-user: { max-requests: 120, window: 1h }
```
