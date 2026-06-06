import { db } from "../client"
import { rolePermissions } from "../schema/rbac"
import { and, eq, inArray } from "drizzle-orm"

// ─── Role-set membership (mirrors RoleSets in @prv/auth) ─────────────────────

const ADMIN_SLUGS = ["group_ceo", "ceo", "co_ceo", "system_administrator"] as const

const MANAGEMENT_SLUGS = [
  ...ADMIN_SLUGS,
  "operations_manager",
  "department_head",
  "hr_payroll",
  "project_director",
  "shop_director",
] as const

const SUPERVISOR_SLUGS = [
  ...MANAGEMENT_SLUGS,
  "team_leader",
  "oms",
  "project_oms",
  "project_operations_manager",
  "store_manager",
] as const

const ANALYTICS_SLUGS = [
  ...MANAGEMENT_SLUGS,
  "data_analyst",
  "app_support_specialist",
  "qa_tester",
] as const

const EMPLOYEE_SLUGS = [
  ...SUPERVISOR_SLUGS,
  "worker",
  "project_worker",
  "project_team_leader",
  "seller",
] as const

// ─── Permission → required role set (mirrors PERMISSION_CATALOG) ─────────────
// Only the role-set name is stored here; the actual slug lists are above.

type RoleSetName = "admin" | "management" | "supervisor" | "analytics" | "employee"

const ROLE_SET_MAP: Record<RoleSetName, readonly string[]> = {
  admin: ADMIN_SLUGS,
  management: MANAGEMENT_SLUGS,
  supervisor: SUPERVISOR_SLUGS,
  analytics: ANALYTICS_SLUGS,
  employee: EMPLOYEE_SLUGS,
}

const PERMISSION_ROLE_SETS: Record<string, RoleSetName> = {
  // Employees
  "employees.read": "supervisor",
  "employees.create": "management",
  "employees.update": "management",
  "employees.delete": "admin",
  "employees.suspend": "management",
  "employees.export": "management",

  // Clients
  "clients.read": "management",
  "clients.create": "management",
  "clients.update": "management",
  "clients.delete": "admin",

  // Suppliers
  "suppliers.read": "management",
  "suppliers.create": "management",
  "suppliers.update": "management",
  "suppliers.delete": "admin",

  // Projects
  "projects.read": "supervisor",
  "projects.create": "management",
  "projects.update": "management",
  "projects.delete": "admin",
  "projects.archive": "management",

  // Products
  "products.read": "supervisor",
  "products.create": "management",
  "products.update": "management",
  "products.delete": "admin",

  // Orders
  "orders.read": "supervisor",
  "orders.create": "supervisor",
  "orders.update": "supervisor",
  "orders.cancel": "management",

  // Invoices
  "invoices.read": "management",
  "invoices.create": "management",
  "invoices.update": "management",
  "invoices.delete": "admin",
  "invoices.send": "management",

  // Documents
  "documents.read": "supervisor",
  "documents.create": "supervisor",
  "documents.update": "supervisor",
  "documents.delete": "management",
  "documents.sign": "management",

  // Fleet
  "fleet.read": "management",
  "fleet.create": "management",
  "fleet.update": "management",
  "fleet.assign": "management",

  // Tools
  "tools.read": "supervisor",
  "tools.create": "management",
  "tools.update": "management",
  "tools.assign": "supervisor",

  // Teams
  "teams.read": "supervisor",
  "teams.create": "management",
  "teams.update": "management",
  "teams.delete": "admin",

  // Companies
  "companies.read": "admin",
  "companies.update": "admin",
  "companies.suspend": "admin",

  // Roles
  "roles.read": "management",
  "roles.assign": "admin",

  // Analytics
  "analytics.read": "analytics",
  "analytics.export": "analytics",

  // Social profiles
  "social_profiles.view": "employee",
  "social_profiles.edit_own": "employee",
  "social_profiles.edit_others": "management",
  "social_profiles.delete_own": "employee",
  "social_profiles.delete_others": "management",

  // Presence
  "presence.view_team": "employee",
  "presence.view_company": "management",
  "presence.set_manual": "employee",
  "presence.override_others": "management",

  // Business cards
  "business_card.view_own": "employee",
  "business_card.view_others": "employee",
  "business_card.share": "employee",
  "business_card.public_link": "management",

  // GDPR
  "data_export.gdpr": "admin",

  // Settings
  "settings.company.read": "management",
  "settings.company.update": "admin",
  "settings.security.read": "management",
  "settings.security.update": "admin",
}

export async function seedRolePermissions(
  roleIdMap: Map<string, string>,
  permissionIdMap: Map<string, string>
): Promise<void> {
  console.log("  → Seeding role-permission mappings...")

  let inserted = 0
  let skipped = 0

  for (const [permKey, roleSetName] of Object.entries(PERMISSION_ROLE_SETS)) {
    const permId = permissionIdMap.get(permKey)
    if (!permId) {
      console.warn(`    ⚠ permission not found in map: ${permKey}`)
      continue
    }

    const roleSlugs = ROLE_SET_MAP[roleSetName]
    for (const slug of roleSlugs) {
      const roleId = roleIdMap.get(slug)
      if (!roleId) {
        console.warn(`    ⚠ role not found in map: ${slug}`)
        continue
      }

      // Check for existing mapping to keep the seed idempotent
      const [existing] = await db
        .select({ id: rolePermissions.id })
        .from(rolePermissions)
        .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permId)))
        .limit(1)

      if (!existing) {
        await db.insert(rolePermissions).values({ roleId, permissionId: permId })
        inserted++
      } else {
        skipped++
      }
    }
  }

  console.log(`  ✓ ${inserted} role-permission mappings inserted, ${skipped} already existed`)
}
