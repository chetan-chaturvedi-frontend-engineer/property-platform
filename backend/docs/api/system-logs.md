# System Logs API

Base path `/api/v1`. Interactive OpenAPI docs: `/swagger-ui.html` (dev profile only).

Admin dashboard only. `system_logs` is append-only, so there is no update or delete endpoint. Most rows are written
by the application itself (`SystemLogService`, `SystemLogInterceptor`); `POST` adds one by hand.

| Method | Path | Permission (`roles.permissions` key) |
|---|---|---|
| `GET` | `/admin/system-logs` | `SYSTEM_LOG_LIST` (`system_log.list`) |
| `GET` | `/admin/system-logs/{id}` | `SYSTEM_LOG_VIEW` (`system_log.view`) |
| `POST` | `/admin/system-logs` | `SYSTEM_LOG_CREATE` (`system_log.create`) |

Every endpoint needs `Authorization: Bearer <accessToken>` from `POST /api/v1/admin/login` (otherwise **401**) and
`ADMIN_PANEL_ACCESS` plus the permission above, loaded from the caller's role on each request (otherwise **403**).
Seeded for the `admin` and `super-admin` roles only. Denied requests are logged themselves as warnings.

## Log object

Returned by all three endpoints.

```json
{
  "id": 42,
  "user": {
    "id": 7, "fullName": "Jane Doe", "email": "jane@example.com", "phone": "+919876543210",
    "status": "active", "userType": "admin", "deleted": false, "createdAt": "2026-10-20T08:00:00Z"
  },
  "module": "faqs",
  "action": "New FAQ added successfully",
  "logLevel": "success",
  "ipAddress": "203.0.113.5",
  "userAgent": "Mozilla/5.0 ...",
  "requestMethod": "POST",
  "requestUrl": "/api/v1/admin/faqs",
  "referenceId": 12,
  "referenceType": "Faq",
  "additionalData": { "status": 201 },
  "createdAt": "2026-11-04T10:15:30Z"
}
```

- `user` is `null` for guest and system activity, and when the account was later hard-deleted. Soft-deleted users
  are still returned, with `deleted: true`. Passwords, tokens and document fields are never included.
- `ipAddress`, `userAgent`, `requestMethod` and `requestUrl` are `null` for activity outside a request.
- `requestUrl` is the path only; query strings are never stored.

## List

`GET /api/v1/admin/system-logs`

| Parameter | Rules |
|---|---|
| `page` | zero-based, 0–1,000,000, default 0 |
| `size` | 1–100, default 20 |
| `sort` | `createdAt` (default, newest first) or `id`, as `field,asc` or `field,desc`. `id` desc is appended as tiebreaker |
| `userId` | positive number |
| `module` | exact; lowercase letters, digits and underscores, max 50 |
| `logLevel` | `info`, `success` or `warning` |
| `ipAddress` | exact IPv4 or IPv6 address |
| `action` | case-insensitive keyword, max 100; `%` and `_` are literal |
| `referenceId` | positive number |
| `createdFrom`, `createdTo` | ISO-8601 instants, inclusive; `createdTo` must not be before `createdFrom` |

All given filters must match. Unlike other lists, a `page` or `size` outside these ranges is **400**, not corrected.

```json
{ "content": [ { "id": 42 } ], "page": 0, "size": 20, "totalElements": 1, "totalPages": 1 }
```

## View

`GET /api/v1/admin/system-logs/{id}` returns the log object. Unknown id: **404** `system_log_not_found`.
A non-numeric id: **400**.

## Add

`POST /api/v1/admin/system-logs` returns **201** with the log object.

| Field | Rules |
|---|---|
| `action` | required; a meaningful heading, max 255, single line. `Action performed` and `Something happened` are rejected |
| `module` | default `system`; lowercase letters, digits and underscores, max 50 |
| `logLevel` | `info`, `success` or `warning`. Omitted: derived from the action (below) |
| `referenceId` | positive number; needs `referenceType` |
| `referenceType` | letters, digits and underscores, max 50, e.g. `Faq` |
| `additionalData` | JSON object |

- Level when omitted: `warning` if the action says it failed or was denied (failed, denied, unauthorized, forbidden,
  suspicious, blocked, rejected, invalid...), `success` if it says something completed (created, added, updated,
  changed, deleted, removed, successfully...), otherwise `info`.
- The user, IP address (from the trusted proxy configuration), user agent, method, URL and time always come from the
  request. Any other field, including `userId`, `ipAddress` and `createdAt`, is **400** with `errors.<field>:
  "is not allowed"`.
- Keys that look like credentials (`password`, `token`, `secret`, `otp`, `apiKey`, `authorization`, ...) are rejected
  at any depth of `additionalData`. Values are not inspected: never put secrets in them.

## Errors

RFC 9457 `ProblemDetail`. Validation failures are **400** `validation_failed` with an `errors` map of field to
message, as everywhere else in this API.
