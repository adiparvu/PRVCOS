import { Redis } from "@upstash/redis"

let _redis: Redis | null = null

export function getRedis(): Redis {
  if (!_redis) {
    const url = process.env["UPSTASH_REDIS_REST_URL"]
    const token = process.env["UPSTASH_REDIS_REST_TOKEN"]

    if (!url || !token) {
      throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required")
    }

    _redis = new Redis({ url, token })
  }
  return _redis
}

// Key builders — consistent format across all modules
export const cacheKey = {
  // Rate limiting
  rateLimit: (endpoint: string, companyId: string, windowStart: number) =>
    `rate_limit:${endpoint}:${companyId}:${windowStart}`,

  // Session
  session: (sessionId: string) => `session:${sessionId}`,
  userSessions: (userId: string) => `user_sessions:${userId}`,

  // Company context (cached for performance)
  companyContext: (companyId: string) => `company_ctx:${companyId}`,

  // Realtime channels (Redis pub/sub)
  companyChannel: (companyId: string, eventType: string) => `company:${companyId}:${eventType}`,
  chatChannel: (companyId: string, channelId: string) => `company:${companyId}:chat:${channelId}`,

  // Typesense scoped keys
  typesenseKey: (companyId: string) => `typesense_key:${companyId}`,

  // General TTL cache
  query: (namespace: string, hash: string) => `query:${namespace}:${hash}`,
} as const

// Session TTL per security level — matches ROLE_ARCHITECTURE.md security levels
// L5 (CEO, Co-CEO, Group CEO, Sysadmin): 1 hour
// L4 (Directors, OPM): 2 hours
// L3 (Managers, TLs, OMS): 4 hours
// L2 (Workers, Sellers): 8 hours
export const SessionTTL = {
  L5: 3_600, // 1 hour
  L4: 7_200, // 2 hours
  L3: 14_400, // 4 hours
  L2: 28_800, // 8 hours
} as const

export type SecurityLevel = keyof typeof SessionTTL

export function getSessionTTL(level: SecurityLevel): number {
  return SessionTTL[level]
}

// Cache TTL constants (seconds)
export const CacheTTL = {
  COMPANY_CONTEXT: 300, // 5 minutes
  TYPESENSE_KEY: 3_600, // 1 hour
  QUERY_SHORT: 60, // 1 minute
  QUERY_MEDIUM: 300, // 5 minutes
  QUERY_LONG: 3_600, // 1 hour
} as const
