# Property Platform

Monorepo for the property listing platform.

| Folder | App | Tech |
|---|---|---|
| [`backend/`](backend/) | REST API (`/api/v1`) | Java 17, Spring Boot 4, PostgreSQL, Flyway |
| [`admin-web/`](admin-web/) | Admin dashboard | React.js |
| [`mobile/`](mobile/) | User app | React Native |

## Getting started

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev   # http://localhost:8080
```

See [`backend/CLAUDE.md`](backend/CLAUDE.md) for API conventions, security rules and the database workflow,
and [`backend/docs/api`](backend/docs/api) for endpoint docs used by the clients.

## Git workflow

- `main` is always deployable; work on short-lived branches (`feature/...`, `fix/...`) and merge via pull request.
- One PR may touch several apps (e.g. a new endpoint plus the admin screen that uses it).
- Prefix commit subjects with the app when it helps: `backend: add blog categories`, `admin-web: banner list`.
- Never commit secrets; copy `.env.example` to `.env` locally.
