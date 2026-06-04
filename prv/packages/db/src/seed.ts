// Development seed script — populates local DB with test data
// Run: pnpm db:seed
// NEVER run against production

import { db } from "./client"
import { migrationHistory } from "./schema/migration-history"

async function seed() {
  if (process.env["NODE_ENV"] === "production") {
    throw new Error("Seed script cannot run in production")
  }

  console.log("🌱 Seeding development database...")

  // Verify migration_history table exists and is accessible
  const existing = await db.select().from(migrationHistory).limit(1)
  console.log(`  ✓ migration_history table accessible (${existing.length} records)`)

  // Additional seed data added per sprint as schemas are defined
  // Sprint 03+: users, companies, roles

  console.log("✓ Seed complete")
  process.exit(0)
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err)
  process.exit(1)
})
