import { db } from "../client"
import { roles } from "../schema/rbac"
import { and, eq, isNull } from "drizzle-orm"

// 21 system roles — seeded once, never modified by users
const SYSTEM_ROLES = [
  // ── Core leadership ──────────────────────────────────────────────────────
  {
    slug: "group_ceo",
    name: "Group CEO",
    description: "Chief Executive Officer with visibility across all companies in the group",
    defaultScopeLevel: "SCOPE_GROUP",
  },
  {
    slug: "ceo",
    name: "CEO",
    description: "Chief Executive Officer for a single company",
    defaultScopeLevel: "SCOPE_COMPANY",
  },
  {
    slug: "co_ceo",
    name: "Co-CEO",
    description: "Co-Chief Executive Officer — same authority as CEO within the company",
    defaultScopeLevel: "SCOPE_COMPANY",
  },
  {
    slug: "system_administrator",
    name: "System Administrator",
    description: "Platform-level administrator — full technical access",
    defaultScopeLevel: "SCOPE_PLATFORM",
  },

  // ── Attendance / Workforce ────────────────────────────────────────────────
  {
    slug: "worker",
    name: "Worker",
    description: "Frontline employee — can only access own records",
    defaultScopeLevel: "SCOPE_RECORD",
  },
  {
    slug: "team_leader",
    name: "Team Leader",
    description: "Supervises a small team; can view team schedules and tasks",
    defaultScopeLevel: "SCOPE_TEAM",
  },
  {
    slug: "oms",
    name: "OMS",
    description: "Operations Management Specialist — team-level operational oversight",
    defaultScopeLevel: "SCOPE_TEAM",
  },
  {
    slug: "operations_manager",
    name: "Operations Manager",
    description: "Company-wide operations oversight",
    defaultScopeLevel: "SCOPE_COMPANY",
  },
  {
    slug: "department_head",
    name: "Department Head",
    description: "Manages a department and its direct teams",
    defaultScopeLevel: "SCOPE_DEPARTMENT",
  },
  {
    slug: "hr_payroll",
    name: "HR & Payroll",
    description: "Human resources and payroll management — company scope, MFA mandatory",
    defaultScopeLevel: "SCOPE_COMPANY",
  },

  // ── Projects ─────────────────────────────────────────────────────────────
  {
    slug: "project_worker",
    name: "Project Worker",
    description: "Assigned to project tasks; accesses own work items only",
    defaultScopeLevel: "SCOPE_RECORD",
  },
  {
    slug: "project_team_leader",
    name: "Project Team Leader",
    description: "Leads a project team; team-level visibility into project tasks",
    defaultScopeLevel: "SCOPE_TEAM",
  },
  {
    slug: "project_oms",
    name: "Project OMS",
    description: "Project Operations Management Specialist",
    defaultScopeLevel: "SCOPE_TEAM",
  },
  {
    slug: "project_operations_manager",
    name: "Project Operations Manager",
    description: "Company-wide project operations oversight",
    defaultScopeLevel: "SCOPE_COMPANY",
  },
  {
    slug: "project_director",
    name: "Project Director",
    description: "Directs all projects company-wide",
    defaultScopeLevel: "SCOPE_COMPANY",
  },

  // ── Shop ─────────────────────────────────────────────────────────────────
  {
    slug: "seller",
    name: "Seller",
    description: "Retail employee — store-level access to orders and products",
    defaultScopeLevel: "SCOPE_STORE",
  },
  {
    slug: "store_manager",
    name: "Store Manager",
    description: "Manages a single store — full access within assigned store",
    defaultScopeLevel: "SCOPE_STORE",
  },
  {
    slug: "shop_director",
    name: "Shop Director",
    description: "Oversees all shops company-wide",
    defaultScopeLevel: "SCOPE_COMPANY",
  },

  // ── Analytics / Support ───────────────────────────────────────────────────
  {
    slug: "app_support_specialist",
    name: "App Support Specialist",
    description: "Application support — read-only analytics and user management access",
    defaultScopeLevel: "SCOPE_COMPANY",
  },
  {
    slug: "data_analyst",
    name: "Data Analyst",
    description: "Analytics and reporting — read and export company data",
    defaultScopeLevel: "SCOPE_COMPANY",
  },
  {
    slug: "qa_tester",
    name: "QA Tester",
    description: "Quality assurance — read-only access to reproduce reported issues",
    defaultScopeLevel: "SCOPE_COMPANY",
  },
] as const

export async function seedRoles(): Promise<Map<string, string>> {
  console.log("  → Seeding system roles...")

  const roleIdMap = new Map<string, string>()

  for (const roleData of SYSTEM_ROLES) {
    // System roles have companyId = null — unique constraint doesn't enforce NULL equality
    // so we check existence manually before insert/update
    const [existing] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.slug, roleData.slug), isNull(roles.companyId)))
      .limit(1)

    if (existing) {
      await db
        .update(roles)
        .set({
          name: roleData.name,
          description: roleData.description,
          defaultScopeLevel: roleData.defaultScopeLevel,
          updatedAt: new Date(),
        })
        .where(eq(roles.id, existing.id))
      roleIdMap.set(roleData.slug, existing.id)
    } else {
      const [inserted] = await db
        .insert(roles)
        .values({
          slug: roleData.slug,
          name: roleData.name,
          description: roleData.description,
          type: "system",
          defaultScopeLevel: roleData.defaultScopeLevel,
          companyId: null,
          isActive: true,
        })
        .returning({ id: roles.id })
      if (inserted) roleIdMap.set(roleData.slug, inserted.id)
    }
  }

  console.log(`  ✓ ${SYSTEM_ROLES.length} system roles seeded`)
  return roleIdMap
}
