import { db } from "@prv/db"
import {
  roles,
  permissions,
  rolePermissions,
  userRoleAssignments,
  temporaryAccessGrants,
} from "@prv/db/schema"
import { eq, and, inArray } from "drizzle-orm"
import { getRedis, cacheKey } from "@prv/cache"
import { hasPermission, PERMISSION_CATALOG } from "./permission-catalog"
import type { PermissionKey } from "./permission-catalog"
import type { PRVSession } from "./types"

// Cache TTL for permission sets: 30 seconds (short enough to respond to revocations)
const PERM_CACHE_TTL = 30

// ─── DB-backed permission resolution ──────────────────────────────────────

export interface EffectivePermissions {
  permissionKeys: Set<PermissionKey>
  roles: string[] // role slugs
  tempGrantActive: boolean
  resolvedAt: number
}

/**
 * Resolve the full effective permission set for a user in a company by
 * querying their role assignments and any active temporary grants.
 * Results are cached in Redis for PERM_CACHE_TTL seconds.
 */
export async function getEffectivePermissions(
  userId: string,
  companyId: string
): Promise<EffectivePermissions> {
  const redis = getRedis()
  const key = cacheKey.permissionSet(userId, companyId)

  const cached = await redis.get<EffectivePermissions>(key)
  if (cached) return cached

  // Fetch active role assignments
  const assignments = await db
    .select({ roleId: userRoleAssignments.roleId })
    .from(userRoleAssignments)
    .where(
      and(
        eq(userRoleAssignments.userId, userId),
        eq(userRoleAssignments.companyId, companyId),
        eq(userRoleAssignments.isActive, true)
      )
    )

  const roleIds = assignments.map((a) => a.roleId)

  // Fetch role slugs + permissions for these roles
  const [roleSlugs, rolePerms] = await Promise.all([
    roleIds.length > 0
      ? db.select({ slug: roles.slug }).from(roles).where(inArray(roles.id, roleIds))
      : Promise.resolve([]),

    roleIds.length > 0
      ? db
          .select({ permissionKey: permissions.key })
          .from(rolePermissions)
          .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
          .where(inArray(rolePermissions.roleId, roleIds))
      : Promise.resolve([]),
  ])

  // Fetch active temporary grants
  const tempGrants = await db
    .select({ grantedPermissions: temporaryAccessGrants.grantedPermissions })
    .from(temporaryAccessGrants)
    .where(
      and(
        eq(temporaryAccessGrants.userId, userId),
        eq(temporaryAccessGrants.companyId, companyId),
        eq(temporaryAccessGrants.status, "active")
      )
    )

  const permKeys = new Set<PermissionKey>()
  for (const rp of rolePerms) {
    if (rp.permissionKey in PERMISSION_CATALOG) {
      permKeys.add(rp.permissionKey as PermissionKey)
    }
  }

  let tempGrantActive = false
  for (const grant of tempGrants) {
    const grantedPerms = grant.grantedPermissions as string[]
    if (Array.isArray(grantedPerms) && grantedPerms.length > 0) {
      tempGrantActive = true
      for (const pk of grantedPerms) {
        if (pk in PERMISSION_CATALOG) {
          permKeys.add(pk as PermissionKey)
        }
      }
    }
  }

  const result: EffectivePermissions = {
    permissionKeys: permKeys,
    roles: roleSlugs.map((r) => r.slug),
    tempGrantActive,
    resolvedAt: Date.now(),
  }

  await redis.set(key, result, { ex: PERM_CACHE_TTL })
  return result
}

/**
 * Check a single DB-resolved permission for a user/company.
 * Falls back to catalog-based check if DB resolution fails.
 */
export async function hasDbPermission(
  userId: string,
  companyId: string,
  permissionKey: PermissionKey
): Promise<boolean> {
  try {
    const effective = await getEffectivePermissions(userId, companyId)
    return effective.permissionKeys.has(permissionKey)
  } catch {
    return false
  }
}

/**
 * Combined check: session-level catalog check AND DB-level assignment check.
 * Both must pass. This is the strictest form and should be used for
 * sensitive write operations (role assignment, financial mutations, etc.)
 */
export async function requireDbPermission(
  session: PRVSession,
  permissionKey: PermissionKey
): Promise<void> {
  // First: fast in-memory catalog check (role + scope)
  if (!hasPermission(session, permissionKey)) {
    const { AuthErrors } = await import("./errors")
    throw AuthErrors.insufficientRole()
  }

  // Second: DB assignment check (ensures role is actively assigned)
  const hasDb = await hasDbPermission(session.userId, session.companyId, permissionKey)
  if (!hasDb) {
    const { AuthErrors } = await import("./errors")
    throw AuthErrors.insufficientRole()
  }
}

/**
 * Invalidate the permission cache for a user/company pair.
 * Call after role assignment, revocation, or temp grant changes.
 */
export async function invalidatePermissionCache(userId: string, companyId: string): Promise<void> {
  const redis = getRedis()
  await redis.del(cacheKey.permissionSet(userId, companyId))
}
