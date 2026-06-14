// Development seed script — populates local DB with test data
// Run: pnpm db:seed
// NEVER run against production

import { db } from "./client"
import { migrationHistory } from "./schema/migration-history"
import { seedRoles } from "./seeds/roles"
import { seedPermissions } from "./seeds/permissions"
import { seedRolePermissions } from "./seeds/role-permissions"
import { seedShop } from "./seeds/shop"
import { seedCompany } from "./seeds/company"
import { seedClients } from "./seeds/clients"
import { seedSuppliers } from "./seeds/suppliers"
import { seedRenovation } from "./seeds/renovation"
import { seedProjects } from "./seeds/projects"
import { seedFinance } from "./seeds/finance"
import { seedFleet } from "./seeds/fleet"
import { seedKnowledge } from "./seeds/knowledge"
import { seedLearning } from "./seeds/learning"
import { seedWorkforce } from "./seeds/workforce"

async function seed() {
  if (process.env["NODE_ENV"] === "production") {
    throw new Error("Seed script cannot run in production")
  }

  console.log("🌱 Seeding development database...")

  // Verify migration_history table exists and is accessible
  const existing = await db.select().from(migrationHistory).limit(1)
  console.log(`  ✓ migration_history table accessible (${existing.length} records)`)

  // Phase 03: System roles, permissions, role-permission mappings
  const roleIdMap = await seedRoles()
  const permissionIdMap = await seedPermissions()
  await seedRolePermissions(roleIdMap, permissionIdMap)

  // Sprint 13: Shop platform — categories, products, reviews
  await seedShop()

  // Demo company: PRV Renovations SRL + users
  const { companyId, storeId, ceoId, managerId, supervisorId, workerIds } = await seedCompany()

  // CRM: clients
  const { clientIds } = await seedClients(companyId)

  // Procurement: suppliers
  await seedSuppliers(companyId)

  // Core business: renovation projects
  const { projectIds: renovationProjectIds } = await seedRenovation({
    companyId,
    clientIds,
    managerId,
    supervisorId,
    workerIds,
  })

  // Project management: general projects
  const { projectIds } = await seedProjects({
    companyId,
    storeId,
    clientIds,
    ceoId,
    managerId,
    supervisorId,
    workerIds,
  })

  // Finance: invoices + expenses
  await seedFinance({
    companyId,
    storeId,
    clientIds,
    managerId,
    workerIds,
    renovationProjectIds,
  })

  // Fleet + tools
  await seedFleet({ companyId, storeId, supervisorId, workerIds })

  // Knowledge base
  await seedKnowledge({ companyId, managerId, supervisorId, workerIds })

  // Learning platform
  await seedLearning({ companyId, managerId, supervisorId, workerIds })

  // Workforce: attendance + shifts
  await seedWorkforce({
    companyId,
    storeId,
    managerId,
    supervisorId,
    workerIds,
    projectId: projectIds[0],
  })

  console.log("✅ Seed complete")
  process.exit(0)
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err)
  process.exit(1)
})
