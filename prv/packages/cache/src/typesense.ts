import { getRedis, CacheTTL } from "./client"

// ─── Typesense scoped key cache ────────────────────────────────────────────
// Scoped search keys are generated from TYPESENSE_SEARCH_API_KEY and cached
// per company. They expire before the underlying Typesense key does so that
// a fresh generation is always well within the key's validity window.

interface CachedScopedKey {
  key: string
  expiresAt: number // unix ms
}

export async function getCachedTypesenseKey(companyId: string): Promise<string | null> {
  const redis = getRedis()
  const cached = await redis.get<CachedScopedKey>(`typesense_key:${companyId}`)
  if (!cached) return null

  // Reject if within 5 minutes of expiry — generate a fresh one instead
  const bufferMs = 5 * 60 * 1000
  if (cached.expiresAt - Date.now() < bufferMs) {
    await redis.del(`typesense_key:${companyId}`)
    return null
  }

  return cached.key
}

export async function setCachedTypesenseKey(
  companyId: string,
  key: string,
  validForSeconds: number = CacheTTL.TYPESENSE_KEY
): Promise<void> {
  const redis = getRedis()
  const payload: CachedScopedKey = {
    key,
    expiresAt: Date.now() + validForSeconds * 1000,
  }
  // Store for slightly less than the key validity to ensure we refresh on time
  await redis.set(`typesense_key:${companyId}`, payload, {
    ex: Math.max(validForSeconds - 300, 60),
  })
}

export async function evictTypesenseKey(companyId: string): Promise<void> {
  const redis = getRedis()
  await redis.del(`typesense_key:${companyId}`)
}
