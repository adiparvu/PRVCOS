// 5-priority job queue constants — matches Inngest concurrency configuration
export const JobPriority = {
  // P1 — Security events, payment failures, critical alerts (max 10 concurrent)
  CRITICAL: "critical",
  // P2 — User-facing operations: approvals, notifications (max 50 concurrent)
  HIGH: "high",
  // P3 — Standard workflows: sync jobs, automations (max 100 concurrent, 5min timeout)
  NORMAL: "normal",
  // P4 — Reports, bulk exports, non-urgent processing (max 20 concurrent)
  LOW: "low",
  // P5 — ML/AI tasks, data cleanup, maintenance (max 5 concurrent)
  BACKGROUND: "background",
} as const

export type JobPriority = (typeof JobPriority)[keyof typeof JobPriority]

// Retry configuration per priority
export const JobRetry = {
  [JobPriority.CRITICAL]: { attempts: 5, backoff: "exponential" as const },
  [JobPriority.HIGH]: { attempts: 3, backoff: "exponential" as const },
  [JobPriority.NORMAL]: { attempts: 3, backoff: "exponential" as const },
  [JobPriority.LOW]: { attempts: 2, backoff: "linear" as const },
  [JobPriority.BACKGROUND]: { attempts: 1, backoff: "linear" as const },
} as const

// Timeout per priority (ms)
export const JobTimeout = {
  [JobPriority.CRITICAL]: 30_000,
  [JobPriority.HIGH]: 120_000,
  [JobPriority.NORMAL]: 300_000,
  [JobPriority.LOW]: 900_000,
  [JobPriority.BACKGROUND]: 3_600_000,
} as const
