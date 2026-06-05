import { inngest } from "../client"

// Presence auto-expire — triggered when a user sets a manual presence override.
// Sleeps until expiresAt, then resets the user's status to "offline".
export const presenceExpireFunction = inngest.createFunction(
  {
    id: "prv-presence-expire",
    name: "Presence Manual Override Expire",
    retries: 2,
    concurrency: { limit: 100 },
  },
  { event: "prv/presence.manual_set" },
  async ({ event, step }) => {
    const { userId, expiresAt } = event.data

    await step.sleepUntil("wait-for-expiry", expiresAt)

    const cleared = await step.run("clear-manual-override", async () => {
      const { db } = await import("@prv/db")
      const { userPresence } = await import("@prv/db/schema")
      const { eq, and, lte } = await import("drizzle-orm")

      const now = new Date()
      const result = await db
        .update(userPresence)
        .set({
          status: "offline",
          isManualOverride: false,
          manualOverrideExpiresAt: null,
          updatedAt: now,
          lastSeenAt: now,
        })
        .where(
          and(
            eq(userPresence.userId, userId),
            eq(userPresence.isManualOverride, true),
            // Only clear if override hasn't been updated since we were triggered
            lte(userPresence.manualOverrideExpiresAt, now)
          )
        )
        .returning({ userId: userPresence.userId })

      return { cleared: result.length > 0 }
    })

    return { userId, cleared: cleared.cleared }
  }
)
