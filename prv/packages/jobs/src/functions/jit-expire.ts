import { inngest } from "../client"

// JIT session auto-expiry — triggered when a JIT session starts.
// Sleeps until expiresAt, then marks the session as expired if still active.
// This guarantees the 2-hour hard limit from the acceptance criteria.
export const jitExpireFunction = inngest.createFunction(
  {
    id: "prv-jit-expire",
    name: "JIT Session Auto-Expire",
    retries: 3,
    concurrency: { limit: 50 },
  },
  { event: "prv/jit.session.started" },
  async ({ event, step }) => {
    const { sessionId, expiresAt } = event.data

    // Sleep until the exact expiry timestamp
    await step.sleepUntil("wait-for-expiry", expiresAt)

    // Expire the session if still active — all db imports are dynamic to keep
    // @prv/jobs free of @prv/db as a hard compile-time dependency
    const expired = await step.run("expire-session", async () => {
      const { db } = await import("@prv/db")
      const { sysadminAccessSessions } = await import("@prv/db/schema")
      const { eq, and } = await import("drizzle-orm")

      const result = await db
        .update(sysadminAccessSessions)
        .set({ status: "expired", updatedAt: new Date() })
        .where(
          and(eq(sysadminAccessSessions.id, sessionId), eq(sysadminAccessSessions.status, "active"))
        )
        .returning({ id: sysadminAccessSessions.id })

      return { expired: result.length > 0 }
    })

    return { sessionId, expired: expired.expired }
  }
)
