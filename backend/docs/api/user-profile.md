# My Account API

Base path `/api/v1`. Interactive OpenAPI docs: `/swagger-ui.html` (dev profile only).

What an app user can do to their own account. There is no id in the path or body: the account always comes from the
token. Sign-in, registration and password reset are in the auth endpoints (`/auth/*`); `GET /auth/me` returns the
profile.

## Authentication and authorization

Every endpoint needs `Authorization: Bearer <accessToken>` (otherwise **401**). Permissions come from the caller's
role, granted to the app `user` role by `V202611211230` (staff accounts are managed in the admin dashboard):

| Permission (`roles.permissions` key) | Allows |
|---|---|
| `PROFILE_UPDATE` (`profile.update`) | `PATCH /users/me` |
| `PROFILE_CHANGE_PASSWORD` (`profile.change_password`) | `POST /users/me/change-password` |
| `PROFILE_DELETE` (`profile.delete`) | `DELETE /users/me` |

A missing permission is **403** `profile_action_forbidden`. All three share a rate limit of 30 per hour per user
(**429**). Unknown fields are **400** with `errors.<field>: "is not allowed"`.

## `PATCH /users/me` — change my name

```json
{ "fullName": "Alice Kumar" }
```

2 to 150 characters, trimmed. Returns the profile as `GET /auth/me`. Email and phone are not changeable here:
changing them needs re-verification of the new address.

## `POST /users/me/change-password` — 204

```json
{ "currentPassword": "Old!Pass1", "password": "New!Pass9", "passwordConfirmation": "New!Pass9" }
```

`password` is the new password: 8+ characters with an uppercase letter, a digit and a special character, and it must
match `passwordConfirmation` (**400** otherwise).

| Status | Code | When |
|---|---|---|
| 422 | `password_incorrect` | the current password is wrong |
| 422 | `password_unchanged` | the new password equals the current one |

Ends **every** session including the caller's own: the next request is **401** and the user signs in again with the
new password.

## `DELETE /users/me` — delete my account, 204

```json
{ "password": "Current!Pass1" }
```

**422** `password_incorrect` for a wrong password; nothing is changed. On success the account is soft deleted (the
row stays with `deleted_at`, the email and phone stay reserved, other records are kept), every session ends, login is
refused, and all of the account's properties are archived so none stays public. Archiving runs in the same
transaction (`AccountDeletedEvent`), so either everything happens or nothing does. Saved properties, views and
bookings of other users that refer to those properties keep working; archived properties are no longer public.
