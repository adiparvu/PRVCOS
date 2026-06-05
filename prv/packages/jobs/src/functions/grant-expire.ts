import { inngest } from "../client"

// Temporary access grant auto-expiry — mirrors jit-expire.ts pattern.
// Triggered when a grant is created; sleeps until expiresAt then
// marks the grant as "expired" if it hasn't been revoked already.
export const grantExpireFunction = inngest.createFunction(
  {
    id: "prv-grant-expire",
    name: "Temporary Grant Auto-Expire",
    retries: 3,
    concurrency: { limit: 50 },
  },
  { event: "prv/grant.issued" },
  async ({ event, step }) => {
    const { grantId, expiresAt } = event.data

    await step.sleepUntil("wait-for-expiry", expiresAt)

    const result = await step.run("expire-grant", async () => {
      const { db } = await import("@prv/db")
      const { temporaryAccessGrants } = await import("@prv/db/schema")
      const { eq, and } = await import("drizzle-orm")
      const { getRedis, cacheKey } = await import("@prv/cache")

      const updated = await db
        .update(temporaryAccessGrants)
        .set({ status: "expired", updatedAt: new Date() })
        .where(
          and(eq(temporaryAccessGrants.id, grantId), eq(temporaryAccessGrants.status, "active"))
        )
        .returning({
          userId: temporaryAccessGrants.userId,
          companyId: temporaryAccessGrants.companyId,
        })

      if (updated[0]) {
        const redis = getRedis()
        await redis.del(cacheKey.permissionSet(updated[0].userId, updated[0].companyId))
      }

      return { expired: updated.length > 0 }
    })

    return { grantId, expired: result.expired }
  }
)
