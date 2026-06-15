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
  decision: z.enum(["accepted", "rejected"]),
  note: z.string().max(500).optional(),
})

export const POST = withGates(
  { action: "crm.quotes.decision.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").slice(-3, -2)[0]
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const raw = await req.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

    const { decision, note } = parsed.data
    const { userId, companyId, sessionId } = ctx.session

    const [existing] = await db
      .select({ id: invoices.id, status: invoices.status })
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.companyId, companyId), isNull(invoices.deletedAt)))
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (!["draft", "sent"].includes(existing.status))
      return NextResponse.json({ error: `Quote is already ${existing.status}` }, { status: 409 })

    const newStatus = decision === "accepted" ? "paid" : "cancelled"
    await db
      .update(invoices)
      .set({
        status: newStatus,
        ...(decision === "accepted" ? { paidAt: new Date() } : {}),
        ...(note ? { notes: note } : {}),
      })
      .where(and(eq(invoices.id, id), eq(invoices.companyId, companyId)))

    void writeAuditLog({
      actorId: userId,
      companyId,
      sessionId,
      action: `crm.quote.${decision}`,
      entityType: "quote",
      entityId: id,
      payload: { decision, note: note ?? null, newStatus },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ success: true, id, decision })
  }
)
