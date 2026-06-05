import { describe, it, expect } from "vitest"
import { hasPermission, PERMISSION_CATALOG } from "../../permission-catalog"
import type { PRVSession, SystemRole, ScopeLevel } from "../../types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSession(role: SystemRole, scopeLevel: ScopeLevel): PRVSession {
  return {
    sessionId: "sess-matrix",
    userId: "user-matrix",
    companyId: "company-matrix",
    role,
    scopeLevel,
    securityLevel: "L3",
    mfaVerified: true,
    deviceId: "dev-matrix",
    createdAt: Math.floor(Date.now() / 1000),
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    lastActiveAt: Math.floor(Date.now() / 1000),
  }
}

// ─── Role × Scope canonical matrix ──────────────────────────────────────────
// For each role: its canonical scope + a set of permissions it MUST have
// and a set it MUST NOT have. This prevents scope/role misconfiguration.

type MatrixEntry = {
  role: SystemRole
  scope: ScopeLevel
  must: Array<keyof typeof PERMISSION_CATALOG>
  mustNot: Array<keyof typeof PERMISSION_CATALOG>
}

const MATRIX: MatrixEntry[] = [
  {
    role: "group_ceo",
    scope: "SCOPE_GROUP",
    must: ["companies.read", "employees.read", "invoices.read", "analytics.read", "roles.assign"],
    mustNot: ["companies.suspend"],
  },
  {
    role: "ceo",
    scope: "SCOPE_COMPANY",
    must: [
      "employees.read",
      "employees.create",
      "employees.delete",
      "invoices.read",
      "invoices.create",
      "projects.read",
      "analytics.read",
      "roles.assign",
      "data_export.gdpr",
    ],
    mustNot: ["companies.read", "companies.suspend"],
  },
  {
    role: "system_administrator",
    scope: "SCOPE_PLATFORM",
    must: ["companies.read", "companies.update", "companies.suspend", "roles.assign"],
    mustNot: [],
  },
  {
    role: "operations_manager",
    scope: "SCOPE_DEPARTMENT",
    must: ["employees.read", "employees.create", "projects.read"],
    mustNot: [
      "employees.delete",
      "invoices.delete",
      "roles.assign",
      "companies.read",
      "data_export.gdpr",
    ],
  },
  {
    role: "team_leader",
    scope: "SCOPE_TEAM",
    must: ["employees.read", "documents.read", "teams.read", "tools.read"],
    mustNot: [
      "employees.create",
      "employees.delete",
      "invoices.read",
      "roles.assign",
      "companies.read",
    ],
  },
  {
    role: "worker",
    scope: "SCOPE_RECORD",
    must: [
      "social_profiles.edit_own",
      "social_profiles.delete_own",
      "presence.set_manual",
      "business_card.view_own",
      "business_card.share",
    ],
    mustNot: [
      "employees.read",
      "employees.create",
      "invoices.read",
      "roles.assign",
      "analytics.read",
      "teams.read",
    ],
  },
  {
    role: "hr_payroll",
    scope: "SCOPE_COMPANY",
    must: [
      "employees.read",
      "employees.create",
      "employees.update",
      "employees.export",
      "documents.read",
    ],
    mustNot: ["companies.read", "roles.assign"],
  },
  {
    role: "store_manager",
    scope: "SCOPE_STORE",
    must: ["products.read", "orders.read", "orders.update"],
    mustNot: [
      "products.delete",
      "invoices.delete",
      "roles.assign",
      "companies.read",
      "analytics.read",
    ],
  },
  {
    role: "seller",
    scope: "SCOPE_STORE",
    must: ["social_profiles.view", "presence.view_team"],
    mustNot: [
      "products.create",
      "orders.cancel",
      "invoices.read",
      "roles.assign",
      "analytics.read",
    ],
  },
  {
    role: "data_analyst",
    scope: "SCOPE_COMPANY",
    must: ["analytics.read", "analytics.export"],
    mustNot: [
      "employees.create",
      "invoices.delete",
      "roles.assign",
      "companies.read",
      "data_export.gdpr",
    ],
  },
  {
    role: "project_director",
    scope: "SCOPE_COMPANY",
    must: ["projects.read", "projects.create", "projects.archive"],
    mustNot: ["projects.delete", "roles.assign", "invoices.delete", "companies.read"],
  },
  {
    role: "project_worker",
    scope: "SCOPE_RECORD",
    must: ["social_profiles.edit_own", "presence.set_manual"],
    mustNot: ["projects.create", "projects.delete", "employees.read", "analytics.read"],
  },
]

// ─── Generated tests from matrix ─────────────────────────────────────────────

describe("Role × Scope permission matrix", () => {
  for (const entry of MATRIX) {
    describe(`${entry.role} @ ${entry.scope}`, () => {
      const session = makeSession(entry.role, entry.scope)

      for (const perm of entry.must) {
        it(`✓ has '${perm}'`, () => {
          expect(hasPermission(session, perm)).toBe(true)
        })
      }

      for (const perm of entry.mustNot) {
        it(`✗ does NOT have '${perm}'`, () => {
          expect(hasPermission(session, perm)).toBe(false)
        })
      }
    })
  }
})

// ─── Scope boundary elevation ─────────────────────────────────────────────────
// Verify a role cannot gain access simply by claiming a higher scope

describe("Scope elevation does not bypass role requirement", () => {
  it("worker with SCOPE_COMPANY still cannot assign roles", () => {
    const session = makeSession("worker", "SCOPE_COMPANY")
    expect(hasPermission(session, "roles.assign")).toBe(false)
  })

  it("worker with SCOPE_GROUP still cannot read companies", () => {
    const session = makeSession("worker", "SCOPE_GROUP")
    expect(hasPermission(session, "companies.read")).toBe(false)
  })

  it("team_leader with SCOPE_PLATFORM still cannot suspend companies", () => {
    const session = makeSession("team_leader", "SCOPE_PLATFORM")
    expect(hasPermission(session, "companies.suspend")).toBe(false)
  })

  it("seller with SCOPE_COMPANY still cannot delete products", () => {
    const session = makeSession("seller", "SCOPE_COMPANY")
    expect(hasPermission(session, "products.delete")).toBe(false)
  })
})

// ─── Catalog completeness ─────────────────────────────────────────────────────

describe("PERMISSION_CATALOG completeness", () => {
  const keys = Object.keys(PERMISSION_CATALOG)

  it("has at least 50 permissions defined", () => {
    expect(keys.length).toBeGreaterThanOrEqual(50)
  })

  it("every rule has a non-empty roles set", () => {
    for (const [key, rule] of Object.entries(PERMISSION_CATALOG)) {
      expect(rule.roles.size, `${key} has empty roles set`).toBeGreaterThan(0)
    }
  })

  it("every rule has a valid scope level", () => {
    const validScopes = new Set([
      "SCOPE_RECORD",
      "SCOPE_TEAM",
      "SCOPE_DEPARTMENT",
      "SCOPE_STORE",
      "SCOPE_REGION",
      "SCOPE_COMPANY",
      "SCOPE_GROUP",
      "SCOPE_PLATFORM",
      "SCOPE_GLOBAL",
    ])
    for (const [key, rule] of Object.entries(PERMISSION_CATALOG)) {
      expect(validScopes.has(rule.scope), `${key} has invalid scope: ${rule.scope}`).toBe(true)
    }
  })
})
