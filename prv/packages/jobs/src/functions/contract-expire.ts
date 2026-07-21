import { inngest } from "../client"

// Phase 8.1 — Employment contract expiry status + owner alert.
// Daily sweep: any 'active' contract with an end date that has passed is flipped
// to 'expired', so the stored HR status matches reality. The contract register
// derives an "expired" alert on read (contract-expiry.ts), but the STORED status
// stays 'active' forever without this — a fixed_term / contractor / intern whose
// term ended still reads as an active contract in every count and export.
//
// Each contract that NEWLY expires also raises one in-app notification for its
// creator (the HR owner who drafted it — the same audience the register's
// expiring-soon queue already serves). Because the flip only ever moves
// 'active' → 'expired', a given contract is selected once and so notified once.
//
// Only 'active' → 'expired', and only when an end date exists and is past.
// Permanent contracts (no end date), drafts, and terminal states
// (terminated / superseded) are never touched. Idempotent.
export const contractExpireFunction = inngest.createFunction(
  {
    id: "prv-contract-expire",
    name: "Employment Contract Expiry — Daily",
    retries: 2,
    concurrency: { limit: 1 },
  },
  { cron: "50 0 * * *" }, // 00:50 UTC daily (after invoice-overdue at 00:45)
  async ({ step }) => {
    const flipped = await step.run("mark-expired", async () => {
      const { db } = await import("@prv/db")
      const { employmentContracts } = await import("@prv/db/schema")
      const { and, eq, lt, isNotNull } = await import("drizzle-orm")

      // endDate is a DATE column; a contract is expired only once the day AFTER
      // its end date begins — matching the register's `daysUntil < 0` alert.
      const today = new Date().toISOString().slice(0, 10)

      return db
        .update(employmentContracts)
        .set({ status: "expired", updatedAt: new Date() })
        .where(
          and(
            eq(employmentContracts.status, "active"),
            isNotNull(employmentContracts.endDate),
            lt(employmentContracts.endDate, today)
          )
        )
        .returning({
          id: employmentContracts.id,
          companyId: employmentContracts.companyId,
          createdById: employmentContracts.createdById,
          userId: employmentContracts.userId,
          roleTitle: employmentContracts.roleTitle,
          endDate: employmentContracts.endDate,
        })
    })

    if (flipped.length === 0) return { markedExpired: 0, notified: 0 }

    // One notification per newly-expired contract, addressed to its HR owner.
    const notified = await step.run("notify-owners", async () => {
      const { db } = await import("@prv/db")
      const { notifications } = await import("@prv/db/schema")

      const rows = flipped
        .filter((c) => c.createdById)
        .map((c) => ({
          userId: c.createdById as string,
          companyId: c.companyId,
          type: "warning" as const,
          channel: "in_app" as const,
          title: `Contract expirat: ${c.roleTitle}`.slice(0, 500),
          body: `Contractul „${c.roleTitle}" a depășit data de sfârșit (${c.endDate}) și a fost marcat expirat.`,
          entityType: "employment_contract",
          entityId: c.id,
          actionUrl: `/people/contracts?userId=${c.userId}`,
          deliveredAt: new Date(),
        }))

      if (rows.length === 0) return 0
      // Chunk inserts to keep parameter counts bounded at scale.
      for (let i = 0; i < rows.length; i += 500) {
        await db.insert(notifications).values(rows.slice(i, i + 500))
      }
      return rows.length
    })

    return { markedExpired: flipped.length, notified }
  }
)
