import { inngest } from "../client"

// Phase 11 — Invoice overdue status.
// Daily sweep: any 'sent' invoice whose due date has passed is flipped to
// 'overdue', so the stored status matches the effective state. The web invoice
// list derives overdue on read, but the mobile command/finance/intelligence
// aggregates count by the STORED status — without this they undercount AR.
//
// Only 'sent' → 'overdue'. Terminal states (paid/cancelled/refunded) and drafts
// are never touched; overdue → paid stays the payment path's job. Idempotent.
export const invoiceOverdueFunction = inngest.createFunction(
  {
    id: "prv-invoice-overdue",
    name: "Invoice Overdue Status — Daily",
    retries: 2,
    concurrency: { limit: 1 },
  },
  { cron: "45 0 * * *" }, // 00:45 UTC daily
  async ({ step }) => {
    return step.run("mark-overdue", async () => {
      const { db } = await import("@prv/db")
      const { invoices } = await import("@prv/db/schema")
      const { and, eq, lt } = await import("drizzle-orm")

      // dueDate is a DATE column; an invoice is overdue only once the day AFTER
      // its due date begins — matching the route's `new Date(dueDate) < today`.
      const today = new Date().toISOString().slice(0, 10)

      const updated = await db
        .update(invoices)
        .set({ status: "overdue", updatedAt: new Date() })
        .where(and(eq(invoices.status, "sent"), lt(invoices.dueDate, today)))
        .returning({ id: invoices.id })

      return { markedOverdue: updated.length }
    })
  }
)
