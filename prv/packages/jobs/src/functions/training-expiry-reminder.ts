import { inngest } from "../client"

// Phase 18.3 — Certification / safety-training expiry reminder.
// Daily: any training record whose expiry is within the 30-day warning window
// (or already past) and that has not been reminded yet raises one in-app warning
// for the worker, then stamps reminder_sent_at so it never repeats. A renewed
// certificate is a new row with a null stamp, so it earns its own reminder.
//
// The 30-day window matches training-compliance.ts's WARNING_DAYS so the cron
// and the compliance dashboard agree on what "expiring soon" means.
const WARNING_DAYS = 30

export const trainingExpiryReminderFunction = inngest.createFunction(
  {
    id: "prv-training-expiry-reminder",
    name: "Certification Expiry Reminder — Daily",
    retries: 2,
    concurrency: { limit: 1 },
  },
  { cron: "0 7 * * *" }, // 07:00 UTC daily (morning)
  async ({ step }) => {
    const due = await step.run("find-expiring", async () => {
      const { db } = await import("@prv/db")
      const { safetyTrainingRecords } = await import("@prv/db/schema")
      const { and, isNull, isNotNull, lte } = await import("drizzle-orm")

      const now = new Date()
      const cutoff = new Date(now.getTime() + WARNING_DAYS * 24 * 60 * 60 * 1000)

      return db
        .select({
          id: safetyTrainingRecords.id,
          companyId: safetyTrainingRecords.companyId,
          userId: safetyTrainingRecords.userId,
          trainingName: safetyTrainingRecords.trainingName,
          expiresAt: safetyTrainingRecords.expiresAt,
        })
        .from(safetyTrainingRecords)
        .where(
          and(
            isNotNull(safetyTrainingRecords.expiresAt),
            isNull(safetyTrainingRecords.reminderSentAt),
            lte(safetyTrainingRecords.expiresAt, cutoff)
          )
        )
        .limit(5000)
    })

    if (due.length === 0) return { reminded: 0 }

    const reminded = await step.run("notify-and-stamp", async () => {
      const { db } = await import("@prv/db")
      const { safetyTrainingRecords, notifications } = await import("@prv/db/schema")
      const { inArray } = await import("drizzle-orm")
      const now = new Date()

      const rows = due.map((r) => {
        const expiry = r.expiresAt ? String(r.expiresAt).slice(0, 10) : ""
        const expired = r.expiresAt ? new Date(r.expiresAt).getTime() <= now.getTime() : false
        return {
          userId: r.userId,
          companyId: r.companyId,
          type: "warning" as const,
          channel: "in_app" as const,
          title:
            `${expired ? "Certificare expirată" : "Certificare expiră curând"}: ${r.trainingName}`.slice(
              0,
              500
            ),
          body: expired
            ? `Certificarea „${r.trainingName}" a expirat (${expiry}). Reînnoiește-o pentru a rămâne conform.`
            : `Certificarea „${r.trainingName}" expiră la ${expiry}. Programează reînnoirea.`,
          entityType: "safety_training_record",
          entityId: r.id,
          actionUrl: "/safety/training",
          deliveredAt: now,
        }
      })

      for (let i = 0; i < rows.length; i += 500) {
        await db.insert(notifications).values(rows.slice(i, i + 500))
      }

      // Stamp all reminded records so they are never reminded again.
      const ids = due.map((r) => r.id)
      for (let i = 0; i < ids.length; i += 500) {
        await db
          .update(safetyTrainingRecords)
          .set({ reminderSentAt: now })
          .where(inArray(safetyTrainingRecords.id, ids.slice(i, i + 500)))
      }

      return rows.length
    })

    return { reminded }
  }
)
