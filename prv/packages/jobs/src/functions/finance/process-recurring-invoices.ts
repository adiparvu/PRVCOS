import { inngest } from "../../client"

// Daily cron: process recurring invoices due today or earlier
export const processRecurringInvoicesFunction = inngest.createFunction(
  {
    id: "prv-finance-process-recurring-invoices",
    name: "Process Recurring Invoices",
    retries: 3,
    concurrency: { limit: 10 },
  },
  { cron: "0 6 * * *" },
  async ({ step }) => {
    // Step 1: fetch all due active recurring invoices
    const dueItems = await step.run("fetch-due-recurring-invoices", async () => {
      const { db } = await import("@prv/db")
      const { recurringInvoices } = await import("@prv/db/schema")
      const { and, eq, lte, isNull } = await import("drizzle-orm")

      const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

      const rows = await db
        .select({
          id: recurringInvoices.id,
          companyId: recurringInvoices.companyId,
          clientId: recurringInvoices.clientId,
          projectId: recurringInvoices.projectId,
          createdByUserId: recurringInvoices.createdByUserId,
          name: recurringInvoices.name,
          frequency: recurringInvoices.frequency,
          nextRunDate: recurringInvoices.nextRunDate,
          endDate: recurringInvoices.endDate,
          subtotal: recurringInvoices.subtotal,
          vatRate: recurringInvoices.vatRate,
          vatAmount: recurringInvoices.vatAmount,
          total: recurringInvoices.total,
          currency: recurringInvoices.currency,
          notes: recurringInvoices.notes,
          runCount: recurringInvoices.runCount,
        })
        .from(recurringInvoices)
        .where(
          and(
            eq(recurringInvoices.isActive, true),
            lte(recurringInvoices.nextRunDate, today),
            isNull(recurringInvoices.deletedAt)
          )
        )

      return rows
    })

    if (dueItems.length === 0) {
      return { processed: 0, skipped: 0, errors: 0 }
    }

    let processed = 0
    let skipped = 0
    let errors = 0

    // Step 2: process each due item individually
    for (const item of dueItems) {
      const result = await step.run(`process-item-${item.id}`, async () => {
        const { db } = await import("@prv/db")
        const { invoices, recurringInvoices } = await import("@prv/db/schema")
        const { eq, sql, max, isNull } = await import("drizzle-orm")

        try {
          // Skip if past end date
          if (item.endDate) {
            const today = new Date().toISOString().slice(0, 10)
            if (item.endDate < today) {
              // Deactivate
              await db
                .update(recurringInvoices)
                .set({ isActive: false, updatedAt: new Date() })
                .where(eq(recurringInvoices.id, item.id))
              return { status: "deactivated" }
            }
          }

          // Generate invoice number: PRV-YYYY-NNNN
          const year = new Date().getFullYear()
          const prefix = `PRV-${year}-`
          const [maxRow] = await db
            .select({ maxNum: max(invoices.invoiceNumber) })
            .from(invoices)
            .where(
              sql`${invoices.companyId} = ${item.companyId}
                AND ${invoices.invoiceNumber} LIKE ${prefix + "%"}
                AND ${isNull(invoices.deletedAt)}`
            )

          let nextSeq = 1
          if (maxRow?.maxNum) {
            const seq = parseInt(maxRow.maxNum.split("-").pop() ?? "0", 10)
            nextSeq = isNaN(seq) ? 1 : seq + 1
          }
          const invoiceNumber = `${prefix}${String(nextSeq).padStart(4, "0")}`

          const issueDate = new Date()
          const dueDate = new Date(issueDate)
          dueDate.setDate(dueDate.getDate() + 30)

          // Create invoice
          await db.insert(invoices).values({
            companyId: item.companyId,
            clientId: item.clientId,
            projectId: item.projectId,
            createdByUserId: item.createdByUserId,
            invoiceNumber,
            status: "sent",
            issueDate: issueDate.toISOString().slice(0, 10),
            dueDate: dueDate.toISOString().slice(0, 10),
            subtotal: item.subtotal,
            vatAmount: item.vatAmount,
            total: item.total,
            currency: item.currency,
            notes: item.notes ?? `Auto-generated from recurring invoice: ${item.name}`,
            metadata: { recurringInvoiceId: item.id, runCount: item.runCount + 1 },
          })

          // Advance nextRunDate based on frequency
          const nextRun = new Date(item.nextRunDate)
          switch (item.frequency) {
            case "weekly":
              nextRun.setDate(nextRun.getDate() + 7)
              break
            case "monthly":
              nextRun.setMonth(nextRun.getMonth() + 1)
              break
            case "quarterly":
              nextRun.setMonth(nextRun.getMonth() + 3)
              break
            case "annual":
              nextRun.setFullYear(nextRun.getFullYear() + 1)
              break
          }

          await db
            .update(recurringInvoices)
            .set({
              nextRunDate: nextRun.toISOString().slice(0, 10),
              lastRunAt: new Date(),
              runCount: item.runCount + 1,
              updatedAt: new Date(),
            })
            .where(eq(recurringInvoices.id, item.id))

          return { status: "created", invoiceNumber }
        } catch (err) {
          return { status: "error", error: String(err) }
        }
      })

      if (result.status === "created") processed++
      else if (result.status === "deactivated") skipped++
      else errors++
    }

    return {
      processed,
      skipped,
      errors,
      total: dueItems.length,
    }
  }
)
