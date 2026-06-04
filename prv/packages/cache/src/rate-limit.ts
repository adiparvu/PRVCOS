import { Ratelimit } from "@upstash/ratelimit"
import { getRedis } from "./client"

// Rate limit configurations — aligned with Zero Trust architecture
// Key format: rate_limit:{endpoint_class}:{company_id}:{window_start_unix}

export type RateLimitEndpointClass =
  | "auth" // Auth endpoints — strictest
  | "api_write" // Mutating API calls
  | "api_read" // Read-only API calls
  | "ai" // AI endpoints — expensive
  | "export" // File exports
  | "public" // Public / unauthenticated

const LIMITS = {
  auth: { requests: 10, window: "1 m" },
  api_write: { requests: 100, window: "1 m" },
  api_read: { requests: 500, window: "1 m" },
  ai: { requests: 20, window: "1 m" },
  export: { requests: 10, window: "10 m" },
  public: { requests: 50, window: "1 m" },
} as const satisfies Record<RateLimitEndpointClass, { requests: number; window: string }>

const limiters = new Map<RateLimitEndpointClass, Ratelimit>()

function getLimiter(endpoint: RateLimitEndpointClass): Ratelimit {
  if (!limiters.has(endpoint)) {
    const config = LIMITS[endpoint]
    limiters.set(
      endpoint,
      new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(
          config.requests,
          config.window as `${number} ${"s" | "m" | "h" | "d"}`
        ),
        prefix: `prv_rl_${endpoint}`,
        analytics: true,
      })
    )
  }
  return limiters.get(endpoint)!
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number
  limit: number
}

// Check rate limit for a given endpoint class and identifier
// identifier = companyId for authenticated routes, IP for public routes
export async function checkRateLimit(
  endpoint: RateLimitEndpointClass,
  identifier: string
): Promise<RateLimitResult> {
  const limiter = getLimiter(endpoint)
  const result = await limiter.limit(identifier)

  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
    limit: result.limit,
  }
}

// Throw a 429 Response if rate limit is exceeded
export async function enforceRateLimit(
  endpoint: RateLimitEndpointClass,
  identifier: string
): Promise<void> {
  const result = await checkRateLimit(endpoint, identifier)

  if (!result.success) {
    throw new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.reset),
        "Retry-After": String(Math.ceil((result.reset - Date.now()) / 1000)),
      },
    })
  }
}
