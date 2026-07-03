import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { documents } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function docId(req: NextRequest): string {
  // /api/documents/[id]/legal-hold → id is the second-to-last segment
  return req.nextUrl.pathname.split("/").at(-2) ?? ""
}

const bodySchema = z.object({
  hold: z.boolean(),
  reason: z.string().max(500).nullable().optional(),
})

// POST /api/documents/[id]/legal-hold — place or release a legal hold. A held
// document is exempt from retention archival and GDPR erasure.
export const POST = withGates(
  { action: "documents.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = docId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const { companyId, userId: actorId, sessionId } = ctx.session

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const { hold, reason } = parsed.data

    const [updated] = await db
      .update(documents)
      .set({
        legalHold: hold,
        legalHoldReason: hold ? (reason ?? null) : null,
        updatedAt: new Date(),
      })
      .where(
        and(eq(documents.id, id), eq(documents.companyId, companyId), isNull(documents.deletedAt))
      )
      .returning({ id: documents.id, legalHold: documents.legalHold })
    if (!updated) return NextResponse.json({ error: "Document not found" }, { status: 404 })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: hold ? "documents.legal_hold.place" : "documents.legal_hold.release",
      entityType: "document",
      entityId: id,
      payload: { hold, reason: reason ?? null },
      method: "POST",
      path: `/api/documents/${id}/legal-hold`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: updated.id, legalHold: updated.legalHold })
  }
)
