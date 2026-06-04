import { describe, it, expect } from "vitest"
import {
  hasScope,
  requireScope,
  hasRole,
  requireRole,
  requireSameCompany,
  checkPermission,
  requireMfa,
  isMfaMandatory,
  RoleSets,
} from "../permissions"
import type { PRVSession } from "../types"
import { AuthErrors } from "../errors"

function makeSession(overrides: Partial<PRVSession> = {}): PRVSession {
  return {
    sessionId: "sess-1",
    userId: "user-1",
    companyId: "cmp-1",
    role: "worker",
    scopeLevel: "SCOPE_RECORD",
    securityLevel: "L2",
    mfaVerified: false,
    deviceId: "dev-1",
    createdAt: Math.floor(Date.now() / 1000),
    expiresAt: Math.floor(Date.now() / 1000) + 28800,
    lastActiveAt: Math.floor(Date.now() / 1000),
    ...overrides,
  }
}

// ─── hasScope ─────────────────────────────────────────────────────────────

describe("hasScope", () => {
  it("SCOPE_COMPANY passes for SCOPE_TEAM required", () => {
    expect(hasScope("SCOPE_COMPANY", "SCOPE_TEAM")).toBe(true)
  })

  it("SCOPE_RECORD fails for SCOPE_TEAM required", () => {
    expect(hasScope("SCOPE_RECORD", "SCOPE_TEAM")).toBe(false)
  })

  it("same scope level passes", () => {
    expect(hasScope("SCOPE_DEPARTMENT", "SCOPE_DEPARTMENT")).toBe(true)
  })

  it("SCOPE_GLOBAL passes for any scope", () => {
    const all: Parameters<typeof hasScope>[0][] = [
      "SCOPE_RECORD",
      "SCOPE_TEAM",
      "SCOPE_DEPARTMENT",
      "SCOPE_STORE",
      "SCOPE_REGION",
      "SCOPE_COMPANY",
      "SCOPE_GROUP",
      "SCOPE_PLATFORM",
    ]
    for (const s of all) {
      expect(hasScope("SCOPE_GLOBAL", s)).toBe(true)
    }
  })
})

// ─── requireScope ─────────────────────────────────────────────────────────

describe("requireScope", () => {
  it("does not throw when scope is sufficient", () => {
    const session = makeSession({ scopeLevel: "SCOPE_COMPANY" })
    expect(() => requireScope(session, "SCOPE_TEAM")).not.toThrow()
  })

  it("throws INSUFFICIENT_SCOPE when scope is insufficient", () => {
    const session = makeSession({ scopeLevel: "SCOPE_RECORD" })
    let thrown: unknown
    try {
      requireScope(session, "SCOPE_COMPANY")
    } catch (e) {
      thrown = e
    }
    expect(thrown).toBeInstanceOf(Error)
    expect((thrown as { code: string }).code).toBe("INSUFFICIENT_SCOPE")
  })
})

// ─── hasRole ──────────────────────────────────────────────────────────────

describe("hasRole", () => {
  it("returns true when role is in set", () => {
    expect(hasRole("ceo", RoleSets.admin)).toBe(true)
  })

  it("returns false when role is not in set", () => {
    expect(hasRole("worker", RoleSets.admin)).toBe(false)
  })

  it("management set is a superset of admin set", () => {
    for (const role of RoleSets.admin) {
      expect(hasRole(role, RoleSets.management)).toBe(true)
    }
  })

  it("supervisor set is a superset of management set", () => {
    for (const role of RoleSets.management) {
      expect(hasRole(role, RoleSets.supervisor)).toBe(true)
    }
  })
})

// ─── requireSameCompany ───────────────────────────────────────────────────

describe("requireSameCompany", () => {
  it("passes when companyIds match", () => {
    const session = makeSession({ companyId: "cmp-1" })
    expect(() => requireSameCompany(session, "cmp-1")).not.toThrow()
  })

  it("throws COMPANY_MISMATCH when companyIds differ", () => {
    const session = makeSession({ companyId: "cmp-1" })
    let thrown: unknown
    try {
      requireSameCompany(session, "cmp-2")
    } catch (e) {
      thrown = e
    }
    expect((thrown as { code: string }).code).toBe("COMPANY_MISMATCH")
  })

  it("group-level scope bypasses company boundary check", () => {
    const session = makeSession({ companyId: "cmp-1", scopeLevel: "SCOPE_GROUP" })
    expect(() => requireSameCompany(session, "cmp-999")).not.toThrow()
  })
})

// ─── requireMfa ───────────────────────────────────────────────────────────

describe("requireMfa", () => {
  it("passes when MFA is verified", () => {
    const session = makeSession({ mfaVerified: true })
    expect(() => requireMfa(session)).not.toThrow()
  })

  it("throws MFA_REQUIRED when MFA is not verified", () => {
    const session = makeSession({ mfaVerified: false })
    let thrown: unknown
    try {
      requireMfa(session)
    } catch (e) {
      thrown = e
    }
    expect((thrown as { code: string }).code).toBe("MFA_REQUIRED")
  })
})

// ─── isMfaMandatory ───────────────────────────────────────────────────────

describe("isMfaMandatory", () => {
  it("CEO roles require MFA", () => {
    expect(isMfaMandatory("ceo")).toBe(true)
    expect(isMfaMandatory("co_ceo")).toBe(true)
    expect(isMfaMandatory("group_ceo")).toBe(true)
  })

  it("hr_payroll requires MFA (sensitive data access)", () => {
    expect(isMfaMandatory("hr_payroll")).toBe(true)
  })

  it("regular worker does not require MFA", () => {
    expect(isMfaMandatory("worker")).toBe(false)
  })
})

// ─── checkPermission (combined guard) ────────────────────────────────────

describe("checkPermission", () => {
  it("passes when all checks are satisfied", () => {
    const session = makeSession({
      role: "ceo",
      scopeLevel: "SCOPE_COMPANY",
      companyId: "cmp-1",
    })
    expect(() =>
      checkPermission(session, {
        scope: "SCOPE_TEAM",
        roles: RoleSets.management,
        resourceCompanyId: "cmp-1",
      })
    ).not.toThrow()
  })

  it("fails on first failing check (scope)", () => {
    const session = makeSession({ scopeLevel: "SCOPE_RECORD", role: "ceo", companyId: "cmp-1" })
    let thrown: unknown
    try {
      checkPermission(session, { scope: "SCOPE_COMPANY" })
    } catch (e) {
      thrown = e
    }
    expect((thrown as { code: string }).code).toBe("INSUFFICIENT_SCOPE")
  })
})
