import { inngest } from "../client"

// Phase 13.4 — Announcement expiry auto-archive.
// Hourly sweep: any announcement past its expires_at that is neither archived
// nor deleted gets archived_at stamped, so the active feed drops it while the
// row remains as history. Non-destructive and idempotent (guarded on
// archived_at IS NULL). Mirrors lib/announcement-visibility.shouldAutoArchive.
export const announcementExpireFunction = inngest.createFunction(
  {
    id: "prv-announcement-expire",
    name: "Announcement Expiry Auto-Archive — Hourly",
    retries: 2,
    concurrency: { limit: 1 },
  },
  { cron: "0 * * * *" }, // top of every hour
  async ({ step }) => {
    return step.run("archive-expired", async () => {
      const { db } = await import("@prv/db")
      const { announcements } = await import("@prv/db/schema")
      const { and, isNull, lte } = await import("drizzle-orm")
      const now = new Date()

      const updated = await db
        .update(announcements)
        .set({ archivedAt: now, updatedAt: now })
        .where(
          and(
            isNull(announcements.archivedAt),
            isNull(announcements.deletedAt),
            lte(announcements.expiresAt, now)
          )
        )
        .returning({ id: announcements.id })

      return { archived: updated.length }
    })
  }
)
