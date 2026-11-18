# CLAUDE.md

This file guides Claude Code (and humans) working on this repository.

## Project

Backend API for a **property listing platform**. It is used by three clients:

| Client | Tech | Uses |
|---|---|---|
| Mobile app (users) | React Native (separate repo) | `/api/v1/auth/**`, `/api/v1/public/**`, `/api/v1/**` |
| Admin dashboard | React.js (separate repo) | `/api/v1/auth/**`, `/api/v1/admin/**` |
| Public website (future) | — | `/api/v1/public/**` |

Primary goals: **fast** and **secure**. Every change must respect both.

## Tech stack

- Java 17, Spring Boot 4.1.x (Spring Framework 7, Spring Security 7, Hibernate 7, Jackson 3)
- PostgreSQL + Flyway migrations, Spring Data JPA
- Bean Validation, Lombok, Actuator
- Maven wrapper (`./mvnw`), no global Maven needed

## Commands

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev   # local run on http://localhost:8080
./mvnw test                     # all tests (needs local Postgres running)
./mvnw test -Dtest=LoginTests   # single test class
./mvnw clean package            # build jar into target/
```

Local DB: Postgres.app on `localhost:5432`, database `property_app`, user `property_user`, trust auth (no password).
Tests use a separate database `property_app_test` (profile `test`, `src/test/resources/application-test.yml`).
Override with env vars `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`. Never commit real credentials.

Profiles: no profile = production-safe defaults; the app refuses to start without `JWT_SECRET` and
`OTP_HMAC_SECRET` (see `.env.example`). `dev` adds placeholder secrets and prints OTP codes to the console
(`[DEV ONLY - NOT SENT]`); the log providers refuse to start outside `dev`. Never deploy with `dev`.

## Package layout (package-by-feature)

Base package: `com.propertypro.property_platform`. Each business feature is a self-contained module:

```
common/          shared: base entity, exceptions, error handler, PageResponse, utils
config/          app-wide config: CORS, Jackson, cache, async, OpenAPI
security/        SecurityConfig, JWT, Permissions constants, current-user helper
auth/            login, logout, refresh token, registration, password reset
otp/             reusable OTP challenges (hash, verify, limits) + email/SMS provider interfaces
user/            users, profiles, KYC document verification
role/            roles & permissions (RBAC)
team/            admin team members (staff with dashboard access)
subscription/    plans (INDIVIDUAL, BUILDER), plan features/limits, user subscriptions
transaction/     payments, transactions, invoices
property/        listings, amenities, media links, search
lead/            leads, follow-ups, site-visit scheduling, conversion
media/           file upload/storage shared by all modules
cms/blog|page|faq|banner/   blogs, content pages, FAQs, banners
notification/    in-app, push, email, SMS
setting/         admin-managed settings
activitylog/     audit trail for admin
report/          aggregated stats for dashboard charts
```

Inside every module, use the same sub-packages (create only those you need; `user/` and `auth/` are the reference):

```
<module>/
  api/          REST controllers (UserFooController = app, AdminFooController = admin)
  dto/          request/response records
  domain/       JPA entities and enums
  repository/   Spring Data repositories
  service/      business logic, transactions, authorization of ownership
  mapper/       entity <-> DTO mapping (when not trivial)
  exception/    module-specific exceptions
  event/        domain events (e.g. LeadConvertedEvent) for cross-module side effects
