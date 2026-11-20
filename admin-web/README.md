# admin-web

Admin dashboard for the property platform. React 19 + TypeScript (strict), built with Vite. It calls
`/api/v1/auth/**` and `/api/v1/admin/**` from [`../backend`](../backend); the API contracts are in
[`../backend/docs/api`](../backend/docs/api).

## Quick start

Requirements: Node.js 20.19+ (22 LTS recommended) and npm 10+.

```bash
cd admin-web
npm install            # also installs the Git pre-commit hook (Husky)

npm run dev:mock       # no backend needed: API answered in the browser by MSW
# or
npm run dev            # real backend: start ../backend on :8080 first (dev profile)
```

Open **http://localhost:5173** (use `localhost`, not `127.0.0.1`: the session cookies are set for
`localhost`, and the dashboard and API must be the same site).

`npm run dev` reads `VITE_API_BASE_URL` from `.env.development` (git-ignored, see `.env.example`),
by default `http://localhost:8080/api/v1`, so the browser calls the backend directly.

**Mock accounts** (`dev:mock` only, password `Admin@1234` for all):

| Email                     | Role            | Sees                                                                                                                                                      |
| ------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin@example.com`       | Administrator   | dashboard, users (full CRUD), properties (full workflow), leads and site visits (full CRUD, assign), banners and blogs (full CRUD), activity log, profile |
| `manager@example.com`     | Manager         | dashboard, users (view only), profile (no `SYSTEM_LOG_LIST`)                                                                                              |
| `editor@example.com`      | User Editor     | users: add and edit, but no status changes or deletes                                                                                                     |
| `viewer@example.com`      | Property Viewer | properties: list and details only, no edits or workflow actions                                                                                           |
| `leads@example.com`       | Lead Viewer     | leads: list and details only, no edits, assignment or deletes                                                                                             |
| `visits@example.com`      | Visit Viewer    | site visits: list only (no details, edits, status changes, assignment or deletes)                                                                         |
| `banners@example.com`     | Banner Editor   | banners: list, view, add and edit (saved as inactive), but no status changes or deletes                                                                   |
| `blogs@example.com`       | Blog Writer     | blogs: list, view, add, edit, publish and schedule; no deletes, categories not listed                                                                     |
| `blog-viewer@example.com` | Blog Viewer     | blogs: list and details only                                                                                                                              |
| `user@example.com`        | app user        | login refused: `admin_access_denied`                                                                                                                      |

With the real backend, sign in with an account whose role grants `ADMIN_PANEL_ACCESS`.

> **Users page:** backed by `/api/v1/admin/users` ([`admin-users.md`](../backend/docs/api/admin-users.md)).
> The seeded admin and super-admin roles get every `USER_*` permission from migration `V202611181000`.

> **Blogs page:** backed by `/api/v1/admin/blogs` and `/api/v1/admin/blog-categories`
> ([`blogs.md`](../backend/docs/api/blogs.md), [`blog-categories.md`](../backend/docs/api/blog-categories.md)).
> The editor is TipTap and only offers formatting the backend's HTML sanitizer keeps (no alignment, colors,
> strikethrough or embeds; content images must be `https` URLs).

## Scripts

| Command                                     | Does                                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `npm run dev`                               | dev server with HMR, calling `VITE_API_BASE_URL` (or proxying `/api` to `API_PROXY_TARGET`) |
| `npm run dev:mock`                          | dev server with MSW mocks instead of the backend                                            |
| `npm run build`                             | type check, then production build to `dist/`                                                |
| `npm run build:staging`                     | type check, then staging build (source maps on)                                             |
| `npm run preview`                           | serve `dist/` locally (with the same `/api` proxy)                                          |
| `npm run analyze`                           | production build plus `dist/stats.html` bundle treemap                                      |
| `npm run lint` / `lint:fix`                 | ESLint (type-aware, a11y, React hooks), zero warnings allowed                               |
| `npm run format` / `format:check`           | Prettier                                                                                    |
| `npm run typecheck`                         | `tsc -b` over app, test and config projects                                                 |
| `npm test` / `test:watch` / `test:coverage` | Jest + React Testing Library + MSW                                                          |
| `npm run audit:deps`                        | fails on high/critical advisories in production dependencies                                |

## Environments

The environment follows the Vite **mode**. `.env.development` only sets the backend URL for
`npm run dev`; everything else has safe defaults.

| Command                 | Mode        | `env.appEnv` | Mocks                               |
| ----------------------- | ----------- | ------------ | ----------------------------------- |
| `npm run dev`           | development | development  | off                                 |
| `npm run dev:mock`      | mock        | development  | on                                  |
| `npm run build:staging` | staging     | staging      | off                                 |
| `npm run build`         | production  | production   | off (mock code is not even bundled) |

Override single values with `VITE_*` variables: in CI/CD set them in the pipeline, locally copy
`.env.example` to `.env.local` (git-ignored; the repo ignores every `.env.*` except examples).
`src/config/env.ts` is the only module that reads `import.meta.env`, and validates it at startup.

> Every `VITE_*` value is compiled into public JavaScript. Never put API keys or secrets there.

In production the dashboard and the API must be **same-site** and on **HTTPS** (the session cookies
are `Secure; SameSite=Strict`): either one origin with a reverse proxy (`VITE_API_BASE_URL=/api/v1`,
no CORS needed) or sibling hosts such as `admin.example.com` + `api.example.com` (set
`VITE_API_BASE_URL=https://api.example.com/api/v1` and add the dashboard to the backend's
`CORS_ALLOWED_ORIGINS`).

