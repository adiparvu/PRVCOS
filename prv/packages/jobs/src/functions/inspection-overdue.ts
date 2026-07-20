import { inngest } from "../client"

// Phase 18.2 — Safety inspection overdue status + inspector alert.
// Daily sweep: any 'scheduled' inspection whose scheduled time has passed is
// flipped to 'overdue', so the stored status matches reality. The mobile safety
// dashboard counts by the STORED status, so without this overdue inspections
// read as zero — a safety-compliance blind spot.
//
// Each inspection that NEWLY becomes overdue also raises one in-app warning for
// its assigned inspector. Because the flip only moves 'scheduled' → 'overdue',
// an inspection is selected — and alerted — exactly once.
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
    const flipped = await step.run("mark-overdue", async () => {
      const { db } = await import("@prv/db")
      const { safetyInspections } = await import("@prv/db/schema")
      const { and, eq, lt } = await import("drizzle-orm")
      const now = new Date()

      return db
        .update(safetyInspections)
        .set({ status: "overdue", updatedAt: now })
        .where(
          and(eq(safetyInspections.status, "scheduled"), lt(safetyInspections.scheduledAt, now))
        )
        .returning({
          id: safetyInspections.id,
          companyId: safetyInspections.companyId,
          assignedTo: safetyInspections.assignedTo,
          title: safetyInspections.title,
          scheduledAt: safetyInspections.scheduledAt,
        })
    })

    if (flipped.length === 0) return { markedOverdue: 0, notified: 0 }

    // One warning per newly-overdue inspection, to its assigned inspector.
    const notified = await step.run("notify-inspectors", async () => {
      const { db } = await import("@prv/db")
      const { notifications } = await import("@prv/db/schema")

      const rows = flipped
        .filter((insp) => insp.assignedTo)
        .map((insp) => ({
          userId: insp.assignedTo as string,
          companyId: insp.companyId,
          type: "warning" as const,
          channel: "in_app" as const,
          title: `Inspecție restantă: ${insp.title}`.slice(0, 500),
          body: `Inspecția „${insp.title}" a depășit data programată (${String(insp.scheduledAt).slice(0, 10)}).`,
          entityType: "safety_inspection",
          entityId: insp.id,
          actionUrl: `/safety/inspections/${insp.id}`,
          deliveredAt: new Date(),
        }))

      if (rows.length === 0) return 0
      for (let i = 0; i < rows.length; i += 500) {
        await db.insert(notifications).values(rows.slice(i, i + 500))
      }
      return rows.length
    })

    return { markedOverdue: flipped.length, notified }
  }
)
