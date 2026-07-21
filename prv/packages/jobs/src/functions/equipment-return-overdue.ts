import { inngest } from "../client"

// Phase 7.6 — Equipment assignment custody-overdue reminder.
//
// Daily sweep: any still-'assigned' equipment whose expected return date has
// passed is company kit held past its due-back date. The register flags these
// overdue on read, but nothing reminds the holder. Like the tool-checkout
// reminder, this is a notification (not a status flip) to an unambiguous,
// non-escalatory recipient: the employee the equipment is assigned to.
//
// Mirrors the register's overdue rule (status assigned + expectedReturnDate in
// the past). Each assignment is claimed once via overdueNotifiedAt
// (claim-on-null), so the holder is reminded exactly once; returning the item
// moves it off 'assigned' and out of the candidate set. Idempotent.
export const equipmentReturnOverdueFunction = inngest.createFunction(
  {
    id: "prv-equipment-return-overdue",
    name: "Equipment Return Overdue Reminder — Daily",
    retries: 2,
    concurrency: { limit: 1 },
  },
  { cron: "0 2 * * *" }, // 02:00 UTC daily
  async ({ step }) => {
    // Step 1: find assigned, un-reminded items past their expected return date.
    const candidates = await step.run("find-overdue-assignments", async () => {
      const { db } = await import("@prv/db")
      const { equipmentAssignments } = await import("@prv/db/schema")
      const { and, eq, lt, isNull, isNotNull } = await import("drizzle-orm")

      // expectedReturnDate is a DATE column; an item is overdue only once the day
      // AFTER it begins — matching the register's `expectedReturnDate < today`.
      const today = new Date().toISOString().slice(0, 10)

      return db
        .select({
          id: equipmentAssignments.id,
          companyId: equipmentAssignments.companyId,
          userId: equipmentAssignments.userId,
          equipmentType: equipmentAssignments.equipmentType,
          label: equipmentAssignments.label,
          expectedReturnDate: equipmentAssignments.expectedReturnDate,
        })
        .from(equipmentAssignments)
        .where(
          and(
            eq(equipmentAssignments.status, "assigned"),
            isNull(equipmentAssignments.overdueNotifiedAt),
            isNotNull(equipmentAssignments.expectedReturnDate),
            lt(equipmentAssignments.expectedReturnDate, today)
          )
        )
        .limit(500)
    })

    if (candidates.length === 0) return { overdue: 0, claimed: 0, notified: 0 }

    // Step 2: claim (stamp overdueNotifiedAt on still-null rows) so the reminder
    // fires at most once, even if a retry re-runs.
    const claimedIds = await step.run("claim-assignments", async () => {
      const { db } = await import("@prv/db")
      const { equipmentAssignments } = await import("@prv/db/schema")
      const { and, isNull, inArray } = await import("drizzle-orm")
      const now = new Date()

      const claimed = await db
        .update(equipmentAssignments)
        .set({ overdueNotifiedAt: now, updatedAt: now })
        .where(
          and(
            inArray(
              equipmentAssignments.id,
              candidates.map((c) => c.id)
            ),
            isNull(equipmentAssignments.overdueNotifiedAt)
          )
        )
        .returning({ id: equipmentAssignments.id })

      return claimed.map((r) => r.id)
    })

    if (claimedIds.length === 0) return { overdue: candidates.length, claimed: 0, notified: 0 }
    const claimedSet = new Set(claimedIds)
    const claimed = candidates.filter((c) => claimedSet.has(c.id))

    // Step 3: one reminder per claimed assignment, addressed to the holder.
    const notified = await step.run("notify-holders", async () => {
      const { db } = await import("@prv/db")
      const { notifications } = await import("@prv/db/schema")
      const now = new Date()

      const rows = claimed.map((c) => {
        const itemLabel = c.label ?? c.equipmentType
        return {
          userId: c.userId,
          companyId: c.companyId,
          type: "warning" as const,
          channel: "in_app" as const,
          title: `Echipament de returnat: ${itemLabel}`.slice(0, 500),
          body: `Echipamentul „${itemLabel}" a depășit data de returnare (${String(
            c.expectedReturnDate
          ).slice(0, 10)}). Te rugăm să îl returnezi.`,
          entityType: "equipment_assignment",
          entityId: c.id,
          actionUrl: `/people/equipment?userId=${c.userId}`,
          deliveredAt: now,
        }
      })

      for (let i = 0; i < rows.length; i += 500) {
        await db.insert(notifications).values(rows.slice(i, i + 500))
      }
      return rows.length
    })

    return { overdue: candidates.length, claimed: claimed.length, notified }
  }
)