## Architecture

```
src/
  app/          App, router, providers (theme, query, session), layouts, status pages
  assets/       images, icons, fonts bundled by Vite
  components/
    common/     reusable UI: Button, Input (RHF + MUI), Loader, Modal, ErrorBoundary,
                DataTable, Feedback (empty/error states), Notifier
    navigation/ Navbar (theme toggle, user menu), Sidebar (permission-filtered)
  features/     one folder per business feature (components, hooks, services, schemas, types, pages)
    auth/       login, registration, session bootstrap, route guards, permissions
    dashboard/  dashboard and activity log (system logs API)
    profile/    the signed-in user's profile
  hooks/        generic hooks (useDebounce, useLocalStorage)
  services/
    api/        Axios instance, CSRF and session-refresh interceptors, endpoints, ApiError
    queryClient.ts   React Query defaults and global error handling
    monitoring.ts    single error-reporting hook (plug Sentry in here)
  store/        Zustand: signed-in user (no tokens), UI, notifications
  theme/        MUI theme: palettes, typography, light/dark color schemes
  utils/        constants, formatters, helpers, security, file validation
  types/        shared API and common types
  config/       validated environment
  tests/        MSW handlers and mock backend, Jest setup, test utilities
  styles/       Tailwind entry and global base styles
```

**State has one owner each:** server data → React Query; form state → React Hook Form + Zod;
global client state (session, sidebar, notifications) → Zustand. Server data is never copied into
a store.

**Data flow:** page → feature hook (`useSystemLogs`) → feature service (`systemLogService`) →
`apiClient`. Every failed request is rejected with an `ApiError` (`status`, `code`, `message`,
`fieldErrors`, `retryAfterSeconds`) built from the backend's RFC 9457 problem details.

**Styling:** MUI renders components; Tailwind handles layout and spacing. MUI's styles go into the
`mui` CSS layer (`StyledEngineProvider enableCssLayer`) between Tailwind's base and utilities, so
utilities can override MUI. Tailwind Preflight is not loaded; `CssBaseline` is the only reset.
Tailwind colors (`bg-canvas`, `text-muted`, `bg-primary/10`, ...) are mapped to MUI's palette CSS
variables, so both follow the same theme and dark mode (`.dark` class set by MUI).

## Authentication

The session lives in **HttpOnly cookies** set by the backend
([`backend/docs/api/admin-auth.md`](../backend/docs/api/admin-auth.md)). JavaScript never sees a
token, so an XSS bug cannot steal the session.

| Cookie                | Sent to                      | Lifetime                           |
| --------------------- | ---------------------------- | ---------------------------------- |
| `admin_access_token`  | `/api/v1/admin/**`           | 15 minutes                         |
| `admin_refresh_token` | `/api/v1/admin/refresh` only | 30 days (rotated on every refresh) |
| `XSRF-TOKEN`          | the API (CSRF double submit) | browser session                    |

All are `HttpOnly; SameSite=Strict` and `Secure` outside local development. The client:

- sends every request with `withCredentials: true`; it never sets an `Authorization` header;
- fetches a CSRF token once from `GET /admin/csrf` (kept in memory) and sends it as `X-XSRF-TOKEN`
  on every `POST`/`PUT`/`PATCH`/`DELETE`; on `403 csrf_invalid` it fetches a new one and retries once;
