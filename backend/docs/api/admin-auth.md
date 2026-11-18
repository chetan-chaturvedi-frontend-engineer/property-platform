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
2. The session is a 15-minute access token (JWT with only `sub` and `sid`) and a rotating refresh
   token (stored as a SHA-256 hash). Tokens contain **no roles or permissions**.
3. Both tokens are delivered as **HttpOnly cookies** and never appear in a response body, so page
   scripts (and XSS) cannot read them. The browser sends them automatically.
4. On every request the session must still be live and the account active; the permissions are
   loaded from the role. `/api/v1/admin/**` requires `ADMIN_PANEL_ACCESS`, and each endpoint its own
   permission. Revoking a permission, deactivating the role, changing `user_type`, suspending the
   account or logging out therefore takes effect on the **next request**.

## Session cookies

| Cookie | Holds | Path | Max-Age |
|---|---|---|---|
| `admin_access_token` | access token (JWT) | `/api/v1/admin` | 15 minutes |
| `admin_refresh_token` | refresh token | `/api/v1/admin/refresh` | until the session ends (30 days) |
| `XSRF-TOKEN` | CSRF token (server copy) | `/` | browser session |

All are `HttpOnly` and `SameSite=Strict`, and `Secure` unless `app.security.auth-cookies.secure`
is `false` (only the `dev` profile, for plain-HTTP localhost). Names and flags live in
`app.security.auth-cookies.*`.

- The access cookie is accepted only on `/api/v1/admin/**`, never on login, refresh or csrf, so a
  stale cookie cannot turn those into 401s. Outside `/api/v1/admin` it is not a credential.
- An `Authorization: Bearer` header still works and wins over the cookie (API tools, tests). The
  mobile app is unaffected: it never receives these cookies.

**Deployment:** the dashboard and the API must be **same-site** (e.g. `admin.example.com` and
`api.example.com`, or one origin with a reverse proxy) and served over **HTTPS**. A cross-origin
dashboard must be in `CORS_ALLOWED_ORIGINS`; CORS allows credentials for those explicit origins only.

## CSRF protection

Because browsers attach cookies automatically, every **state-changing** request to
`/api/v1/admin/**` without an `Authorization` header must carry a CSRF token (double submit):

1. `GET /api/v1/admin/csrf` sets the HttpOnly `XSRF-TOKEN` cookie and returns
   `{ "headerName": "X-XSRF-TOKEN", "token": "..." }`.
2. Send that token in the `X-XSRF-TOKEN` header on `POST`/`PUT`/`PATCH`/`DELETE` (including login,
   refresh and logout). The token is masked differently on every call; any returned value works.
3. Missing or wrong token: **403** `csrf_invalid`. Fetch a new token and retry once.

Requests with an `Authorization` header are exempt: a forged cross-site request cannot set it.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/admin/csrf` | public | CSRF token for cookie requests |
| POST | `/api/v1/admin/login` | public, rate-limited, CSRF | log in; sets the session cookies |
| POST | `/api/v1/admin/refresh` | refresh cookie, rate-limited, CSRF | rotate the session; admin access is checked again |
| GET | `/api/v1/admin/me` | `ADMIN_PANEL_ACCESS` | profile, role and current permissions |
| POST | `/api/v1/admin/logout` | any valid session, CSRF | revoke this session; deletes the cookies |

### GET /api/v1/admin/csrf

```json
{ "headerName": "X-XSRF-TOKEN", "token": "8Jq0n2...masked..." }
```

### POST /api/v1/admin/login

```http
POST /api/v1/admin/login
Content-Type: application/json
X-XSRF-TOKEN: 8Jq0n2...
Cookie: XSRF-TOKEN=...

