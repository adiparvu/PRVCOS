import { inngest } from "../client"

// Phase 11 — Invoice overdue status + owner alert.
// Daily sweep: any 'sent' invoice whose due date has passed is flipped to
// 'overdue', so the stored status matches the effective state. The web invoice
// list derives overdue on read, but the mobile command/finance/intelligence
// aggregates count by the STORED status — without this they undercount AR.
//
// Each invoice that NEWLY becomes overdue also raises one in-app notification for
// its creator (the unambiguous owner). Because the flip only ever moves
// 'sent' → 'overdue', a given invoice is selected once and so is notified once.
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
    const flipped = await step.run("mark-overdue", async () => {
      const { db } = await import("@prv/db")
      const { invoices } = await import("@prv/db/schema")
      const { and, eq, lt } = await import("drizzle-orm")

      // dueDate is a DATE column; an invoice is overdue only once the day AFTER
      // its due date begins — matching the route's `new Date(dueDate) < today`.
      const today = new Date().toISOString().slice(0, 10)

      return db
        .update(invoices)
        .set({ status: "overdue", updatedAt: new Date() })
        .where(and(eq(invoices.status, "sent"), lt(invoices.dueDate, today)))
        .returning({
          id: invoices.id,
          companyId: invoices.companyId,
          createdByUserId: invoices.createdByUserId,
          invoiceNumber: invoices.invoiceNumber,
          total: invoices.total,
          dueDate: invoices.dueDate,
        })
    })

    if (flipped.length === 0) return { markedOverdue: 0, notified: 0 }

    // One notification per newly-overdue invoice, addressed to its creator.
    const notified = await step.run("notify-owners", async () => {
      const { db } = await import("@prv/db")
      const { notifications } = await import("@prv/db/schema")

      const rows = flipped
        .filter((inv) => inv.createdByUserId)
        .map((inv) => ({
          userId: inv.createdByUserId as string,
          companyId: inv.companyId,
          type: "warning" as const,
          channel: "in_app" as const,
          title: `Factură restantă: ${inv.invoiceNumber}`,
          body: `Factura ${inv.invoiceNumber} (${inv.total}) a depășit scadența (${inv.dueDate}).`,
          entityType: "invoice",
          entityId: inv.id,
          actionUrl: `/finance/invoices/${inv.id}`,
          deliveredAt: new Date(),
        }))

      if (rows.length === 0) return 0
      // Chunk inserts to keep parameter counts bounded at scale.
      for (let i = 0; i < rows.length; i += 500) {
        await db.insert(notifications).values(rows.slice(i, i + 500))
      }
      return rows.length
    })

    return { markedOverdue: flipped.length, notified }
  }
)