- on startup asks `GET /admin/me` who is signed in, so **a reload keeps the session**; if the access
  cookie has expired it refreshes once;
- on a 401 while signed in, refreshes **once** (concurrent requests share one refresh call, because
  the backend revokes a session whose refresh token is reused) and retries the request once. A
  rejected refresh ends the session; login never triggers a refresh, so there is no refresh loop;
- keeps only the user (name, role, permissions) in the Zustand store, and reloads permissions from
  `GET /admin/me` regularly; UI and routes follow them.

**Permissions, not roles.** Roles are database rows that map to permission codes; the UI checks
codes (`usePermissions`, `PermissionGate`, `ProtectedRoute requiredPermissions`), never role names,
so new roles need no frontend change. These checks only hide UI. **The backend authorizes every
request**; frontend guards are not a security boundary.

## Security checklist

- Text is rendered through React (escaped). `dangerouslySetInnerHTML`, `innerHTML` and writing
  tokens to web storage are ESLint errors. Links built from user data go through `sanitizeUrl`.
- Inputs are validated with Zod (same rules as the backend: lengths, password policy) and again by
  the server; server field errors are shown on the matching field.
- Uploads: `validateUploadFile` checks the real file type from its first bytes, the extension and
  the size, mirroring the backend allow-list (JPEG, PNG, WebP, PDF, MP4; never SVG/HTML).
- The login redirect only accepts in-app paths (no open redirect).
- Session tokens are HttpOnly cookies; writes carry a CSRF token; no token ever touches web storage.
- Not indexed: `public/robots.txt` disallows all crawling, `index.html` has
  `<meta name="robots" content="noindex, nofollow">`, and the dev/preview servers send
  `X-Robots-Tag: noindex, nofollow` (send the same header from production hosting).
- No secrets in the bundle; env values are validated; mock code is excluded from production.
- `npm run audit:deps` checks production dependencies (run it in CI).

Recommended response headers from the web server/CDN (not set by Vite):

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:; connect-src 'self'; font-src 'self'; frame-ancestors 'none';
  base-uri 'self'; form-action 'self'
Strict-Transport-Security: max-age=63072000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-Robots-Tag: noindex, nofollow
```

With the API on another host, add it to `connect-src` (e.g. `connect-src 'self' https://api.example.com`).

`style-src 'unsafe-inline'` is needed by Emotion (MUI) unless you configure a CSP nonce. Serve
`index.html` with `Cache-Control: no-cache` and `/assets/*` (hashed names) with a long max-age.

## Testing

Jest runs in jsdom with SWC; MSW intercepts HTTP with the same handlers `dev:mock` uses
(`src/tests/handlers`), against an in-memory mock backend (`src/tests/mocks/mockDb.ts`). Requests
without a handler fail the test.

- `renderWithProviders(ui)` — theme, fresh React Query client, router; returns `user` (userEvent)
- `renderRoutes(routes, { initialPath })` — real route tree for guards and redirects
- `renderHookWithQuery(hook)` — hooks that use React Query
- `signInAs(mockUsers.admin)` — a session whose tokens the mock backend accepts

`import.meta.env` does not exist under Jest, so `@/config/env` is mapped to `src/tests/mocks/env.ts`.

## Git hooks

`npm install` points Git at `admin-web/.husky` (Husky runs from the repo root, so the hook applies
to the whole monorepo). The pre-commit hook runs lint-staged on staged `admin-web` files only:
ESLint `--fix` and Prettier. Type checking and tests belong in CI:
`npm ci && npm run typecheck && npm run lint && npm test && npm run build`.

## Adding a feature

1. `src/features/<name>/types` — API types matching `backend/docs/api/<name>.md`.
2. `services/<name>Service.ts` — calls through `apiClient` with `API_ENDPOINTS`.
3. `hooks/` — a query key factory plus `useQuery`/`useMutation` hooks (use `meta.invalidates`,
   `meta.successMessage`, `meta.suppressGlobalError` for cache and toast behaviour).
4. `pages/` — lazy-load the page in `app/router.tsx`, wrap it in `ProtectedRoute` with the
   permissions the backend requires, and add a `NAV_ITEMS` entry with the same permissions.
5. MSW handlers in `src/tests/handlers` and tests next to the code.
