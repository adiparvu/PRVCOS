import { getRedis } from "./client"

// ─── Redis pub/sub — Realtime fallback tier ────────────────────────────────
// Used as the third tier in the 4-tier realtime stack:
//   Supabase Realtime → SSE → Redis pub/sub → Polling
//
// Redis pub/sub requires a persistent connection and should only be used
// server-side (background workers, long-lived Node.js processes).
// For Next.js edge/serverless, SSE or polling are preferred.

export type PubSubMessage<T = unknown> = {
  eventType: string
  companyId: string
  payload: T
  timestamp: number
}

// Publish an event to a company channel
export async function publishEvent<T = unknown>(
  companyId: string,
  eventType: string,
  payload: T
): Promise<number> {
  const redis = getRedis()
  const channel = `company:${companyId}:${eventType}`
  const message: PubSubMessage<T> = {
    eventType,
    companyId,
    payload,
    timestamp: Date.now(),
  }
  return redis.publish(channel, JSON.stringify(message))
}

// Publish to a company-wide broadcast channel (all event types)
export async function broadcastToCompany<T = unknown>(
  companyId: string,
  eventType: string,
  payload: T
): Promise<number> {
  const redis = getRedis()
  const broadcastChannel = `company:${companyId}:*`
  const message: PubSubMessage<T> = {
    eventType,
    companyId,
    payload,
    timestamp: Date.now(),
  }
  return redis.publish(broadcastChannel, JSON.stringify(message))
}

// Channel name builders (mirrors cacheKey in client.ts for consistency)
export const pubsubChannel = {
  company: (companyId: string, eventType: string) => `company:${companyId}:${eventType}`,
  chat: (companyId: string, channelId: string) => `company:${companyId}:chat:${channelId}`,
  user: (userId: string) => `user:${userId}`,
  global: (eventType: string) => `global:${eventType}`,
} as const
