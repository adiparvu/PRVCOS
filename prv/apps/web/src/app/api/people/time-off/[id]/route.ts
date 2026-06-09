import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { leaveRequests, users, stores, auditLogs } from "@prv/db/schema"
import { and, desc, eq, isNull } from "drizzle-orm"
import type { TimeOffRequest, TimeOffStatus, TimeOffType } from "../route"

export interface TimeOffDetail extends TimeOffRequest {
  approvedByName: string | null
  storeName: string | null
  auditTrail: { id: string; action: string; timestamp: string }[]
}

function toApiType(dbType: string): TimeOffType {
  if (dbType === "annual") return "annual"
  if (dbType === "medical") return "sick"
  if (dbType === "unpaid") return "unpaid"
  return "personal"
}

const TYPE_LABELS: Record<TimeOffType, string> = {
  annual: "Annual Leave",
  sick: "Sick Leave",
  personal: "Personal Day",
  maternity: "Maternity Leave",
  paternity: "Paternity Leave",
  unpaid: "Unpaid Leave",
}

function toApiStatus(dbStatus: string): TimeOffStatus {
  if (dbStatus === "approved") return "approved"
  if (dbStatus === "rejected") return "declined"
  return "pending"
}

function countWorkingDays(startDate: string, endDate: string): number {
  const start = new Date(startDate + "T12:00:00Z")
  const end = new Date(endDate + "T12:00:00Z")
  let days = 0
  const cur = new Date(start)
  while (cur <= end) {
    const dow = cur.getUTCDay()
    if (dow !== 0 && dow !== 6) days++
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return days || 1
}

export const GET = withGates(
  { action: "hr.time_off.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId } = ctx.session

    const [rows, trailRows] = await Promise.all([
      db
        .select({
          id: leaveRequests.id,
          userId: leaveRequests.userId,
          type: leaveRequests.type,
          status: leaveRequests.status,
          startDate: leaveRequests.startDate,
          endDate: leaveRequests.endDate,
          notes: leaveRequests.notes,
          createdAt: leaveRequests.createdAt,
          approvedByUserId: leaveRequests.approvedByUserId,
          firstName: users.firstName,
          lastName: users.lastName,
          jobTitle: users.jobTitle,
          storeName: stores.name,
          storeCity: stores.city,
        })
        .from(leaveRequests)
        .leftJoin(users, eq(leaveRequests.userId, users.id))
        .leftJoin(stores, eq(users.storeId, stores.id))
        .where(
          and(
            eq(leaveRequests.id, id),
            eq(leaveRequests.companyId, companyId),
            isNull(leaveRequests.deletedAt)
          )
        )
        .limit(1),

      db
        .select({ id: auditLogs.id, action: auditLogs.action, createdAt: auditLogs.createdAt })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.companyId, companyId),
            eq(auditLogs.entityId, id),
            eq(auditLogs.entityType, "time_off_request")
          )
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(20),
    ])

    const row = rows[0]
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    let approvedByName: string | null = null
    if (row.approvedByUserId) {
      const [approver] = await db
        .select({ firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(eq(users.id, row.approvedByUserId))
        .limit(1)
      if (approver?.firstName) {
        approvedByName = `${approver.firstName} ${approver.lastName}`
      }
    }

    const apiType = toApiType(row.type)
    const detail: TimeOffDetail = {
      id: row.id,
      employeeId: row.userId,
      employeeName: row.firstName ? `${row.firstName} ${row.lastName}` : "—",
      employeeInitials: row.firstName ? `${row.firstName[0]}${row.lastName![0]}` : "?",
      employeeRole: row.jobTitle ?? "—",
      employeeLocation: row.storeCity ?? row.storeName ?? "—",
      leaveBalance: 0,
      type: apiType,
      typeLabel: TYPE_LABELS[apiType],
      startDate: row.startDate,
      endDate: row.startDate === row.endDate ? null : row.endDate,
      workingDays: countWorkingDays(row.startDate, row.endDate),
      note: row.notes ?? null,
      hasCertificate: false,
      coverNeeded: false,
      status: toApiStatus(row.status),
      submittedAt: row.createdAt.toISOString(),
      approvedByName,
      storeName: row.storeName ?? null,
      auditTrail: trailRows.map((t) => ({
        id: t.id,
        action: t.action,
        timestamp: t.createdAt.toISOString(),
      })),
    }

    return NextResponse.json({ request: detail })
  }
)

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z.object({
  action: z.enum(["approve", "decline"]),
  reason: z.string().max(500).optional(),
})

export const POST = withGates(
  { action: "hr.time_off.approve", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").slice(-2, -1)[0]
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const raw = await req.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const { action, reason } = parsed.data

    await writeAuditLog({
      actorId: ctx.session.userId,
      companyId: ctx.session.companyId,
      action: `hr.time_off.${action}`,
      entityType: "time_off_request",
      entityId: id,
      payload: { reason: reason ?? null },
      ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
      userAgent: req.headers.get("user-agent") ?? "unknown",
    })

    return NextResponse.json({ success: true, id, action })
  }
)
