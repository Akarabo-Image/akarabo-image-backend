# Source layout

The backend follows a layered (ports & adapters) structure. Every business
activity — `user`, `authentication`, `audit`, `payment`, `expense`, `customer`,
`booking`, and later `photo`, `worker`, `inventory`, `report` — appears in
four places:

| Layer | Folder | Contains |
|---|---|---|
| Domain | `application/<activity>/` | domain model, repository port (`*.repository.interface.ts`), errors, builders, mocks, unit tests |
| Business logic | `service/<activity>/` | service interface + implementation (the only place rules live), service mocks (`*.service.mock.ts`), service unit tests |
| HTTP | `controller/<activity>/` | controllers, request/response DTOs, integration tests |
| Data access | `persistence/<activity>/` | TypeORM entities, repository adapter (`*.repository.ts`), repository tests |

Cross-cutting pieces:

- `controller/` root — global guards (`authentication.guard.ts`, `roles.guard.ts`),
  decorators (`@Public`, `@Roles`, `@CurrentUser`) and exception filters that map
  domain errors to HTTP status codes (400, 401, 403, 404, 409).
- `module/` — NestJS wiring, one module per layer: `config`, `database`,
  `repository`, `service`, `controller`, `utility`.
- `persistence/` root — database connection settings shared by the server and
  the `migrate`/`seed` scripts. The migrations themselves live outside `src/`,
  in the top-level `migrations/` folder.
- `util/` — small helpers (`Role` enum, system clock).
- `main.module.ts` — root module; `setup-app.ts` — the HTTP pipeline shared by
  the server and integration tests; `builders.ts` / `mocks.ts` — test toolkit.

## Rules of thumb

1. Services contain business logic; controllers only translate HTTP.
2. Services never import from `persistence/` or `controller/` — they depend on
   repository ports (interfaces) injected by token.
3. Domain errors extend `NotFoundError` / `AccessDeniedError` (or are caught by
   a dedicated filter) so a single controller filter maps them to responses.
4. Users, customers and bookings are never deleted — deactivate/cancel instead.
5. Tests sit next to what they test: `*.test.ts` (unit),
   `*.integration-test.ts` (real HTTP + in-memory database), repository tests
   against real SQL (in-memory sqljs).
