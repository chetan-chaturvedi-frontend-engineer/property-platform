# CLAUDE.md

Admin dashboard (React 19, TypeScript strict, Vite, MUI 7 + Tailwind 4, React Query, React Hook Form + Zod,
Zustand, Axios). See `README.md` for architecture, auth flow and environments. Run commands from `admin-web/`.

## Commands

```bash
npm run dev:mock      # no backend (MSW); accounts in README
npm run dev           # proxies /api to ../backend on :8080
npm run typecheck && npm run lint && npm test && npm run build   # all must pass before a task is done
```

## Rules

- Feature code lives in `src/features/<name>/` (types → service → hooks → components/pages). Shared UI goes
  in `src/components`, only when two features need it.
- API calls only through `apiClient` (`services/api/axiosInstance.ts`) and `API_ENDPOINTS`. Types must match
  `../backend/docs/api`; when an endpoint changes, update the types, the MSW handler and the tests together.
- Server data stays in React Query (query key factory per feature). Do not copy it into Zustand. Zustand is
  for global client state only (session, UI, notifications).
- Forms: React Hook Form + a Zod schema mirroring the backend's validation; map server field errors with
  `applyServerErrors`.
- Authorization checks use permission codes (`usePermissions`, `PermissionGate`,
  `ProtectedRoute requiredPermissions`), never role names. They only hide UI; the backend enforces access.
- The session is HttpOnly cookies set by the backend: never read, store or send tokens from JavaScript, and never
  add an `Authorization` header. Requests use `withCredentials`; writes get the CSRF header from `services/api/csrf.ts`.
  Never write personal data to localStorage/sessionStorage, never use `dangerouslySetInnerHTML`, and pass
  user-supplied URLs through `sanitizeUrl`.
- `import.meta.env` is read only in `src/config/env.ts` (and the mock switch in `main.tsx`). Never add secrets
  to `VITE_*` variables.
- Lazy-load pages in `app/router.tsx`. Prefer MUI components for widgets, Tailwind for layout/spacing.
- No `any`. Named exports. Comments only where intent is not obvious.
- Components must be reusable; follow the React best practices in `src/CLAUDE.md`.

## Tests

Jest + React Testing Library + MSW (`src/tests`). Use `renderWithProviders`, `renderRoutes`,
`renderHookWithQuery` and `signInAs` from `src/tests/utils/testUtils.tsx`. Unhandled requests fail tests,
so add a handler for every new endpoint. Every new page or hook ships with tests.
