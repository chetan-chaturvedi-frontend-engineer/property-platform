# Admin Authentication API

Base path `/api/v1/admin`. Interactive docs: `/swagger-ui.html` (dev profile only).

## Who can sign in

Any account whose **role grants `admin_panel.access`** (permission code `ADMIN_PANEL_ACCESS`),
whatever the role is called. The role is the row in `roles` whose `slug` equals the user's
`users.user_type`, and it must be active and not deleted. Valid credentials alone are never enough:

| Account | Admin login |
|---|---|
| `user_type = 'admin'`, admin role grants `admin_panel.access` | allowed |
| `user_type = 'manager'`, manager role grants `admin_panel.access` | allowed |
| `user_type = 'user'` (app users; role has no admin access) | 403 `admin_access_denied` |
| role without the permission, with it set to `false`, inactive or deleted | 403 `admin_access_denied` |
| `user_type` with no matching role | 403 `admin_access_denied` |

The account must also be `active` and have a verified email or phone (the same rules as the app
login). To give a new role panel access, set `{"admin_panel": {"access": true}, ...}` in its
`roles.permissions`; no code change is needed. Each admin endpoint additionally needs its own
permission (e.g. `SUBSCRIPTION_PLAN_LIST`), so panel access alone opens only `/me`.

## How it works

1. `POST /login` checks rate limits, the identifier format, then the password with BCrypt (the
   same work for unknown accounts, so timing reveals nothing), then account state, then the role's
   permission. Only then is a session created.
2. The response carries a 15-minute access token (JWT with only `sub` and `sid`) and a rotating
   refresh token (stored as a SHA-256 hash). Tokens contain **no roles or permissions**.
3. On every request the session must still be live and the account active; the permissions are
   loaded from the role. `/api/v1/admin/**` requires `ADMIN_PANEL_ACCESS`, and each endpoint its own
   permission. Revoking a permission, deactivating the role, changing `user_type`, suspending the
   account or logging out therefore takes effect on the **next request**, with the same token.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/admin/login` | public, rate-limited | log in |
| POST | `/api/v1/admin/refresh` | public, rate-limited | rotate the refresh token; admin access is checked again |
| GET | `/api/v1/admin/me` | `ADMIN_PANEL_ACCESS` | profile, role and current permissions |
| POST | `/api/v1/admin/logout` | any valid token | revoke this session |

### POST /api/v1/admin/login

```http
POST /api/v1/admin/login
Content-Type: application/json

{ "identifier": "manager@example.com", "password": "Str0ng!Pass" }
```

`identifier` is an email address (trimmed, lower-cased) or a phone number (normalized to E.164).
Other fields such as `role`, `userType` or `permissions` are rejected with 400.

**200 OK**

```json
{
  "tokenType": "Bearer",
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "expiresIn": 900,
  "refreshToken": "Qm9vdHN0cmFwLXJhbmRvbS0zMi1ieXRlcw",
  "refreshTokenExpiresAt": "2026-11-24T10:00:00Z",
  "user": {
    "id": 12, "fullName": "Mira Manager", "email": "manager@example.com", "phone": null,
    "role": { "slug": "manager", "name": "Manager" },
    "permissions": ["ADMIN_PANEL_ACCESS", "PROPERTY_LIST_ANY"]
  }
}
```

Errors (RFC 9457 problem details, as in the rest of the API):

| Status | `code` | When |
|---|---|---|
| 400 | `validation_failed` | missing/oversized fields, malformed identifier, unknown fields (`errors`: field -> message) |
| 401 | `invalid_credentials` | unknown account or wrong password — identical responses |
| 403 | `account_inactive` / `verification_required` | correct password, account not eligible |
| 403 | `admin_access_denied` | correct password, role does not grant admin-panel access |
| 413 | `payload_too_large` | body above 64 KB |
| 429 | `rate_limited` | too many attempts (`Retry-After` header) |

```json
{ "status": 401, "title": "Unauthorized", "detail": "The provided credentials are invalid.",
  "code": "invalid_credentials", "instance": "/api/v1/admin/login" }
```

```json
{ "status": 403, "title": "Forbidden", "detail": "You do not have permission to access the admin panel.",
  "code": "admin_access_denied", "instance": "/api/v1/admin/login" }
```

```json
{ "status": 400, "title": "Bad Request", "detail": "Validation failed", "code": "validation_failed",
  "errors": { "identifier": "must not be blank", "password": "must not be blank" } }
```

The 403 cases are only returned after the correct password, so they reveal nothing to someone who
does not already know it.

**Brute-force protection:** 10 attempts per IP per 15 minutes; 5 failed attempts per account per
15 minutes, after which even the correct password gets 429 until the window ends (temporary, so an
attacker cannot lock an account permanently). Counted separately from the app login. Failures and
successes are logged with user id and IP only — never passwords or tokens.

### POST /api/v1/admin/refresh

```json
{ "refreshToken": "Qm9vdHN0cmFwLXJhbmRvbS0zMi1ieXRlcw" }
```

Returns the same shape as login with new tokens; the old refresh token stops working, and presenting
it again revokes the session. If admin access was revoked meanwhile: 403 `admin_access_denied`, and
the session is revoked.

### GET /api/v1/admin/me

```http
GET /api/v1/admin/me
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

```json
{ "id": 12, "fullName": "Mira Manager", "email": "manager@example.com", "phone": null,
  "role": { "slug": "manager", "name": "Manager" }, "permissions": ["ADMIN_PANEL_ACCESS", "PROPERTY_LIST_ANY"] }
```

No token or invalid token: 401. Token of a user without admin-panel access: 403.

### POST /api/v1/admin/logout

```http
POST /api/v1/admin/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

```json
{ "message": "Logged out." }
```

The access token and refresh token of this session stop working immediately. Works even if the
user's admin access was revoked in the meantime.

## Example: dashboard flow

```bash
API=http://localhost:8080/api/v1
TOKEN=$(curl -s -X POST $API/admin/login -H 'Content-Type: application/json' \
  -d '{"identifier":"admin@example.com","password":"..."}' | jq -r .accessToken)
curl -s $API/admin/me -H "Authorization: Bearer $TOKEN"
curl -s "$API/admin/properties?publicationStatus=pending_review" -H "Authorization: Bearer $TOKEN"
curl -s -X POST $API/admin/logout -H "Authorization: Bearer $TOKEN"
```