```

Rules:
- Modules talk to each other through **services or events**, never through another module's repository.
- Controllers stay thin: validate input, call one service method, return a DTO.
- Never return JPA entities from controllers; always DTOs (records).

## API conventions

- Base path `/api/v1`. Versioned; breaking changes go to `/api/v2`.
- Route groups:
  - `/api/v1/auth/**` — login, register, OTP, refresh (public, rate-limited)
  - `/api/v1/public/**` — read-only content without login (banners, blogs, FAQs, pages, property search). GET only.
  - `/api/v1/**` — logged-in app user; data is **scoped to the current user** (my properties, my leads).
  - `/api/v1/admin/**` — admin dashboard; requires `ADMIN_PANEL_ACCESS` plus a specific permission per endpoint.
- Shared features (property, lead, ...) have **two controllers over one service**:
  `PropertyController` (`/api/v1/properties`, owner-scoped) and `AdminPropertyController` (`/api/v1/admin/properties`, all data).
- REST style: plural nouns, kebab-case paths, `GET` list/detail, `POST` create (201), `PUT`/`PATCH` update, `DELETE` (204).
  Actions that are not CRUD use a sub-resource: `POST /api/v1/leads/{id}/convert`, `POST /api/v1/leads/{id}/schedule`.
- JSON fields camelCase. Timestamps are ISO-8601 UTC (`Instant`).
- Errors use RFC 9457 `ProblemDetail` via `common/exception/GlobalExceptionHandler`; validation errors include an `errors` map of field -> message. Never leak stack traces or SQL.
- Lists are **always paginated** (`page`, `size`, `sort`); cap `size` at 100. Return a stable `PageResponse` DTO, not Spring's `Page` JSON.

## Security rules

- **Authorization is permission-based, never role-name based.** Roles (ADMIN, USER, later MANAGER, SUPER_ADMIN...) are rows in the DB mapped to permissions. Code checks permissions only:
  `@PreAuthorize("hasAuthority('PROPERTY_UPDATE_ANY')")`. Do **not** write `hasRole('ADMIN')`. Adding a new role must need no code change.
- Permission codes live in `security/Permissions` and are seeded by a Flyway migration. Naming: `<RESOURCE>_<ACTION>[_ANY]`, e.g. `PROPERTY_CREATE`, `PROPERTY_UPDATE_ANY`, `LEAD_VIEW_ANY`, `USER_MANAGE`.
- **Ownership checks** for app endpoints happen in the service (`property.ownerId == currentUserId`), not only in the controller. Return 404 (not 403) for resources the user does not own.
- Authentication: **stateless JWT** (HS256 access token, 15 min, claims `sub` + `sid` only) plus a rotating
  refresh token stored as a SHA-256 hash. Every request checks the session (`ActiveSessionValidator`), so logout,
  password reset and blocking a user take effect immediately. Reusing a refresh token revokes its session.
  Mobile sends `Authorization: Bearer <token>`. The admin dashboard gets both tokens as HttpOnly, SameSite=Strict
  cookies (`auth/web/AdminSessionCookies`, never in response bodies); cookie requests that change state need the
  CSRF token from `GET /api/v1/admin/csrf` in `X-XSRF-TOKEN` (see `docs/api/admin-auth.md`). Call
  `TokenService.revokeAllSessions` whenever an admin blocks a user or credentials change.
- Rate limits use `RateLimiter`; the current `InMemoryRateLimiter` is per instance. Replace it with a shared
  store (Redis) before running more than one instance.
- Passwords: BCrypt. OTPs: random 6 digits, stored hashed, 5-minute expiry, max attempts, resend cooldown.
- Rate limit `/auth/**`, OTP and lead-submit endpoints.
- Validate every request DTO with Bean Validation (`@Valid`); set `@Size` on every string and collection.
- File uploads: allow-list MIME types and extensions, enforce size limits, store outside the app (object storage, S3-compatible), random object keys, serve via signed/CDN URLs. Never trust client filenames.
- CORS: explicit allow-list of the admin dashboard origin(s), with credentials (session cookies). Never `*`.
- Secrets only from env vars / secret manager. Never log passwords, tokens, OTPs or document numbers.
- Sensitive admin actions (user/role/settings/transaction changes) must write an activity log entry. Successful
  API writes and 403s are logged automatically (`activitylog/web/SystemLogInterceptor`); add `@SystemLogged` to
  reads of sensitive data and call `SystemLogService.record` for anything else. `system_logs` is append-only.

## Subscriptions & feature gating

- Plans: `INDIVIDUAL`, `BUILDER` (more may come). Plans, their features and limits (e.g. max active listings, featured listings, project listings) are **DB data**, not `if (plan == BUILDER)` code.
- Gate features through `SubscriptionService` (e.g. `requireFeature(userId, Feature.PROJECT_LISTING)`, `checkLimit(...)`), which throws a 403 `ProblemDetail` explaining the upgrade.

## Performance rules

- Every list endpoint paginated; every filter/sort column indexed in the migration.
- Avoid N+1: use `@EntityGraph`, fetch joins or DTO projections for lists. Associations are `LAZY` by default. `open-in-view` is disabled — load what you need inside the service transaction.
- Use `@Transactional(readOnly = true)` for reads.
- Cache read-heavy, rarely-changing data (settings, banners, FAQs, content pages, plans, permissions) and evict on admin update.
- Side effects (notifications, emails, activity logs, report aggregation) run asynchronously via events (`@TransactionalEventListener(phase = AFTER_COMMIT)` + `@Async`), never inside the request path.
- Property search: start with indexed SQL filters (city, type, price range, status); add full-text / geo indexes when needed.
- Media is uploaded directly to object storage via pre-signed URLs; the API only stores metadata.
- Reports use aggregate SQL queries (or pre-computed tables), never loading entities into memory.

## Database & migrations

- Schema changes **only** via Flyway in `src/main/resources/db/migration`. `ddl-auto: validate` must keep passing.
- Never edit a migration that has been applied anywhere; add a new one.
- Name new migrations `V<yyyyMMddHHmm>__<snake_case_description>.sql` (timestamps avoid version clashes between developers).
- Tables plural snake_case; PK `id BIGSERIAL`; timestamps `TIMESTAMPTZ` (`created_at`, `updated_at`); FKs with indexes; soft delete (`deleted_at`) for user-facing content (properties, leads, users).
- Money as `NUMERIC(14,2)` + currency code; never floating point.
- Enums are stored as lowercase `VARCHAR` values guarded by a named `CHECK` constraint, mapped with an
  auto-applied `AttributeConverter` (see `user/domain/UserStatus` + `UserStatusConverter`). Never ordinal.
  Adding a value = update the Java enum + a migration that drops and re-creates the constraint.
- Start migrations on existing tables with `SET LOCAL lock_timeout = '5s';`. New columns must be nullable or
  have a constant default so `ADD COLUMN` does not rewrite the table.

### Rolling back

Flyway Community has no undo migrations. Every migration that changes an existing table gets a matching
manual script `src/main/resources/db/rollback/U<version>__<same_description>.sql`, which reverts only that
migration and deletes its `flyway_schema_history` row. Run it with:

```bash
psql -v ON_ERROR_STOP=1 -1 -h localhost -U property_user -d property_app \
  -f src/main/resources/db/rollback/U<version>__<description>.sql
```

Then deploy code that no longer expects the columns; the next startup re-applies the migration if it is
still present.

## Code style

- Tabs for indentation (match existing files). Constructor injection via `@RequiredArgsConstructor`; no field `@Autowired`.
- DTOs are Java `record`s. Entities use Lombok `@Getter/@Setter` and a protected no-arg constructor; never `@Data` on entities.
- Business errors are specific exceptions mapped in `GlobalExceptionHandler` to the correct status (404, 409, 403, 422).
- Comments only where intent is not obvious.

## Testing

- API/security tests: extend `support/AbstractIntegrationTest` (full app, test DB, tables truncated per test,
  `FakeOtpOutbox` captures OTPs instead of sending). Cover: success, validation 400, unauthenticated 401,
  missing permission 403, not-owner 404.
- Service tests: plain unit tests with Mockito.
- Repository/migration tests: `@DataJpaTest` against PostgreSQL.
- Every new endpoint ships with tests; `./mvnw test` must pass before a task is considered done.

## Workflow for a new feature

1. Flyway migration (tables, indexes, permission seeds).
2. Entity + repository in `<module>/domain`, `<module>/repository`.
3. DTOs + service (ownership, subscription gating, events).
4. App controller and/or admin controller with `@PreAuthorize` permissions.
5. Tests, then `./mvnw test`.
