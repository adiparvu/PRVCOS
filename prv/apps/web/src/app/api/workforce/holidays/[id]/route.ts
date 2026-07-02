import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { publicHolidays } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function id(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-1) ?? ""
}

// DELETE /api/workforce/holidays/[id] — remove a holiday from the calendar.
export const DELETE = withGates(
  { action: "workforce.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rowId = id(req)
    if (!rowId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId: actorId, sessionId } = ctx.session

    const deleted = await db
      .delete(publicHolidays)
      .where(and(eq(publicHolidays.id, rowId), eq(publicHolidays.companyId, companyId)))
      .returning({ id: publicHolidays.id })

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Holiday not found" }, { status: 404 })
    }

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "workforce.holiday.delete",
      entityType: "public_holiday",
      entityId: rowId,
      payload: { id: rowId },
      method: "DELETE",
      path: `/api/workforce/holidays/${rowId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ removed: deleted.length })
  }
)
