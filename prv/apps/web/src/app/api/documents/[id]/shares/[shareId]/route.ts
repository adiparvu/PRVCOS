import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { documentShares } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function shareId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-1) ?? ""
}

// DELETE /api/documents/[id]/shares/[shareId] — revoke a share (soft; keeps the
// row + access history, blocks further use).
export const DELETE = withGates(
  { action: "documents.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = shareId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const { companyId, userId: actorId, sessionId } = ctx.session

    const [updated] = await db
      .update(documentShares)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(documentShares.id, id), eq(documentShares.companyId, companyId)))
      .returning({ id: documentShares.id })
    if (!updated) return NextResponse.json({ error: "Share not found" }, { status: 404 })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "documents.share.revoke",
      entityType: "document_share",
      entityId: id,
      payload: {},
      method: "DELETE",
      path: `/api/documents/shares/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: updated.id })
  }
)
