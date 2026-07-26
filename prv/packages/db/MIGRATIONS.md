# Database provisioning & migrations

## TL;DR

| Goal | Command |
|---|---|
| Provision a **fresh** database (staging/production/CI) | `pnpm --filter @prv/db db:provision` |
| Apply pending SQL migrations to an **existing** database | `pnpm --filter @prv/db db:migrate:run` |

Both require `DATABASE_DIRECT_URL` (the direct 5432 connection, **not** the
PgBouncer pooler on 6543 — DDL is unreliable through a transaction-mode pooler).

## The schema is the source of truth

`packages/db/src/schema/*.ts` defines **179 tables** and is authoritative.
`db:provision` materialises exactly that, in two steps:

1. `db:extensions` — installs `pgcrypto` (for `gen_random_uuid()`) and `vector`
   (pgvector, for the AI embedding column). These must exist *before* the schema
   is created. Supabase ships both; a self-hosted Postgres needs pgvector
   installed at the OS level or this step fails loudly.
2. `drizzle-kit push` — creates the schema from the TypeScript definitions.

## Why not the SQL migration files?

`packages/db/migrations/*.sql` is a **historical record, not a provisioning
path**. Verified by applying all 78 files in order to an empty PostgreSQL 16
database:

* **60 applied, 18 failed** → only 102 of 179 tables were created.
* The failures are unmet dependencies: migrations reference tables and enum
  types that no migration in the set ever creates — e.g. `purchase_orders`,
  `announcements`, `attendance_records`, `shifts`, `renovation_projects`,
  `renovation_phases`, `payroll_runs`, `supplier_invoices`,
  `safety_training_records`, `safety_inspections`, and the types
  `expense_category`, `leave_type`, `shift_status`.

Those objects exist in the Drizzle schema but were never captured as migrations,
so the folder cannot rebuild the database on its own. **Do not use it to
provision a fresh environment.** It remains valid for replaying an individual
incremental change against a database that already has the base schema.

The Drizzle journal (`migrations/meta/_journal.json`) lists only 7 of the 78
files, so `drizzle-kit migrate` would silently apply a fraction of them. Prefer
`db:provision`.

## The incremental runner (`db:migrate:run`)

`src/migrate.ts` applies `migrations/*.sql` that have not been recorded yet:

* Each migration is keyed by its **full tag** (e.g. `0042_add_widgets`), not the
  numeric prefix — the legacy `migrations/sql/` bootstrap set also contains
  `0001`/`0002`/`0003`, and a numeric key would make distinct migrations collide
  and be silently skipped.
* It **self-bootstraps** `migration_history` (and widens the legacy
  `version VARCHAR(32)` column, too narrow for full tags).
* Each file runs in its own transaction; a failure is recorded and aborts the run.
* **Checksum drift is now rejected**: editing an already-applied migration fails
  the run instead of being ignored. Applied migrations are immutable — add a new
  one instead.
* A database still carrying legacy numeric-only history rows is **refused** with
  an explanatory error rather than being half-migrated.

## Legacy bootstrap set

`migrations/sql/` (3 files) predates the Drizzle set and is no longer wired to
any command. It is kept for history. Applying it and the canonical set to the
same database is not supported.
