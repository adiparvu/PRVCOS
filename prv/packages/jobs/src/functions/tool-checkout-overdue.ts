import { inngest } from "../client"

// Phase 22.1 — Tool checkout custody-overdue reminder.
//
// Daily sweep: any OPEN tool checkout whose expected return time has passed is a
// tool held past its due-back date. Unlike a status flip, a checkout has no
// "overdue" state — it is either open or returned — so this raises a reminder
// rather than mutating status. The recipient is unambiguous and non-escalatory:
// the custodian physically holding the tool.
//
// Mirrors the read-side isCheckoutOverdue helper (status open + expectedReturnAt
// in the past). Each overdue checkout is claimed once via overdueNotifiedAt
// (claim-on-null), so the custodian is reminded exactly once; returning the tool
// closes the checkout and removes it from the candidate set. Idempotent.
export const toolCheckoutOverdueFunction = inngest.createFunction(
  {
    id: "prv-tool-checkout-overdue",
    name: "Tool Checkout Overdue Reminder — Daily",
    retries: 2,
    concurrency: { limit: 1 },
  },
  { cron: "55 1 * * *" }, // 01:55 UTC daily
  async ({ step }) => {
    // Step 1: find open, un-reminded checkouts past their expected return time,
    // joined to the tool for its name.
    const candidates = await step.run("find-overdue-checkouts", async () => {
      const { db } = await import("@prv/db")
      const { toolCheckouts, tools } = await import("@prv/db/schema")
      const { and, eq, lt, isNull, isNotNull } = await import("drizzle-orm")
      const now = new Date()

      return db
        .select({
          checkoutId: toolCheckouts.id,
          companyId: toolCheckouts.companyId,
          toolId: toolCheckouts.toolId,
          custodianId: toolCheckouts.custodianId,
          expectedReturnAt: toolCheckouts.expectedReturnAt,
          toolName: tools.name,
        })
        .from(toolCheckouts)
        .innerJoin(tools, eq(toolCheckouts.toolId, tools.id))
        .where(
          and(
            eq(toolCheckouts.status, "open"),
            isNull(toolCheckouts.overdueNotifiedAt),
            isNotNull(toolCheckouts.custodianId),
            isNotNull(toolCheckouts.expectedReturnAt),
            lt(toolCheckouts.expectedReturnAt, now)
          )
        )
        .limit(500)
    })

    if (candidates.length === 0) return { overdue: 0, claimed: 0, notified: 0 }

    // Step 2: claim the checkouts (stamp overdueNotifiedAt on the still-null
    // rows) so the reminder fires at most once, even if a retry re-runs.
    const claimedIds = await step.run("claim-checkouts", async () => {
      const { db } = await import("@prv/db")
      const { toolCheckouts } = await import("@prv/db/schema")
      const { and, isNull, inArray } = await import("drizzle-orm")
      const now = new Date()

      const claimed = await db
        .update(toolCheckouts)
        .set({ overdueNotifiedAt: now, updatedAt: now })
        .where(
          and(
            inArray(
              toolCheckouts.id,
              candidates.map((c) => c.checkoutId)
            ),
            isNull(toolCheckouts.overdueNotifiedAt)
          )
        )
        .returning({ id: toolCheckouts.id })

      return claimed.map((r) => r.id)
    })

    if (claimedIds.length === 0) return { overdue: candidates.length, claimed: 0, notified: 0 }
    const claimedSet = new Set(claimedIds)
    const claimed = candidates.filter((c) => claimedSet.has(c.checkoutId))

    // Step 3: one reminder per claimed checkout, addressed to the custodian.
    const notified = await step.run("notify-custodians", async () => {
      const { db } = await import("@prv/db")
      const { notifications } = await import("@prv/db/schema")
      const now = new Date()

      const rows = claimed.map((c) => ({
        userId: c.custodianId as string,
        companyId: c.companyId,
        type: "warning" as const,
        channel: "in_app" as const,
        title: `Unealtă de returnat: ${c.toolName}`.slice(0, 500),
        body: `Unealta „${c.toolName}" a depășit data de returnare (${String(
          c.expectedReturnAt
        ).slice(0, 10)}). Te rugăm să o returnezi.`,
        entityType: "tool",
        entityId: c.toolId,
        actionUrl: `/tools/${c.toolId}`,
        deliveredAt: now,
      }))

      for (let i = 0; i < rows.length; i += 500) {
        await db.insert(notifications).values(rows.slice(i, i + 500))
      }
      return rows.length
    })

    return { overdue: candidates.length, claimed: claimed.length, notified }
  }
)
