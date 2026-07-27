import { NextRequest, NextResponse } from "next/server"
import { withPortalAuth } from "@/lib/portal-middleware"
import { notifyStaffUser } from "@/lib/portal-staff-notify"
import type { PortalSessionContext } from "@/lib/portal-auth"
import { db } from "@prv/db"
import { invoices } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z.object({
  decision: z.enum(["accepted", "rejected"]),
  note: z.string().max(500).optional(),
})

// path: /api/portal/quotes/[id]/decision
function quoteId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-2) ?? ""
}

// The client accepts or rejects a quote (a `sent` invoice that belongs to them).
// Rejecting cancels it; accepting records the decision in metadata but never
// changes the payment status — acceptance is not payment.
export const POST = withPortalAuth(
  async (req: NextRequest, ctx: PortalSessionContext): Promise<NextResponse> => {
    if (!ctx.clientId) {
      return NextResponse.json(
        { error: "No client profile linked to this account" },
        { status: 403 }
      )
    }

    const id = quoteId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const raw = await req.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

    const [existing] = await db
      .select({
        id: invoices.id,
        status: invoices.status,
        metadata: invoices.metadata,
        invoiceNumber: invoices.invoiceNumber,
        createdByUserId: invoices.createdByUserId,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.id, id),
          eq(invoices.companyId, ctx.companyId),
          eq(invoices.clientId, ctx.clientId),
          isNull(invoices.deletedAt)
        )
      )
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (existing.status !== "sent") {
      return NextResponse.json(
        { error: `This quote can no longer be decided (status: ${existing.status})` },
        { status: 409 }
      )
    }

    const { decision, note } = parsed.data
    const meta = (existing.metadata ?? {}) as Record<string, unknown>
    const nextMeta = {
      ...meta,
      clientDecision: decision,
      clientDecidedAt: new Date().toISOString(),
      clientDecisionAccountId: ctx.accountId,
      ...(note ? { clientDecisionNote: note } : {}),
    }

    await db
      .update(invoices)
      .set({
        // Reject cancels the quote; accept leaves the payment status untouched.
        ...(decision === "rejected" ? { status: "cancelled" as const } : {}),
        metadata: nextMeta,
        updatedAt: new Date(),
      })
      .where(and(eq(invoices.id, id), eq(invoices.companyId, ctx.companyId)))

    // Tell the quote's creator — the client's decision must not sit unseen.
    if (existing.createdByUserId) {
      try {
        await notifyStaffUser({
          userId: existing.createdByUserId,
          companyId: ctx.companyId,
          title:
            decision === "accepted"
              ? `Clientul a acceptat oferta ${existing.invoiceNumber}`
              : `Clientul a respins oferta ${existing.invoiceNumber}`,
          body: note
            ? `Notă de la client: ${note.slice(0, 300)}`
            : "Decizie luată în portalul clientului.",
          entityType: "invoice",
          entityId: id,
          actionUrl: `/crm/quotes`,
        })
      } catch (err) {
        console.error("[portal.quotes.decision] staff notification failed:", err)
      }
    }

    return NextResponse.json({
      id,
      decision,
      status: decision === "rejected" ? "cancelled" : existing.status,
    })
  },
  { portalType: "client" }
)
