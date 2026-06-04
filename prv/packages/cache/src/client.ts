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

// Cache TTL constants (seconds)
export const CacheTTL = {
  SESSION: 86_400, // 24 hours
  COMPANY_CONTEXT: 300, // 5 minutes
  TYPESENSE_KEY: 3_600, // 1 hour
  QUERY_SHORT: 60, // 1 minute
  QUERY_MEDIUM: 300, // 5 minutes
  QUERY_LONG: 3_600, // 1 hour
} as const
