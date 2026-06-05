import { describe, it, expect } from "vitest"
import { hasScope, requireSameCompany, RoleSets } from "../../permissions"
import { hasPermission, PERMISSION_CATALOG } from "../../permission-catalog"
import type { PRVSession } from "../../types"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<PRVSession> = {}): PRVSession {
  return {
    sessionId: "sess-1",
    userId: "user-1",
    companyId: "company-A",
    role: "ceo",
    scopeLevel: "SCOPE_COMPANY",
    securityLevel: "L3",
    mfaVerified: true,
    deviceId: "dev-1",
    createdAt: Math.floor(Date.now() / 1000),
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    lastActiveAt: Math.floor(Date.now() / 1000),
    ...overrides,
  }
}

// ─── Cross-Company Isolation ──────────────────────────────────────────────────

describe("Cross-company isolation — requireSameCompany", () => {
  it("allows access when companyIds match", () => {
    const session = makeSession({ companyId: "company-A", scopeLevel: "SCOPE_COMPANY" })
    expect(() => requireSameCompany(session, "company-A")).not.toThrow()
  })

  it("blocks access when companyIds differ (SCOPE_COMPANY)", () => {
    const session = makeSession({ companyId: "company-A", scopeLevel: "SCOPE_COMPANY" })
    expect(() => requireSameCompany(session, "company-B")).toThrow()
  })

  it("blocks access when companyIds differ (SCOPE_TEAM)", () => {
    const session = makeSession({ role: "team_leader", scopeLevel: "SCOPE_TEAM" })
    expect(() => requireSameCompany(session, "company-B")).toThrow()
  })

  it("allows cross-company access at SCOPE_GROUP (Group CEO)", () => {
    const session = makeSession({
      role: "group_ceo",
      companyId: "company-A",
      scopeLevel: "SCOPE_GROUP",
    })
    expect(() => requireSameCompany(session, "company-B")).not.toThrow()
  })

  it("allows cross-company access at SCOPE_PLATFORM", () => {
    const session = makeSession({
      role: "system_administrator",
      scopeLevel: "SCOPE_PLATFORM",
    })
    expect(() => requireSameCompany(session, "company-Z")).not.toThrow()
  })

  it("allows cross-company access at SCOPE_GLOBAL", () => {
    const session = makeSession({ scopeLevel: "SCOPE_GLOBAL" })
    expect(() => requireSameCompany(session, "company-Z")).not.toThrow()
  })
})

// ─── Scope Hierarchy ─────────────────────────────────────────────────────────

describe("Scope hierarchy — hasScope", () => {
  const ordered = [
    "SCOPE_RECORD",
    "SCOPE_TEAM",
    "SCOPE_DEPARTMENT",
    "SCOPE_STORE",
    "SCOPE_REGION",
    "SCOPE_COMPANY",
    "SCOPE_GROUP",
    "SCOPE_PLATFORM",
    "SCOPE_GLOBAL",
  ] as const

  it("a scope always satisfies itself", () => {
    for (const scope of ordered) {
      expect(hasScope(scope, scope)).toBe(true)
    }
  })

  it("higher scopes satisfy lower requirements", () => {
    expect(hasScope("SCOPE_COMPANY", "SCOPE_TEAM")).toBe(true)
    expect(hasScope("SCOPE_GROUP", "SCOPE_COMPANY")).toBe(true)
    expect(hasScope("SCOPE_PLATFORM", "SCOPE_RECORD")).toBe(true)
  })

  it("lower scopes do NOT satisfy higher requirements", () => {
    expect(hasScope("SCOPE_RECORD", "SCOPE_TEAM")).toBe(false)
    expect(hasScope("SCOPE_TEAM", "SCOPE_COMPANY")).toBe(false)
    expect(hasScope("SCOPE_COMPANY", "SCOPE_GROUP")).toBe(false)
    expect(hasScope("SCOPE_GROUP", "SCOPE_PLATFORM")).toBe(false)
  })
})

// ─── Permission × Role × Scope matrix ────────────────────────────────────────

