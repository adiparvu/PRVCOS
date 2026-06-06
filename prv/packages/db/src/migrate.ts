import { createHash } from "crypto"
import { readdir, readFile } from "fs/promises"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import postgres from "postgres"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Migration runner — tracks applied migrations in migration_history table
// Uses direct connection (not PgBouncer) for DDL statements

interface MigrationFile {
  version: string
  name: string
  path: string
  checksum: string
  sql: string
}

async function loadMigrationFiles(migrationsDir: string): Promise<MigrationFile[]> {
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort()

  const migrations: MigrationFile[] = []

  for (const file of files) {
    const path = join(migrationsDir, file)
    const sql = await readFile(path, "utf-8")
    const checksum = createHash("sha256").update(sql).digest("hex")
    // File format: 0001_create_migration_history.sql
    const [version, ...nameParts] = file.replace(".sql", "").split("_")
    migrations.push({
      version: version ?? file,
      name: nameParts.join("_"),
      path,
      checksum,
      sql,
    })
  }

  return migrations
}

async function getAppliedMigrations(sql: postgres.Sql): Promise<Set<string>> {
  try {
    const rows = await sql<{ version: string }[]>`
      SELECT version FROM migration_history WHERE success = true ORDER BY version
    `
    return new Set(rows.map((r) => r.version))
  } catch {
    // Table doesn't exist yet — first run
    return new Set()
  }
}

export async function runMigrations(migrationsDir: string): Promise<void> {
  const directUrl = process.env["DATABASE_DIRECT_URL"]
  if (!directUrl) throw new Error("DATABASE_DIRECT_URL is required for migrations")

  const sql = postgres(directUrl, { max: 1 })

  try {
    const migrations = await loadMigrationFiles(migrationsDir)
    const applied = await getAppliedMigrations(sql)
    const pending = migrations.filter((m) => !applied.has(m.version))

    if (pending.length === 0) {
      console.log("✓ No pending migrations")
      return
    }

    for (const migration of pending) {
      const start = Date.now()
      console.log(`  → Applying ${migration.version}_${migration.name}...`)

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

        console.log(`  ✓ Applied ${migration.version}_${migration.name} (${Date.now() - start}ms)`)
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

// CLI entry point — invoked via `pnpm db:migrate:run` (tsx src/migrate.ts)
const isMain = process.argv[1]?.endsWith("migrate.ts") || process.argv[1]?.endsWith("migrate.js")

if (isMain) {
  const migrationsDir = join(__dirname, "..", "migrations", "sql")
  runMigrations(migrationsDir)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err instanceof Error ? err.message : err)
      process.exit(1)
    })
}
