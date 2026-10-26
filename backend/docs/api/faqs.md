# FAQs API

Admin management under `/api/v1/admin/faqs`; published FAQs and the configured categories for the
mobile app and website under `/api/v1/public/faqs` and `/api/v1/public/faq-categories`.
Interactive docs: `/swagger-ui.html` (dev profile only).

JSON fields are camelCase, timestamps ISO-8601 UTC. Errors are RFC 9457 problem details with a stable
`code`; validation errors are **400** with an `errors` map of field → message.

## Visibility rule

A FAQ is **public** only when both hold, checked inside the database query by one shared rule
(`PublicFaqs.visible`) for the list, the category filter, search, the counts and the detail:

```
status = 'publish' AND category IN (<keys in app.faq.categories>)
```

Drafts are never returned publicly, not even in `totalElements`. A FAQ whose category was removed
from the configuration is kept, still visible to admins (with `categoryLabel: null`) and hidden from
public endpoints until an admin moves it to a configured category.

Order everywhere it is displayed: `sortOrder` ascending, then `id` ascending. Equal sort orders are allowed.

## Categories (configuration)

Categories are **not** stored in the database and have no CRUD endpoints. The single source of truth
is `app.faq.categories` in `src/main/resources/application.yml` (key → label, in display order):

```yaml
app:
  faq:
    categories:
      general: General
      billing: Billing & Payments
      technical: Technical Support
```

* Keys are lowercase snake_case (max 50), stored in `faqs.category`. Change a **label** freely; never
  rename a key that FAQs use (that orphans them, see above).
* Adding or removing a key needs a restart, no migration. The app refuses to start with an empty list,
  an invalid key or a blank label.
* Create and update accept only configured keys (400 otherwise). Clients load the dropdown and filter
  options from `GET /api/v1/public/faq-categories`; never hard-code them.

## Permissions (admin endpoints)

Admin endpoints need an admin token (see [admin-auth.md](admin-auth.md)) whose role grants
`admin_panel.access` **and** the endpoint's own permission. The role is the row in `roles` whose
`slug` equals `users.user_type`; it must be active and not deleted. Permissions are loaded from the
role on every request, so revoking one, deactivating the role or changing `user_type` takes effect on
the next request. Nothing in the request (parameters, headers, body) can change who the caller is.

| `roles.permissions` key | Code | Allows |
|---|---|---|
| `faq.view` | `FAQ_VIEW` | `GET` admin list and detail (drafts included) |
| `faq.create` | `FAQ_CREATE` | `POST /admin/faqs` (as draft) |
| `faq.update` | `FAQ_UPDATE` | `PATCH /admin/faqs/{id}` (question, answer, category, sort order) |
| `faq.publish` | `FAQ_PUBLISH` | **in addition** to create/update: any status change — creating as `publish`, publishing or unpublishing |
| `faq.delete` | `FAQ_DELETE` | `DELETE /admin/faqs/{id}` (permanent) |

Migration `V202610261100__grant_faq_permissions` grants all five to the `admin` role only. `faq.publish`
alone opens no endpoint.

| Situation | Response |
|---|---|
| no token, invalid or expired token, logged-out session | 401 |
| app user (`user_type = 'user'`) | 403 |
| role without `admin_panel.access`, or without the endpoint's permission | 403 |
| `user_type` with no matching role, role inactive or deleted | 403 |
| status change without `FAQ_PUBLISH` | 403 `faq_publish_forbidden` |

Admin dashboard: hide Add/Edit/Delete/Publish controls the user's role does not grant (from the admin
login response's permissions), but the server enforces every rule above regardless.

## Fields

| Field | Rules |
|---|---|
| `question` | required, plain text, trimmed, 1–500 characters. Not HTML: render it as text |
| `answer` | required, max 10,000 characters, HTML. **Sanitized with an allow-list before it is stored**; 400 when no text is left |
| `category` | required, a configured key (see above) |
| `status` | `draft` (default) or `publish` |
| `sortOrder` | integer 0–100,000, default 0 |

`id`, `categoryLabel`, `createdAt` and `updatedAt` are set by the server; sending them (or any other
unknown field) is a 400 `is not allowed`.

### Answer sanitization

Kept: `p`, `br`, `b`/`strong`, `i`/`em`, `u`, `s`/`strike`, `small`, `sub`/`sup`, `code`, `pre`,
`blockquote`, `q`, `cite`, `span`, lists (`ul`, `ol`, `li`, `dl`, `dt`, `dd`) and links (`http`,
`https`, `mailto`; `rel="nofollow noopener noreferrer"` is always added). Removed: `script`, `style`,
`img`, `iframe`, `form`, `svg`, every `on*` handler, `style`/`class` attributes,
`javascript:`/`data:` and relative URLs. Responses contain the sanitized HTML. Clients render it with
their normal safe HTML view, never by evaluating it.

## Admin endpoints

| Method | Path | Permission | Success |
|---|---|---|---|
| POST | `/api/v1/admin/faqs` | `FAQ_CREATE` (+ `FAQ_PUBLISH` for `publish`) | 201 |
| GET | `/api/v1/admin/faqs` | `FAQ_VIEW` | 200 |
| GET | `/api/v1/admin/faqs/{id}` | `FAQ_VIEW` | 200 |
| PATCH | `/api/v1/admin/faqs/{id}` | `FAQ_UPDATE` (+ `FAQ_PUBLISH` to change status) | 200 |
| DELETE | `/api/v1/admin/faqs/{id}` | `FAQ_DELETE` | 204 |

Writes are limited to 120 per admin per hour (429 with `Retry-After`). Bodies must be
`application/json` (415 otherwise), max 64 KB.

### POST /api/v1/admin/faqs

