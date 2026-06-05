import { db } from "@prv/db"
import { companyGroups, groupMemberships, companies } from "@prv/db/schema"
import { eq, and } from "drizzle-orm"
import { hasScope } from "./permissions"
import type { PRVSession, ScopeLevel } from "./types"

// ─── Visible company resolution ────────────────────────────────────────────

export interface CompanyRef {
  id: string
  name: string
}

/**
 * Return every company ID the session is allowed to query.
 *
 * SCOPE_GROUP / SCOPE_PLATFORM / SCOPE_GLOBAL — queries group memberships for
 * the group owned by the user's company, or all companies for platform-level.
 * SCOPE_COMPANY and below — single-element array of session.companyId.
 */
export async function resolveVisibleCompanies(session: PRVSession): Promise<CompanyRef[]> {
  // Platform/global admins see all active companies
  if (hasScope(session.scopeLevel, "SCOPE_PLATFORM")) {
    const rows = await db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(eq(companies.isActive, true))
    return rows
  }

  // Group CEO or group-scoped role: look up the group where this company is a member
  if (hasScope(session.scopeLevel, "SCOPE_GROUP")) {
    // Find groups this company belongs to (a company can belong to multiple groups)
    const memberships = await db
      .select({ groupId: groupMemberships.groupId })
      .from(groupMemberships)
      .where(
        and(eq(groupMemberships.companyId, session.companyId), eq(groupMemberships.isActive, true))
      )

    if (memberships.length === 0) {
      return [{ id: session.companyId, name: "" }]
    }

    const groupIds = memberships.map((m) => m.groupId)

    // Get all active companies in those groups
    const visible = new Map<string, string>()
    for (const groupId of groupIds) {
      const rows = await db
        .select({
          companyId: groupMemberships.companyId,
          companyName: companies.name,
        })
        .from(groupMemberships)
        .innerJoin(companies, eq(groupMemberships.companyId, companies.id))
        .where(
          and(
            eq(groupMemberships.groupId, groupId),
            eq(groupMemberships.isActive, true),
            eq(companies.isActive, true)
          )
        )
      for (const r of rows) visible.set(r.companyId, r.companyName)
    }

    return Array.from(visible.entries()).map(([id, name]) => ({ id, name }))
  }

  // Company-level and below: only the session's own company
  const [company] = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .where(eq(companies.id, session.companyId))
    .limit(1)

  return company ? [{ id: company.id, name: company.name }] : []
}

/**
 * Return visible company IDs only (convenience wrapper).
 */
export async function resolveVisibleCompanyIds(session: PRVSession): Promise<string[]> {
  const refs = await resolveVisibleCompanies(session)
  return refs.map((r) => r.id)
}

// ─── Group context helpers ─────────────────────────────────────────────────

export interface GroupContext {
  groupId: string
  groupName: string
  companyIds: string[]
}

/**
 * Return the group context for a Group CEO.
 * Throws if the user is not in a group or lacks group scope.
 */
export async function resolveGroupContext(session: PRVSession): Promise<GroupContext | null> {
  if (!hasScope(session.scopeLevel, "SCOPE_GROUP")) return null

  const memberships = await db
    .select({
      groupId: groupMemberships.groupId,
      groupName: companyGroups.name,
    })
    .from(groupMemberships)
    .innerJoin(companyGroups, eq(groupMemberships.groupId, companyGroups.id))
    .where(
      and(
        eq(groupMemberships.companyId, session.companyId),
        eq(groupMemberships.isActive, true),
        eq(companyGroups.isActive, true)
      )
    )
    .limit(1)

  if (!memberships[0]) return null

  const { groupId, groupName } = memberships[0]

  const allMembers = await db
    .select({ companyId: groupMemberships.companyId })
    .from(groupMemberships)
    .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.isActive, true)))

  return {
    groupId,
    groupName,
    companyIds: allMembers.map((m) => m.companyId),
  }
}

// ─── Scope boundary check ──────────────────────────────────────────────────

/**
 * Assert a session can access resources belonging to targetCompanyId.
 * Group-scope and above may cross company boundaries.
 */
export function assertCompanyAccess(session: PRVSession, targetCompanyId: string): void {
  if (hasScope(session.scopeLevel, "SCOPE_GROUP")) return
  if (session.companyId !== targetCompanyId) {
    throw new Error("COMPANY_MISMATCH")
  }
}

/**
 * Return the minimum scope required to read cross-company data.
 */
export function crossCompanyScopeRequired(): ScopeLevel {
  return "SCOPE_GROUP"
}
