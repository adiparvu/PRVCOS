import { readFile } from "fs/promises"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import postgres from "postgres"

// Rollback runner — reverses the latest successfully applied migration.
//
// Convention: for each forward migration `NNNN_name.sql` there may be an
// optional sibling `NNNN_name_down.sql`. If no down file exists the rollback
// is refused with a clear error — use this as a forcing function to write
// down migrations alongside every forward migration.
//
// IMPORTANT: rollback is a destructive, production-impacting operation.
// Always take a database backup before rolling back in staging/production.

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface AppliedMigration {
  version: string
  name: string
}

async function getLatestAppliedMigration(sql: postgres.Sql): Promise<AppliedMigration | null> {
  try {
    const rows = await sql<AppliedMigration[]>`
      SELECT version, name FROM migration_history
      WHERE success = true
      ORDER BY version DESC
      LIMIT 1
    `
    return rows[0] ?? null
  } catch {
    return null
  }
}

export async function rollbackLatestMigration(migrationsDir: string): Promise<void> {
  const directUrl = process.env["DATABASE_DIRECT_URL"]
  if (!directUrl) throw new Error("DATABASE_DIRECT_URL is required for rollback")

  const sql = postgres(directUrl, { max: 1 })

  try {
    const latest = await getLatestAppliedMigration(sql)

    if (!latest) {
      console.log("✓ Nothing to roll back — migration_history is empty")
      return
    }

    const downFile = join(migrationsDir, `${latest.version}_${latest.name}_down.sql`)

    let downSql: string
    try {
      downSql = await readFile(downFile, "utf-8")
    } catch {
      throw new Error(
        `No down migration found for ${latest.version}_${latest.name}.\n` +
          `Create ${downFile} to enable rollback for this migration.`
      )
    }

    console.log(`  → Rolling back ${latest.version}_${latest.name}...`)

    await sql.begin(async (tx) => {
      await tx.unsafe(downSql)
      await tx`DELETE FROM migration_history WHERE version = ${latest.version}`
    })

    console.log(`  ✓ Rolled back ${latest.version}_${latest.name}`)
  } finally {
    await sql.end()
  }
}

// CLI entry point — invoked via `pnpm db:rollback`
const isMain = process.argv[1]?.endsWith("rollback.ts") || process.argv[1]?.endsWith("rollback.js")

if (isMain) {
  const migrationsDir = join(__dirname, "..", "migrations", "sql")
  rollbackLatestMigration(migrationsDir)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Rollback failed:", err instanceof Error ? err.message : err)
      process.exit(1)
    })
}
