import { createHash } from "crypto"
import { readdir, readFile } from "fs/promises"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import postgres from "postgres"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Migration runner — tracks applied migrations in the migration_history table.
// Uses the direct connection (not PgBouncer) because DDL is unreliable through a
// transaction-mode pooler.
//
// The canonical migration set is packages/db/migrations/*.sql (0000–00NN). The
// legacy bootstrap set in migrations/sql/ predates it and is kept for history;
// it is NOT applied by the default CLI. See MIGRATIONS.md.
//
// A migration is keyed by its FULL tag (e.g. "0042_add_widgets"), not by the
// numeric prefix alone: the two folders both contain 0001/0002/0003, so a
// numeric key would make distinct migrations collide and be silently skipped.

interface MigrationFile {
  version: string
  name: string
  path: string
  checksum: string
  sql: string
}

/** Longest tag today is 42 chars; leave generous headroom. */
const VERSION_COLUMN_LEN = 128

async function loadMigrationFiles(migrationsDir: string): Promise<MigrationFile[]> {
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort()

  const migrations: MigrationFile[] = []

  for (const file of files) {
    const path = join(migrationsDir, file)
    const sql = await readFile(path, "utf-8")
    const checksum = createHash("sha256").update(sql).digest("hex")
    // File format: 0001_create_migration_history.sql → version is the full tag.
    const tag = file.replace(/\.sql$/, "")
    const [, ...nameParts] = tag.split("_")
    migrations.push({
      version: tag,
      name: nameParts.join("_") || tag,
      path,
      checksum,
      sql,
    })
  }

  return migrations
}

/**
 * Create the history table if absent and widen `version` if an older, narrower
 * definition exists. Self-bootstrapping: the runner must not depend on a
 * migration file to create its own bookkeeping table.
 */
async function ensureHistoryTable(sql: postgres.Sql): Promise<void> {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS migration_history (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      version           VARCHAR(${VERSION_COLUMN_LEN}) NOT NULL UNIQUE,
      name              VARCHAR(255) NOT NULL,
      applied_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      applied_by        VARCHAR(100) NOT NULL DEFAULT 'system',
      checksum          VARCHAR(64) NOT NULL,
      execution_time_ms TEXT,
      success           BOOLEAN NOT NULL DEFAULT TRUE,
      error_message     TEXT
    )
  `)
  // Idempotent widening for databases created with the original VARCHAR(32).
  await sql.unsafe(
    `ALTER TABLE migration_history ALTER COLUMN version TYPE VARCHAR(${VERSION_COLUMN_LEN})`
  )
}

interface AppliedMigration {
  version: string
  checksum: string
}

async function getAppliedMigrations(sql: postgres.Sql): Promise<Map<string, string>> {
  const rows = await sql<AppliedMigration[]>`
    SELECT version, checksum FROM migration_history WHERE success = true ORDER BY version
  `
  return new Map(rows.map((r) => [r.version, r.checksum]))
}

/**
 * Legacy rows are keyed by a bare 4-digit prefix (the old runner's format).
 * Their presence means this database was provisioned from migrations/sql/, so
 * re-running the canonical set on top would attempt to recreate existing
 * objects. Refuse loudly rather than corrupt the schema.
 */
function assertNoLegacyKeys(applied: Map<string, string>): void {
  const legacy = [...applied.keys()].filter((v) => /^\d{4}$/.test(v))
  if (legacy.length === 0) return
  throw new Error(
    `This database was provisioned with the legacy bootstrap set (migration_history ` +
      `contains numeric-only versions: ${legacy.join(", ")}). The canonical set in ` +
      `packages/db/migrations/ cannot be applied on top of it automatically. ` +
      `Reconcile manually (see MIGRATIONS.md) before running this command.`
  )
}

/** Applied files whose content changed since they were applied. */
function detectDrift(migrations: MigrationFile[], applied: Map<string, string>): string[] {
  return migrations
    .filter((m) => {
      const prev = applied.get(m.version)
      return prev !== undefined && prev !== m.checksum
    })
    .map((m) => m.version)
}

export async function runMigrations(migrationsDir: string): Promise<void> {
  const directUrl = process.env["DATABASE_DIRECT_URL"]
  if (!directUrl) throw new Error("DATABASE_DIRECT_URL is required for migrations")

  const sql = postgres(directUrl, { max: 1 })

  try {
    const migrations = await loadMigrationFiles(migrationsDir)
    await ensureHistoryTable(sql)
    const applied = await getAppliedMigrations(sql)

    assertNoLegacyKeys(applied)

    const drifted = detectDrift(migrations, applied)
    if (drifted.length > 0) {
      throw new Error(
        `Checksum mismatch — these already-applied migrations were edited after ` +
          `they ran: ${drifted.join(", ")}. Applied migrations are immutable; ` +
          `add a new migration instead of editing an old one.`
      )
    }

    const pending = migrations.filter((m) => !applied.has(m.version))

    if (pending.length === 0) {
      console.log("✓ No pending migrations")
      return
    }

    for (const migration of pending) {
      const start = Date.now()
      console.log(`  → Applying ${migration.version}...`)

      try {
        await sql.begin(async (tx) => {
          await tx.unsafe(migration.sql)

          await tx`
            INSERT INTO migration_history (version, name, applied_by, checksum, execution_time_ms, success)
            VALUES (
              ${migration.version},
              ${migration.name},
              ${"migration-runner"},
              ${migration.checksum},
              ${String(Date.now() - start)},
              ${true}
            )
          `
        })

        console.log(`  ✓ Applied ${migration.version} (${Date.now() - start}ms)`)
      } catch (err) {
        await sql`
          INSERT INTO migration_history (version, name, applied_by, checksum, success, error_message)
          VALUES (
            ${migration.version},
            ${migration.name},
            ${"migration-runner"},
            ${migration.checksum},
            ${false},
            ${err instanceof Error ? err.message : String(err)}
          )
        `.catch(() => {})

        throw new Error(
          `Migration ${migration.version} failed: ${err instanceof Error ? err.message : err}`
        )
      }
    }

    console.log(`✓ Applied ${pending.length} migration(s)`)
  } finally {
    await sql.end()
  }
}

/** The canonical migration directory — packages/db/migrations. */
export function canonicalMigrationsDir(): string {
  return join(__dirname, "..", "migrations")
}

// CLI entry point — invoked via `pnpm db:migrate:run` (tsx src/migrate.ts)
const isMain = process.argv[1]?.endsWith("migrate.ts") || process.argv[1]?.endsWith("migrate.js")

if (isMain) {
  // Optional positional arg selects a different set (CI still bootstraps from
  // migrations/sql/). Defaults to the canonical migrations directory.
  const argDir = process.argv[2]
  const target = argDir ? join(process.cwd(), argDir) : canonicalMigrationsDir()
  runMigrations(target)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err instanceof Error ? err.message : err)
      process.exit(1)
    })
}
