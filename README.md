# Akarabo Studio Management System — Backend

NestJS + TypeScript backend for **Akarabo Studio** (weddings, birthdays, baby showers, bridal showers and other events). Covers authentication, customers, bookings, financial management, photo orders, workers, inventory and reporting.

## Stack

- **NestJS 11** (TypeScript, ES module imports/exports)
- **PostgreSQL** in development/production — with a zero-setup embedded fallback (`sqljs`) so the project runs without a local Postgres server
- **TypeORM** (chosen for native NestJS DI, real `EntityManager` transactions, DB-level constraints and migration tooling)
- **JWT** authentication (1-day tokens) + **bcryptjs** password hashing
- **class-validator / class-transformer** DTO validation (global `ValidationPipe`)
- **Swagger** for API exploration and testing

## Quick start

```bash
npm install
cp .env.example .env   # adjust values as needed
npm run start:dev      # http://localhost:3000/api/v1
```

Swagger UI: **http://localhost:3000/docs**

### Database modes (`.env`)

| `DB_TYPE` | Behaviour |
|---|---|
| `sqljs` (default) | Embedded SQLite-compatible file (`akarabo_dev.sqlite`). Zero setup — great for first run and CI |
| `postgres` | Real PostgreSQL using `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`, `DB_SSL` |

Migrations are the source of truth in every environment:

```bash
npm run migrate          # apply pending migrations
npm run migrate:revert   # revert the last applied migration
npm run seed             # create the initial OWNER account (idempotent)
```

Migrations live in `migrations/` at the project root (kept out of `src/` on
purpose) and are applied both by the scripts above and automatically when the
dev server starts. The build compiles them to `dist/migrations/` so the server
can apply them in any environment.

> `DB_SYNCHRONIZE=true` exists only for quick local prototyping — never use it in production.

## Scripts

| Command | Purpose |
|---|---|
| `npm run start:dev` | Dev server with watch |
| `npm run build` | Compile to `dist/` |
| `npm test` | Unit + integration + repository tests (Jest) |
| `npm run test:cov` | Coverage report |
| `npm run migrate` / `migrate:revert` | Apply / revert migrations |
| `npm run seed` | Seed the initial owner account |
| `npm run lint` | ESLint with auto-fix |
| `npm run format` | Prettier |

## Project structure

```
src/
  application/      domain layer — one folder per activity (user, authentication,
                    audit, ...): domain model, repository port
                    (*.repository.interface.ts), errors, builders, mocks and
                    unit tests
  service/          business logic — one folder per activity: service interface
                    + implementation (the only place rules live), service mocks
                    and service unit tests
  controller/       HTTP layer — one folder per activity: controllers, request /
                    response DTOs and integration tests; shared guards,
                    decorators and exception filters at the root
  module/           NestJS wiring, layer by layer: config, database, repository,
                    service, controller, utility modules
  persistence/      data access — TypeORM entities and repository adapters per
                    activity, database connection + migrate/seed scripts
  util/             small shared utilities (roles, system clock)
  main.module.ts    root module wiring the layers together
  setup-app.ts      shared HTTP pipeline (validation, filters, Swagger) used by
                    the server and the integration tests
  builders.ts       aggregated test builders
  mocks.ts          aggregated test mocks
  main.ts           bootstrap

migrations/         database migrations — one file per schema change, applied by
                    `npm run migrate` and automatically when the dev server starts
```

Tests live next to the code they cover: `*.test.ts` (unit), `*.integration-test.ts`
(HTTP pipeline with an in-memory database) and repository tests against real SQL.

All routes are versioned under `/api/v1`. Business logic lives in the service
layer (`src/service/`) — controllers only handle HTTP concerns, and all data
access goes through repository ports (`*.repository.interface.ts`) implemented
in `persistence/`.

## Implemented modules

| Area | Endpoints | Who can use them |
|---|---|---|
| Authentication | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | any active staff account |
| Users | `GET/POST /users`, `GET/PATCH /users/:id`, `POST /users/:id/deactivate` / `activate` | OWNER, MANAGER |
| Payments | `GET/POST /payments`, `GET /payments/:id`, `POST /payments/:id/reverse` | record/list: CASHIER, MANAGER, OWNER — reverse: MANAGER, OWNER |
| Expenses | `GET/POST /expenses`, `GET /expenses/:id`, `POST /expenses/:id/reverse` | record/list: CASHIER, MANAGER, OWNER — reverse: MANAGER, OWNER |
| Customers | `GET/POST /customers`, `GET/PATCH /customers/:id`, `POST /customers/:id/deactivate` / `reactivate` | read: all staff — manage: MANAGER, OWNER |
| Bookings | `GET/POST /bookings`, `GET/PATCH /bookings/:id`, `POST /bookings/:id/confirm` / `complete` / `cancel` | read: all staff — manage: MANAGER, OWNER |

Financial rules enforced by the finance module:

- records are **never deleted** — a mistake is reversed with a required reason,
  and every reversal is written to the audit trail;
- amounts must be positive (service check + database `CHECK` constraint);
- payment `reference` (receipt / mobile-money transaction id) is unique at the
  database level, so the same receipt cannot be entered twice;
- payments link to bookings through `bookingId` — a real foreign key, so a
  payment can only reference a booking that exists.

Customer & booking rules enforced by the module:

- a booking must reference an **existing, active customer** — deactivated
  customers cannot take new bookings (deactivation is a flag flip, never a
  delete, so history stays readable);
- phone numbers are unique across the customer base (service check + database
  unique index);
- the event date must be a real calendar day, **today or later**;
- one customer can hold at most one **active (non-cancelled) booking per day**,
  enforced by a partial unique index in the database;
- the booking lifecycle is `PENDING → CONFIRMED → COMPLETED`; cancelling is
  allowed from `PENDING`/`CONFIRMED` and always requires a reason — bookings
  are **never deleted**, and every edit or lifecycle move hits the audit trail.
