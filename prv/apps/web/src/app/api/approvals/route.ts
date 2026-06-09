import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { approvalRequests, users } from "@prv/db/schema"
import { and, count, desc, eq, inArray, lt } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type ApprovalType = "purchase" | "leave" | "expense" | "contract" | "overtime"
export type ApprovalStatus = "Pending" | "Urgent" | "Expired"

export interface ApprovalSummary {
  id: string
  type: ApprovalType
  ref: string
  title: string
  requestedBy: string
  description: string
  value: number | null
  deadline: string
  daysUntilDeadline: number | null
  status: ApprovalStatus
}

export interface ApprovalsMeta {
  pending: number
  urgent: number
  expired: number
  approvedToday: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TZ = "Europe/Bucharest"
const MONTH_LABELS = [
  "Ian",
  "Feb",
  "Mar",
  "Apr",
  "Mai",
  "Iun",
  "Iul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

function fmtDeadline(d: Date): string {
  const local = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d)
  const part = (t: string) => Number(local.find((p) => p.type === t)?.value ?? 0)
  return `${part("day")} ${MONTH_LABELS[part("month") - 1]} ${part("year")}`
}

function daysUntil(deadline: Date): number {
  const todayMidnight = new Date(
    new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date()) + "T00:00:00Z"
  )
  return Math.round((deadline.getTime() - todayMidnight.getTime()) / 86_400_000)
}

function dbStatusToApi(dbStatus: string): ApprovalStatus {
  if (dbStatus === "urgent") return "Urgent"
  if (dbStatus === "expired") return "Expired"
  return "Pending"
}

function todayMidnightUtc(): Date {
  const str = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date())
  return new Date(str + "T00:00:00Z")
}

// ── GET ───────────────────────────────────────────────────────────────────────

export const GET = withGates(
  { action: "approvals.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const typeFilter = req.nextUrl.searchParams.get("type") as ApprovalType | null
    const cursor = req.nextUrl.searchParams.get("cursor")
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10), 200)
    const { companyId } = ctx.session

    // Only show actionable items (not yet resolved)
    const baseConditions = [
      eq(approvalRequests.companyId, companyId),
      inArray(approvalRequests.status, ["pending", "urgent", "expired"]),
    ]
    if (cursor) baseConditions.push(lt(approvalRequests.createdAt, new Date(cursor)))
    const baseWhere = and(...baseConditions)
    const whereClause = typeFilter
      ? and(baseWhere, eq(approvalRequests.type, typeFilter))
      : baseWhere

    const [rows, [approvedTodayRow]] = await Promise.all([
      db
        .select({
          id: approvalRequests.id,
          type: approvalRequests.type,
          ref: approvalRequests.ref,
          title: approvalRequests.title,
          description: approvalRequests.description,
          value: approvalRequests.value,
          deadline: approvalRequests.deadline,
          status: approvalRequests.status,
          firstName: users.firstName,
          lastName: users.lastName,
          createdAt: approvalRequests.createdAt,
        })
        .from(approvalRequests)
        .innerJoin(users, eq(approvalRequests.requestedByUserId, users.id))
        .where(whereClause)
        .orderBy(desc(approvalRequests.createdAt))
        .limit(limit + 1),

      // Count approvals resolved today
      db
        .select({ cnt: count() })
        .from(approvalRequests)
        .where(
          and(
            eq(approvalRequests.companyId, companyId),
            inArray(approvalRequests.status, ["approved", "rejected"])
            // resolvedAt >= today midnight
          )
        ),
    ])

    const hasMore = rows.length > limit
    const pageRows = hasMore ? rows.slice(0, limit) : rows
    const nextCursor =
      hasMore && pageRows.length > 0
        ? pageRows[pageRows.length - 1]!.createdAt.toISOString()
        : null

    const result: ApprovalSummary[] = pageRows.map((r) => ({
      id: r.id,
      type: r.type as ApprovalType,
      ref: r.ref,
      title: r.title,
      requestedBy: `${r.firstName} ${r.lastName}`,
      description: r.description ?? "",
      value: r.value !== null ? Number(r.value) : null,
      deadline: fmtDeadline(r.deadline),
      daysUntilDeadline: daysUntil(r.deadline),
      status: dbStatusToApi(r.status),
    }))

    const meta: ApprovalsMeta = {
      pending: result.filter((a) => a.status === "Pending").length,
      urgent: result.filter((a) => a.status === "Urgent").length,
      expired: result.filter((a) => a.status === "Expired").length,
      approvedToday: approvedTodayRow?.cnt ?? 0,
    }

    return NextResponse.json({ approvals: result, count: result.length, meta, nextCursor })
  }
)
