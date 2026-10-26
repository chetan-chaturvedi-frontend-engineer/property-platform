# CLAUDE.md

Monorepo for the property listing platform. Each app has its own rules file; read the one for the app you touch.

| Folder | App | Rules |
|---|---|---|
| `backend/` | Spring Boot REST API | `backend/CLAUDE.md` |
| `admin-web/` | React.js admin dashboard (`/api/v1/auth/**`, `/api/v1/admin/**`) | not scaffolded yet |
| `mobile/` | React Native user app (`/api/v1/auth/**`, `/api/v1/public/**`, `/api/v1/**`) | not scaffolded yet |

- Run each app's commands from inside its folder (e.g. `cd backend && ./mvnw test`).
- API contracts for the clients live in `backend/docs/api`; update them in the same change as the endpoint.
