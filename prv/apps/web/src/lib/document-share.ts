// Document share link status helpers (Phase 12.3). Pure + unit-tested.

export type SharePermission = "view" | "download" | "edit" | "manage"
export type ShareScope = "internal" | "external"
export type ShareStatus = "active" | "expired" | "revoked"

export interface ShareLike {
  revokedAt: string | null
  expiresAt: string | null
}

/** Derived link state: revoked wins, then expiry, else active. */
export function shareStatus(share: ShareLike, nowMs: number): ShareStatus {
  if (share.revokedAt) return "revoked"
  if (share.expiresAt) {
    const exp = Date.parse(share.expiresAt)
    if (Number.isFinite(exp) && exp <= nowMs) return "expired"
  }
  return "active"
}

/** An external link is usable only while active. */
export function isShareUsable(share: ShareLike, nowMs: number): boolean {
  return shareStatus(share, nowMs) === "active"
}

/** Permission ranking — higher grants everything below it. */
export const PERMISSION_RANK: Record<SharePermission, number> = {
  view: 1,
  download: 2,
  edit: 3,
  manage: 4,
}

export function permissionAllows(granted: SharePermission, required: SharePermission): boolean {
  return PERMISSION_RANK[granted] >= PERMISSION_RANK[required]
}

export interface ShareSummaryCounts {
  total: number
  active: number
  external: number
  expired: number
  revoked: number
}

export function summarizeShares(
  shares: (ShareLike & { scope: ShareScope })[],
  nowMs: number
): ShareSummaryCounts {
  let active = 0
  let external = 0
  let expired = 0
  let revoked = 0
  for (const s of shares) {
    const st = shareStatus(s, nowMs)
    if (st === "active") active += 1
    else if (st === "expired") expired += 1
    else revoked += 1
    if (s.scope === "external") external += 1
  }
  return { total: shares.length, active, external, expired, revoked }
}
