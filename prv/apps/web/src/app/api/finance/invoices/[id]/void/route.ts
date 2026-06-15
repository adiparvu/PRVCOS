import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { invoices } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z.object({
  reason: z.string().min(1).max(500),
})

const VOIDABLE = ["draft", "sent", "overdue"] as const

export const POST = withGates(
  { action: "finance.invoices.void.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").slice(-3, -2)[0]
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const raw = await req.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 422 })

    const { reason } = parsed.data
    const { userId, companyId, sessionId } = ctx.session

    const [existing] = await db
      .select({ id: invoices.id, status: invoices.status, invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.companyId, companyId), isNull(invoices.deletedAt)))
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (!(VOIDABLE as readonly string[]).includes(existing.status))
      return NextResponse.json(
        { error: `Cannot void invoice with status '${existing.status}'` },
        { status: 409 }
      )

    await db
      .update(invoices)
      .set({ status: "cancelled", notes: reason })
      .where(and(eq(invoices.id, id), eq(invoices.companyId, companyId)))

    void writeAuditLog({
      actorId: userId,
      companyId,
      sessionId,
      action: "finance.invoice.void",
      entityType: "invoice",
      entityId: id,
      payload: { reason, invoiceNumber: existing.invoiceNumber },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ success: true, id })
  }
)
