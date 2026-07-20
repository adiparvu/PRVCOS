import { inngest } from "../client"

// Phase 18.3 — Permit-to-Work auto-expiry.
// Hourly sweep: any approved/active permit whose validity window has ended is
// flipped to the terminal 'expired' status so the stored value matches the
// effective status the UI already computes on read. Idempotent bulk update.
export const permitExpireFunction = inngest.createFunction(
  {
    id: "prv-permit-expire",
    name: "Permit-to-Work Expiry — Hourly",
    retries: 2,
    concurrency: { limit: 1 },
  },
  { cron: "0 * * * *" }, // top of every hour
  async ({ step }) => {
    return step.run("expire-past-validity", async () => {
      const { db } = await import("@prv/db")
      const { safetyPermits } = await import("@prv/db/schema")
      const { and, inArray, lt } = await import("drizzle-orm")
      const now = new Date()

      const updated = await db
        .update(safetyPermits)
        .set({ status: "expired", updatedAt: now })
        .where(
          and(inArray(safetyPermits.status, ["approved", "active"]), lt(safetyPermits.validTo, now))
        )
        .returning({ id: safetyPermits.id })

      return { expired: updated.length }
    })
  }
)
