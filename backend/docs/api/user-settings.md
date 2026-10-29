# User Settings API

Base path `/api/v1`. Interactive OpenAPI docs: `/swagger-ui.html` (dev profile only).

`/api/v1/user-settings` is the caller's own settings (mobile app and admin dashboard). The owner always comes
from the token, so there is no id in the path and no way to read, create or change another user's settings.

## Storage

Table `user_settings`, one row per user (`uq_user_settings_user_id`), `user_id` → `users.id` with
`ON DELETE CASCADE` (hard deletes only; soft-deleted users keep their row). Rows are created only by `POST`;
existing users need no backfill.

| JSON | Column | Type | Default on create | Rules |
|---|---|---|---|---|
| `id` | `id` | number | generated | read-only |
| `location` | `location` | string \| null | `null` | max 150; trimmed; must not be blank; `null` clears it |
| `theme` | `theme` | `light` \| `dark` \| `system` | `system` | |
| `language` | `language` | string | `en` | language with optional region: `en`, `hi`, `en-US`, `es-419` (case-sensitive), max 10 |
| `notificationEnabled` | `notification_enabled` | boolean | `true` | master switch over the three channels |
| `emailNotifications` | `email_notifications` | boolean | `true` | |
| `pushNotifications` | `push_notifications` | boolean | `true` | |
| `smsNotifications` | `sms_notifications` | boolean | `false` | |
| `timezone` | `timezone` | string | `UTC` | IANA zone id, e.g. `Asia/Kolkata`; offsets like `+05:30` are rejected |
| `createdAt` | `created_at` | ISO-8601 UTC | | read-only |
| `updatedAt` | `updated_at` | ISO-8601 UTC | | read-only; set on every change |

`user_id` is never returned or accepted.

## Authentication and authorization

Every endpoint needs `Authorization: Bearer <accessToken>` (app users: `POST /api/v1/auth/login`, staff:
`POST /api/v1/admin/login`); otherwise **401**. Permissions come from the caller's role:

| Permission (`roles.permissions` key) | Seeded for | Allows |
|---|---|---|
| `USER_SETTING_VIEW` (`user_setting.view`) | user, admin | `GET` own settings |
| `USER_SETTING_CREATE` (`user_setting.create`) | user, admin | `POST` own settings |
| `USER_SETTING_UPDATE` (`user_setting.update`) | user, admin | `PATCH` own settings |

A missing permission is **403** `user_settings_action_forbidden`. There is no admin endpoint that lists or
changes other users' settings.

## Request rules (POST and PATCH)

- Only the fields in the table above that are not read-only. Any other field, including `id`, `userId`,
  `user_id`, `createdAt` and `updatedAt`, is **400** `validation_failed` with `errors.<field>: "is not allowed"`.
- Values must have the right JSON type: `"true"`, `1` or `"yes"` is not a boolean; `5` is not a string.
- Omitted fields keep their value (on create: the default). Explicit `null` clears `location` and is rejected
  for every other field.
- Malformed JSON, a non-object body or any invalid field is **400**, and nothing is saved.
- Writes are rate limited per user (`app.rate-limit.user-setting-write-user`, 120/h) → **429**.

## `GET /user-settings` — my settings (`USER_SETTING_VIEW`) → 200

**404** `user_settings_not_found` until the settings are created.

```json
{
  "id": 1,
  "location": "Jaipur",
  "theme": "system",
  "language": "en",
  "notificationEnabled": true,
  "emailNotifications": true,
  "pushNotifications": true,
  "smsNotifications": false,
  "timezone": "Asia/Kolkata",
  "createdAt": "2026-10-29T10:00:00Z",
  "updatedAt": "2026-10-29T10:00:00Z"
}
```

## `POST /user-settings` — create my settings (`USER_SETTING_CREATE`) → 201

```json
{"location": "Jaipur", "theme": "dark", "language": "hi", "smsNotifications": true, "timezone": "Asia/Kolkata"}
```

All fields optional (`{}` creates the defaults). Returns the settings as for `GET`. **409**
`user_settings_already_exist` when the caller already has settings, also for concurrent requests: the unique
index on `user_id` lets exactly one through.

## `PATCH /user-settings` — update my settings (`USER_SETTING_UPDATE`) → 200

```json
{"theme": "light", "location": null}
```

Changes only the fields sent; at least one is required (`{}` is **400** with `errors.body`). Returns the full
settings. **404** `user_settings_not_found` until they are created. Concurrent updates run one after another
(row lock), each on the latest values.

## Errors

RFC 9457 `ProblemDetail` with a stable `code`:

```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "Validation failed",
  "code": "validation_failed",
  "errors": {"theme": "must be one of light, dark or system"}
}
```

| Status | `code` | When |
|---|---|---|
| 400 | `validation_failed` | invalid, unknown or mistyped field; malformed JSON; empty PATCH |
| 401 | | missing, invalid or expired token |
| 403 | `user_settings_action_forbidden` | missing permission |
| 404 | `user_settings_not_found` | settings not created yet (GET, PATCH) |
| 409 | `user_settings_already_exist` | POST when settings exist |
| 429 | | rate limit |
| 500 | | unexpected error; details are logged, never returned |

## Not covered yet

- `language` is checked for format only; there is no list of languages the apps support.
- Notification senders do not read these switches yet (the notification module does not exist).