{ "identifier": "manager@example.com", "password": "Str0ng!Pass" }
```

`identifier` is an email address (trimmed, lower-cased) or a phone number (normalized to E.164).
Other fields such as `role`, `userType` or `permissions` are rejected with 400.

**200 OK**

```http
Set-Cookie: admin_access_token=eyJ...; Path=/api/v1/admin; Max-Age=900; Secure; HttpOnly; SameSite=Strict
Set-Cookie: admin_refresh_token=Qm9v...; Path=/api/v1/admin/refresh; Max-Age=2592000; Secure; HttpOnly; SameSite=Strict
```

```json
{
  "expiresIn": 900,
  "refreshTokenExpiresAt": "2026-11-24T10:00:00Z",
  "user": {
    "id": 12, "fullName": "Mira Manager", "email": "manager@example.com", "phone": null,
    "role": { "slug": "manager", "name": "Manager" },
    "permissions": ["ADMIN_PANEL_ACCESS", "PROPERTY_LIST_ANY"]
  }
}
```

`expiresIn` is the access cookie's lifetime in seconds. The body never contains tokens.

Errors (RFC 9457 problem details, as in the rest of the API); no cookies are set:

| Status | `code` | When |
|---|---|---|
| 400 | `validation_failed` | missing/oversized fields, malformed identifier, unknown fields (`errors`: field -> message) |
| 401 | `invalid_credentials` | unknown account or wrong password — identical responses |
| 403 | `account_inactive` / `verification_required` | correct password, account not eligible |
| 403 | `admin_access_denied` | correct password, role does not grant admin-panel access |
| 403 | `csrf_invalid` | missing or wrong CSRF token |
| 413 | `payload_too_large` | body above 64 KB |
| 429 | `rate_limited` | too many attempts (`Retry-After` header) |

```json
{ "status": 401, "title": "Unauthorized", "detail": "The provided credentials are invalid.",
  "code": "invalid_credentials", "instance": "/api/v1/admin/login" }
```

The 403 account cases are only returned after the correct password, so they reveal nothing to
someone who does not already know it.

**Brute-force protection:** 10 attempts per IP per 15 minutes; 5 failed attempts per account per
15 minutes, after which even the correct password gets 429 until the window ends (temporary, so an
attacker cannot lock an account permanently). Counted separately from the app login. Failures and
successes are logged with user id and IP only — never passwords or tokens.

### POST /api/v1/admin/refresh

No body. The browser sends the `admin_refresh_token` cookie (its path is this endpoint only). The
response has the same shape as login and sets new cookies; the old refresh token stops working, and
presenting it again revokes the session.

| Status | `code` | When (the session cookies are deleted) |
|---|---|---|
| 401 | `invalid_token` | no, unknown, expired, reused or revoked refresh token |
| 403 | `admin_access_denied` | admin access was revoked meanwhile; the session is revoked |

### GET /api/v1/admin/me

```json
{ "id": 12, "fullName": "Mira Manager", "email": "manager@example.com", "phone": null,
  "role": { "slug": "manager", "name": "Manager" }, "permissions": ["ADMIN_PANEL_ACCESS", "PROPERTY_LIST_ANY"] }
```

No or invalid session: 401 (the dashboard then calls refresh once). User without admin-panel
access: 403.

### POST /api/v1/admin/logout

```json
{ "message": "Logged out." }
```

Revokes the session (its access and refresh tokens stop working immediately) and deletes the
session cookies. Works even if the user's admin access was revoked in the meantime.

## Example: dashboard flow with curl

```bash
API=http://localhost:8080/api/v1
JAR=$(mktemp)   # cookie jar, standing in for the browser
CSRF=$(curl -s -c $JAR -b $JAR $API/admin/csrf | jq -r .token)
curl -s -c $JAR -b $JAR -X POST $API/admin/login -H "X-XSRF-TOKEN: $CSRF" \
  -H 'Content-Type: application/json' -d '{"identifier":"admin@example.com","password":"..."}'
curl -s -b $JAR $API/admin/me
curl -s -b $JAR "$API/admin/properties?publicationStatus=pending_review"
curl -s -c $JAR -b $JAR -X POST $API/admin/refresh -H "X-XSRF-TOKEN: $CSRF"
curl -s -c $JAR -b $JAR -X POST $API/admin/logout -H "X-XSRF-TOKEN: $CSRF"
```

Scripts may instead send the access token as `Authorization: Bearer <token>` (no CSRF token needed).
