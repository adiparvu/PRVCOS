import { getRedis, CacheTTL } from "./client"

// ─── Generic namespace query cache ─────────────────────────────────────────

export interface CacheSetOptions {
  ttl?: number // seconds; defaults to CacheTTL.QUERY_MEDIUM
}

export async function cacheGet<T>(namespace: string, key: string): Promise<T | null> {
  const redis = getRedis()
  return redis.get<T>(`query:${namespace}:${key}`)
}

export async function cacheSet<T>(
  namespace: string,
  key: string,
  value: T,
  options: CacheSetOptions = {}
): Promise<void> {
  const redis = getRedis()
  const ttl = options.ttl ?? CacheTTL.QUERY_MEDIUM
  await redis.set(`query:${namespace}:${key}`, value, { ex: ttl })
}

export async function cacheDel(namespace: string, key: string): Promise<void> {
  const redis = getRedis()
  await redis.del(`query:${namespace}:${key}`)
}

// Invalidate all keys in a namespace via scan (use sparingly — O(n) on keyspace)
export async function cacheInvalidateNamespace(namespace: string): Promise<number> {
  const redis = getRedis()
  const pattern = `query:${namespace}:*`
  let cursor = 0
  let deleted = 0

  do {
    const [nextCursor, keys] = await redis.scan(cursor, { match: pattern, count: 100 })
    cursor = Number(nextCursor)
    if (keys.length > 0) {
      const pipeline = redis.pipeline()
      for (const key of keys) pipeline.del(key)
      const results = await pipeline.exec()
      deleted += results.length
    }
  } while (cursor !== 0)

  return deleted
}

// ─── Memoize wrapper — cache-aside pattern ─────────────────────────────────

export async function cacheMemo<T>(
  namespace: string,
  key: string,
  fetcher: () => Promise<T>,
  options: CacheSetOptions = {}
): Promise<T> {
  const cached = await cacheGet<T>(namespace, key)
  if (cached !== null) return cached

  const fresh = await fetcher()
  await cacheSet(namespace, key, fresh, options)
  return fresh
}

// ─── Company context cache ─────────────────────────────────────────────────

export interface CompanyContext {
  id: string
  slug: string
  name: string
  type: string
  status: string
  settings: Record<string, unknown>
  locale: string
  timezone: string
}

export async function getCompanyContext(companyId: string): Promise<CompanyContext | null> {
  return cacheGet<CompanyContext>("company_ctx", companyId)
}

export async function setCompanyContext(ctx: CompanyContext): Promise<void> {
  await cacheSet("company_ctx", ctx.id, ctx, { ttl: CacheTTL.COMPANY_CONTEXT })
}

export async function invalidateCompanyContext(companyId: string): Promise<void> {
  await cacheDel("company_ctx", companyId)
}