describe("Permission enforcement — PERMISSION_CATALOG", () => {
  // Worker can read own records but not company-level resources
  it("worker cannot read employees (requires SCOPE_TEAM)", () => {
    const session = makeSession({ role: "worker", scopeLevel: "SCOPE_RECORD" })
    expect(hasPermission(session, "employees.read")).toBe(false)
  })

  it("team_leader can read employees in their scope", () => {
    const session = makeSession({ role: "team_leader", scopeLevel: "SCOPE_TEAM" })
    expect(hasPermission(session, "employees.read")).toBe(true)
  })

  it("team_leader cannot create employees (requires management role)", () => {
    const session = makeSession({ role: "team_leader", scopeLevel: "SCOPE_TEAM" })
    expect(hasPermission(session, "employees.create")).toBe(false)
  })

  it("ceo can create employees", () => {
    const session = makeSession({ role: "ceo", scopeLevel: "SCOPE_COMPANY" })
    expect(hasPermission(session, "employees.create")).toBe(true)
  })

  it("worker cannot delete employees", () => {
    const session = makeSession({ role: "worker", scopeLevel: "SCOPE_RECORD" })
    expect(hasPermission(session, "employees.delete")).toBe(false)
  })

  it("ceo can delete employees", () => {
    const session = makeSession({ role: "ceo", scopeLevel: "SCOPE_COMPANY" })
    expect(hasPermission(session, "employees.delete")).toBe(true)
  })

  it("seller can read orders at store scope", () => {
    const session = makeSession({ role: "seller", scopeLevel: "SCOPE_STORE" })
    // seller is not in supervisor role set — expect false
    expect(hasPermission(session, "orders.read")).toBe(false)
  })

  it("store_manager can read orders", () => {
    const session = makeSession({ role: "store_manager", scopeLevel: "SCOPE_STORE" })
    expect(hasPermission(session, "orders.read")).toBe(true)
  })

  it("data_analyst can read analytics", () => {
    const session = makeSession({ role: "data_analyst", scopeLevel: "SCOPE_COMPANY" })
    expect(hasPermission(session, "analytics.read")).toBe(true)
  })

  it("worker cannot read analytics", () => {
    const session = makeSession({ role: "worker", scopeLevel: "SCOPE_RECORD" })
    expect(hasPermission(session, "analytics.read")).toBe(false)
  })

  it("group_ceo can view companies", () => {
    const session = makeSession({ role: "group_ceo", scopeLevel: "SCOPE_GROUP" })
    expect(hasPermission(session, "companies.read")).toBe(true)
  })

  it("ceo cannot read cross-company data (SCOPE_GROUP required)", () => {
    const session = makeSession({ role: "ceo", scopeLevel: "SCOPE_COMPANY" })
    expect(hasPermission(session, "companies.read")).toBe(false)
  })

  it("system_administrator can suspend companies", () => {
    const session = makeSession({ role: "system_administrator", scopeLevel: "SCOPE_PLATFORM" })
    expect(hasPermission(session, "companies.suspend")).toBe(true)
  })

  it("ceo cannot suspend companies (SCOPE_PLATFORM required)", () => {
    const session = makeSession({ role: "ceo", scopeLevel: "SCOPE_COMPANY" })
    expect(hasPermission(session, "companies.suspend")).toBe(false)
  })

  it("roles.assign requires admin role at SCOPE_COMPANY", () => {
    const ceo = makeSession({ role: "ceo", scopeLevel: "SCOPE_COMPANY" })
    const teamLeader = makeSession({ role: "team_leader", scopeLevel: "SCOPE_TEAM" })
    expect(hasPermission(ceo, "roles.assign")).toBe(true)
    expect(hasPermission(teamLeader, "roles.assign")).toBe(false)
  })

  it("data_export.gdpr requires admin role at SCOPE_COMPANY", () => {
    const ceo = makeSession({ role: "ceo", scopeLevel: "SCOPE_COMPANY" })
    const analyst = makeSession({ role: "data_analyst", scopeLevel: "SCOPE_COMPANY" })
    expect(hasPermission(ceo, "data_export.gdpr")).toBe(true)
    expect(hasPermission(analyst, "data_export.gdpr")).toBe(false)
  })
})

// ─── Role set membership ──────────────────────────────────────────────────────

describe("RoleSets membership", () => {
  it("admin set includes group_ceo, ceo, co_ceo, system_administrator", () => {
    expect(RoleSets.admin.has("group_ceo")).toBe(true)
    expect(RoleSets.admin.has("ceo")).toBe(true)
    expect(RoleSets.admin.has("co_ceo")).toBe(true)
    expect(RoleSets.admin.has("system_administrator")).toBe(true)
    expect(RoleSets.admin.has("worker")).toBe(false)
    expect(RoleSets.admin.has("seller")).toBe(false)
  })

  it("management set is superset of admin set", () => {
    for (const role of RoleSets.admin) {
      expect(RoleSets.management.has(role)).toBe(true)
    }
  })

  it("supervisor set is superset of management set", () => {
    for (const role of RoleSets.management) {
      expect(RoleSets.supervisor.has(role)).toBe(true)
    }
  })

  it("worker is not in any elevated set", () => {
    expect(RoleSets.admin.has("worker")).toBe(false)
    expect(RoleSets.management.has("worker")).toBe(false)
    expect(RoleSets.supervisor.has("worker")).toBe(false)
    expect(RoleSets.analytics.has("worker")).toBe(false)
  })
})
