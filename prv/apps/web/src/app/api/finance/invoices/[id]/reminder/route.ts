import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { invoices, clients } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import { sendEmail, EmailFrom } from "@prv/email"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z.object({
  channel: z.enum(["email", "sms"]).default("email"),
  note: z.string().max(500).optional(),
})

export const POST = withGates(
  { action: "finance.invoices.reminder.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").slice(-3, -2)[0]
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const raw = await req.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

    const { channel, note } = parsed.data
    const { userId, companyId, sessionId } = ctx.session

    const [invoice] = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        dueDate: invoices.dueDate,
        total: invoices.total,
        currency: invoices.currency,
        clientId: invoices.clientId,
        clientEmail: clients.email,
        clientName: clients.name,
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(eq(invoices.id, id), eq(invoices.companyId, companyId), isNull(invoices.deletedAt)))
      .limit(1)

    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (!["sent", "overdue"].includes(invoice.status))
      return NextResponse.json({ error: `Cannot send reminder for invoice with status '${invoice.status}'` }, { status: 409 })

    let emailSent = false
    if (channel === "email" && invoice.clientEmail) {
      const amount = Number(invoice.total).toLocaleString("ro-RO", {
        style: "currency",
        currency: invoice.currency ?? "RON",
        maximumFractionDigits: 2,
      })
      await sendEmail({
        to: invoice.clientEmail,
        from: EmailFrom.NOTIFICATIONS,
        subject: `Payment reminder: Invoice ${invoice.invoiceNumber}`,
        html: [
          `<p>Dear ${invoice.clientName ?? "Client"},</p>`,
          `<p>This is a friendly reminder that invoice <strong>${invoice.invoiceNumber}</strong>`,
          ` for <strong>${amount}</strong> is due on <strong>${invoice.dueDate}</strong>.</p>`,
          note ? `<p>${note}</p>` : "",
          `<p>Please arrange payment at your earliest convenience.</p>`,
        ].join(""),
        tags: [
          { name: "type", value: "invoice_reminder" },
          { name: "status", value: invoice.status },
        ],
      })
      emailSent = true
    }

    void writeAuditLog({
      actorId: userId,
      companyId,
      sessionId,
      action: "finance.invoice.reminder",
      entityType: "invoice",
      entityId: id,
      payload: { channel, note: note ?? null, emailSent },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ success: true, id, channel, emailSent })
  }
)
