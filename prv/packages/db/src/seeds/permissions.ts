import { db } from "../client"
import { permissions } from "../schema/rbac"
import { eq } from "drizzle-orm"

// 74 permissions from PERMISSION_CATALOG — materialized in DB for runtime grants
// key format: "<module>.<action>" (mirrors PermissionKey type in @prv/auth)
const PERMISSION_ROWS = [
  // ── Employees ──────────────────────────────────────────────────────────
  { key: "employees.read", module: "employees", action: "read" },
  { key: "employees.create", module: "employees", action: "create" },
  { key: "employees.update", module: "employees", action: "update" },
  { key: "employees.delete", module: "employees", action: "delete" },
  { key: "employees.suspend", module: "employees", action: "suspend" },
  { key: "employees.export", module: "employees", action: "export" },

  // ── Clients / CRM ──────────────────────────────────────────────────────
  { key: "clients.read", module: "clients", action: "read" },
  { key: "clients.create", module: "clients", action: "create" },
  { key: "clients.update", module: "clients", action: "update" },
  { key: "clients.delete", module: "clients", action: "delete" },

  // ── Suppliers ──────────────────────────────────────────────────────────
  { key: "suppliers.read", module: "suppliers", action: "read" },
  { key: "suppliers.create", module: "suppliers", action: "create" },
  { key: "suppliers.update", module: "suppliers", action: "update" },
  { key: "suppliers.delete", module: "suppliers", action: "delete" },

  // ── Projects ───────────────────────────────────────────────────────────
  { key: "projects.read", module: "projects", action: "read" },
  { key: "projects.create", module: "projects", action: "create" },
  { key: "projects.update", module: "projects", action: "update" },
  { key: "projects.delete", module: "projects", action: "delete" },
  { key: "projects.archive", module: "projects", action: "archive" },

  // ── Products ───────────────────────────────────────────────────────────
  { key: "products.read", module: "products", action: "read" },
  { key: "products.create", module: "products", action: "create" },
  { key: "products.update", module: "products", action: "update" },
  { key: "products.delete", module: "products", action: "delete" },

  // ── Orders ─────────────────────────────────────────────────────────────
  { key: "orders.read", module: "orders", action: "read" },
  { key: "orders.create", module: "orders", action: "create" },
  { key: "orders.update", module: "orders", action: "update" },
  { key: "orders.cancel", module: "orders", action: "cancel" },

  // ── Invoices ───────────────────────────────────────────────────────────
  { key: "invoices.read", module: "invoices", action: "read" },
  { key: "invoices.create", module: "invoices", action: "create" },
  { key: "invoices.update", module: "invoices", action: "update" },
  { key: "invoices.delete", module: "invoices", action: "delete" },
  { key: "invoices.send", module: "invoices", action: "send" },

  // ── Documents ──────────────────────────────────────────────────────────
  { key: "documents.read", module: "documents", action: "read" },
  { key: "documents.create", module: "documents", action: "create" },
  { key: "documents.update", module: "documents", action: "update" },
  { key: "documents.delete", module: "documents", action: "delete" },
  { key: "documents.sign", module: "documents", action: "sign" },

  // ── Fleet / Vehicles ───────────────────────────────────────────────────
  { key: "fleet.read", module: "fleet", action: "read" },
  { key: "fleet.create", module: "fleet", action: "create" },
  { key: "fleet.update", module: "fleet", action: "update" },
  { key: "fleet.assign", module: "fleet", action: "assign" },

  // ── Tools ──────────────────────────────────────────────────────────────
  { key: "tools.read", module: "tools", action: "read" },
  { key: "tools.create", module: "tools", action: "create" },
  { key: "tools.update", module: "tools", action: "update" },
  { key: "tools.assign", module: "tools", action: "assign" },

  // ── Teams ──────────────────────────────────────────────────────────────
  { key: "teams.read", module: "teams", action: "read" },
  { key: "teams.create", module: "teams", action: "create" },
  { key: "teams.update", module: "teams", action: "update" },
  { key: "teams.delete", module: "teams", action: "delete" },

  // ── Companies ──────────────────────────────────────────────────────────
  { key: "companies.read", module: "companies", action: "read" },
  { key: "companies.update", module: "companies", action: "update" },
  { key: "companies.suspend", module: "companies", action: "suspend" },

  // ── Roles / Permissions ────────────────────────────────────────────────
  { key: "roles.read", module: "roles", action: "read" },
  { key: "roles.assign", module: "roles", action: "assign" },

  // ── Analytics ──────────────────────────────────────────────────────────
  { key: "analytics.read", module: "analytics", action: "read" },
  { key: "analytics.export", module: "analytics", action: "export" },

  // ── Social Profiles ────────────────────────────────────────────────────
  { key: "social_profiles.view", module: "social_profiles", action: "view" },
  { key: "social_profiles.edit_own", module: "social_profiles", action: "edit_own" },
  { key: "social_profiles.edit_others", module: "social_profiles", action: "edit_others" },
  { key: "social_profiles.delete_own", module: "social_profiles", action: "delete_own" },
  { key: "social_profiles.delete_others", module: "social_profiles", action: "delete_others" },

  // ── Presence ───────────────────────────────────────────────────────────
  { key: "presence.view_team", module: "presence", action: "view_team" },
  { key: "presence.view_company", module: "presence", action: "view_company" },
  { key: "presence.set_manual", module: "presence", action: "set_manual" },
  { key: "presence.override_others", module: "presence", action: "override_others" },

  // ── Digital Business Cards ─────────────────────────────────────────────
  { key: "business_card.view_own", module: "business_card", action: "view_own" },
  { key: "business_card.view_others", module: "business_card", action: "view_others" },
  { key: "business_card.share", module: "business_card", action: "share" },
  { key: "business_card.public_link", module: "business_card", action: "public_link" },

  // ── Data Export (GDPR) ─────────────────────────────────────────────────
  { key: "data_export.gdpr", module: "data_export", action: "gdpr" },

  // ── Settings ───────────────────────────────────────────────────────────
  { key: "settings.company.read", module: "settings", action: "company.read" },
  { key: "settings.company.update", module: "settings", action: "company.update" },
  { key: "settings.security.read", module: "settings", action: "security.read" },
  { key: "settings.security.update", module: "settings", action: "security.update" },
] as const

export async function seedPermissions(): Promise<Map<string, string>> {
  console.log("  → Seeding permissions catalog...")

  const permissionIdMap = new Map<string, string>()

  for (const perm of PERMISSION_ROWS) {
    const [existing] = await db
      .select({ id: permissions.id })
      .from(permissions)
      .where(eq(permissions.key, perm.key))
      .limit(1)

    if (existing) {
      permissionIdMap.set(perm.key, existing.id)
    } else {
      const [inserted] = await db
        .insert(permissions)
        .values({
          key: perm.key,
          module: perm.module,
          action: perm.action,
        })
        .returning({ id: permissions.id })
      if (inserted) permissionIdMap.set(perm.key, inserted.id)
    }
  }

  console.log(`  ✓ ${PERMISSION_ROWS.length} permissions seeded`)
  return permissionIdMap
}
