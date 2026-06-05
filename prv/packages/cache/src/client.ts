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

  // Permission set for a user within a company (30s TTL)
  permissionSet: (userId: string, companyId: string) => `perms:${userId}:${companyId}`,

  // Realtime channels (Redis pub/sub)
  companyChannel: (companyId: string, eventType: string) => `company:${companyId}:${eventType}`,
  chatChannel: (companyId: string, channelId: string) => `company:${companyId}:chat:${channelId}`,

  // Typesense scoped keys
  typesenseKey: (companyId: string) => `typesense_key:${companyId}`,

  // General TTL cache
  query: (namespace: string, hash: string) => `query:${namespace}:${hash}`,
} as const

// Session TTL per security level — canonical values from ROLE_ARCHITECTURE.md §Session Security
// L5 (CEO, Co-CEO, Group CEO, Sysadmin): 15 minutes
// L4 (Directors, Project OPM): 30 minutes
// L3 (Managers, TLs, OMS): 4 hours
// L2 (Workers, Sellers): 8 hours
export const SessionTTL = {
  L5: 900, // 15 minutes
  L4: 1_800, // 30 minutes
  L3: 14_400, // 4 hours
  L2: 28_800, // 8 hours
} as const

// Max concurrent sessions per security level — ROLE_ARCHITECTURE.md §Session Security
export const MaxSessions = {
  L5: 1,
  L4: 1,
  L3: 2,
  L2: 3,
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