```json
{ "question": "How can I contact support?",
  "answer": "<p>Use the <a href=\"https://example.com/contact\">contact page</a>.</p>",
  "category": "general", "status": "draft", "sortOrder": 1 }
```

**201 Created**

```json
{
  "id": 1,
  "question": "How can I contact support?",
  "answer": "<p>Use the <a href=\"https://example.com/contact\" rel=\"nofollow noopener noreferrer\">contact page</a>.</p>",
  "category": "general",
  "categoryLabel": "General",
  "status": "draft",
  "sortOrder": 1,
  "createdAt": "2026-10-26T12:00:00Z",
  "updatedAt": "2026-10-26T12:00:00Z"
}
```

```json
{ "status": 400, "title": "Bad Request", "detail": "Validation failed", "code": "validation_failed",
  "errors": { "category": "must be one of general, billing, technical" } }
```

### GET /api/v1/admin/faqs

Drafts and published FAQs, including those of removed categories. Items have no `answer` (use the detail).

| Parameter | Description |
|---|---|
| `search` | question or answer contains (case-insensitive, max 100; `%` and `_` are literal) |
| `status` | `draft` / `publish` |
| `category` | category key, also a removed one (to find orphaned FAQs) |
| `page` | zero-based, default 0 |
| `size` | default 20, max 100 (larger values are capped) |
| `sort` | `field,asc` or `field,desc`, repeatable; `sortOrder` (default, asc), `question`, `category`, `status`, `createdAt`, `updatedAt`, `id`. `id` asc is appended as tiebreaker. Others → 400 |

```json
{
  "content": [
    { "id": 1, "question": "How can I contact support?", "category": "general", "categoryLabel": "General",
      "status": "draft", "sortOrder": 1, "createdAt": "2026-10-26T12:00:00Z", "updatedAt": "2026-10-26T12:00:00Z" }
  ],
  "page": 0, "size": 20, "totalElements": 1, "totalPages": 1
}
```

### GET /api/v1/admin/faqs/{id}

The full FAQ (same shape as the create response). 404 `faq_not_found` for unknown ids; 400 for a
non-numeric or out-of-range id.

### PATCH /api/v1/admin/faqs/{id}

Partial update (JSON). Omitted fields keep their value; `null` is rejected for every field. The
category is checked against the **current** configuration, so a FAQ of a removed category can be
edited and moved, but not moved into a removed one. Sending the current status is not a change and
needs no `FAQ_PUBLISH`. PUT is not offered (405).

**200 OK** with the updated FAQ. 404 for unknown ids, including FAQs deleted before the update; an
update racing a delete fails rather than recreating the FAQ.

### DELETE /api/v1/admin/faqs/{id}

Permanent delete (FAQs have no soft delete). **204 No Content**. Deleting it again, or two concurrent
deletes of the same FAQ: the second gets 404 `faq_not_found`. The admin UI should confirm first
(showing the question) and refresh the list afterwards.

## Public endpoints (mobile app and website)

No authentication, GET only (writes are 401). Only public FAQs (see visibility rule); anything else is
a plain 404 that does not reveal whether it exists. Responses never contain `status`, timestamps or
other admin data, and carry `Cache-Control: max-age=60, public`, so changes reach clients within a
minute. Parameters other than those listed (`status`, `sort`, `includeDrafts`, ...) are ignored.

### GET /api/v1/public/faqs

| Parameter | Description |
|---|---|
| `category` | category key; an unknown or removed one gives an empty list. Malformed → 400 |
| `search` | question or answer contains (case-insensitive, max 100) |
| `page`, `size` | zero-based page, size default 20, max 100 |

Always `sortOrder` asc, then `id` asc.

```http
GET /api/v1/public/faqs?category=general&page=0&size=20
```

```json
{
  "content": [
    {
      "id": 1,
      "question": "How can I contact support?",
      "answer": "<p>Use the <a href=\"https://example.com/contact\" rel=\"nofollow noopener noreferrer\">contact page</a>.</p>",
      "category": "general",
      "categoryLabel": "General",
      "sortOrder": 1
    }
  ],
  "page": 0, "size": 20, "totalElements": 1, "totalPages": 1
}
```

### GET /api/v1/public/faqs/{id}

One public FAQ, same item shape. 404 `faq_not_found` for drafts, FAQs of removed categories and unknown
ids alike.

### GET /api/v1/public/faq-categories

The configured categories in display order. A plain array, not paginated (a short, fixed list from
configuration). Use it for the public category tabs/filters and the admin dropdown.

```json
[
  { "key": "general", "label": "General" },
  { "key": "billing", "label": "Billing & Payments" },
  { "key": "technical", "label": "Technical Support" }
]
```

## Client UI notes

* Public FAQ page: load categories and FAQs from the endpoints above; group by `category` (or one tab
  per category with `?category=`), keep the server order. Use an accessible accordion (button with
  `aria-expanded`/`aria-controls`, keyboard Enter/Space). Show loading, empty and error states. FAQs
  never reference a category missing from `/faq-categories`; still fall back to `categoryLabel`.
* Admin: list with status badge (`draft` → Draft, `publish` → Published), filters from the parameters
  above; show "Removed category" when `categoryLabel` is null. Disable submit while a request runs;
  map `errors` to form fields.

## Indexes

From `V202610261000`: `(status, category, sort_order, id)` serves the public list and the status filter;
`(category, sort_order, id)` the admin category filter. Text search (`LIKE '%term%'`) is not indexed;
it runs within the small FAQ table.

## Configuration

```yaml
app:
  faq:
    categories: { general: General, billing: Billing & Payments, technical: Technical Support }
  rate-limit:
    faq-write-user: { max-requests: 120, window: 1h }
```
