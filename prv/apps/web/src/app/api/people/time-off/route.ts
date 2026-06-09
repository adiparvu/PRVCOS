import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { leaveRequests, users, stores } from "@prv/db/schema"
import { and, desc, eq, isNull, lt } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type TimeOffStatus = "pending" | "approved" | "declined"
export type TimeOffType = "annual" | "sick" | "personal" | "maternity" | "paternity" | "unpaid"

export interface TimeOffRequest {
  id: string
  employeeId: string
  employeeName: string
  employeeInitials: string
  employeeRole: string
  employeeLocation: string
  leaveBalance: number
  type: TimeOffType
  typeLabel: string
  startDate: string
  endDate: string | null
  workingDays: number
  note: string | null
  hasCertificate: boolean
  coverNeeded: boolean
  status: TimeOffStatus
  submittedAt: string
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
    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get("status") ?? "pending"
    const { companyId } = ctx.session

    const dbStatus = statusFilter === "declined" ? "rejected" : statusFilter

    const cursor = searchParams.get("cursor")
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200)

    const leaveConditions = [
      eq(leaveRequests.companyId, companyId),
      eq(leaveRequests.status, dbStatus as "pending" | "approved" | "rejected"),
      isNull(leaveRequests.deletedAt),
    ]
    if (cursor) leaveConditions.push(lt(leaveRequests.createdAt, new Date(cursor)))

    const rawRows = await db
      .select({
        id: leaveRequests.id,
        userId: leaveRequests.userId,
        type: leaveRequests.type,
        status: leaveRequests.status,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        notes: leaveRequests.notes,
        createdAt: leaveRequests.createdAt,
        firstName: users.firstName,
        lastName: users.lastName,
        jobTitle: users.jobTitle,
        storeName: stores.name,
        storeCity: stores.city,
      })
      .from(leaveRequests)
      .leftJoin(users, eq(leaveRequests.userId, users.id))
      .leftJoin(stores, eq(users.storeId, stores.id))
      .where(and(...leaveConditions))
      .orderBy(desc(leaveRequests.createdAt))
      .limit(limit + 1)

    const hasMore = rawRows.length > limit
    const rows = hasMore ? rawRows.slice(0, limit) : rawRows
    const nextCursor =
      hasMore && rows.length > 0 ? rows[rows.length - 1]!.createdAt.toISOString() : null

    const results: TimeOffRequest[] = rows.map((r) => {
      const name = r.firstName ? `${r.firstName} ${r.lastName}` : "—"
      const initials = r.firstName ? `${r.firstName[0]}${r.lastName![0]}` : "?"
      const apiType = toApiType(r.type)
      const apiStatus = toApiStatus(r.status)
      const sameDay = r.startDate === r.endDate
      return {
        id: r.id,
        employeeId: r.userId,
        employeeName: name,
        employeeInitials: initials,
        employeeRole: r.jobTitle ?? "—",
        employeeLocation: r.storeCity ?? r.storeName ?? "—",
        leaveBalance: 0,
        type: apiType,
        typeLabel: TYPE_LABELS[apiType],
        startDate: r.startDate,
        endDate: sameDay ? null : r.endDate,
        workingDays: countWorkingDays(r.startDate, r.endDate),
        note: r.notes ?? null,
        hasCertificate: false,
        coverNeeded: false,
        status: apiStatus,
        submittedAt: r.createdAt.toISOString(),
      }
    })

    return NextResponse.json({ requests: results, count: results.length, nextCursor })
  }
)
