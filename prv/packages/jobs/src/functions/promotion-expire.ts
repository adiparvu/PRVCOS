import { inngest } from "../client"

// Phase 9 — Promotion status auto-expiry.
// Daily sweep: any 'active' promotion whose end date has passed is flipped to the
// terminal 'expired' status, so the stored value matches the effective state the
// checkout/validate path already enforces via isPromotionRedeemable. Idempotent
// bulk update.
//
// Only auto-EXPIRES. It never auto-activates a draft/paused promotion — going
// live is a pricing commitment that stays an explicit admin action.
export const promotionExpireFunction = inngest.createFunction(
  {
    id: "prv-promotion-expire",
    name: "Promotion Auto-Expiry — Daily",
    retries: 2,
    concurrency: { limit: 1 },
  },
  { cron: "15 0 * * *" }, // 00:15 UTC daily
  async ({ step }) => {
    return step.run("expire-ended-promotions", async () => {
      const { db } = await import("@prv/db")
      const { promotions } = await import("@prv/db/schema")
      const { and, eq, lt, isNotNull } = await import("drizzle-orm")

      // endsAt is a DATE column ('YYYY-MM-DD'); compare against today's date so a
      // promo is expired only once the day AFTER its end date begins — matching
      // isPromotionRedeemable's `today > endsAt` boundary.
      const today = new Date().toISOString().slice(0, 10)

      const updated = await db
        .update(promotions)
        .set({ status: "expired", updatedAt: new Date() })
        .where(
          and(
            eq(promotions.status, "active"),
            isNotNull(promotions.endsAt),
            lt(promotions.endsAt, today)
          )
        )
        .returning({ id: promotions.id })

      return { expired: updated.length }
    })
  }
)
