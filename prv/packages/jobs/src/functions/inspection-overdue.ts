import { inngest } from "../client"

// Phase 18.2 — Safety inspection overdue status.
// Daily sweep: any 'scheduled' inspection whose scheduled time has passed is
// flipped to 'overdue', so the stored status matches reality. The mobile safety
// dashboard counts by the STORED status, so without this overdue inspections
// read as zero — a safety-compliance blind spot.
//
// Only 'scheduled' → 'overdue'. In-progress (being carried out), completed
// (terminal), and already-overdue inspections are never touched. Idempotent.
export const inspectionOverdueFunction = inngest.createFunction(
  {
    id: "prv-inspection-overdue",
    name: "Inspection Overdue Status — Daily",
    retries: 2,
    concurrency: { limit: 1 },
  },
  { cron: "20 1 * * *" }, // 01:20 UTC daily
  async ({ step }) => {
    return step.run("mark-overdue", async () => {
      const { db } = await import("@prv/db")
      const { safetyInspections } = await import("@prv/db/schema")
      const { and, eq, lt } = await import("drizzle-orm")
      const now = new Date()

      const updated = await db
        .update(safetyInspections)
        .set({ status: "overdue", updatedAt: now })
        .where(
          and(eq(safetyInspections.status, "scheduled"), lt(safetyInspections.scheduledAt, now))
        )
        .returning({ id: safetyInspections.id })

      return { markedOverdue: updated.length }
    })
  }
)
