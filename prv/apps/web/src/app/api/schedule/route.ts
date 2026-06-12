import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { shifts, shiftAssignments, users, stores, projects } from "@prv/db/schema"
import { and, asc, eq, gt, gte, inArray, isNull, lte } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const LIMIT = 50

export type ShiftStatus = "confirmed" | "open" | "draft" | "scheduled"
export type ShiftRole = "foreman" | "bricklayer" | "electrician" | "finisher" | "welder" | "general"

export interface ShiftAssignee {
  id: string
  initials: string
  name: string
}

export interface ShiftSummary {
  id: string
  role: ShiftRole
  roleLabel: string
  title: string
  location: string
  site: string
  date: string
  dayLabel: string
  startTime: string
  endTime: string
  durationHours: number
  status: ShiftStatus
  assignees: ShiftAssignee[]
  openSlots: number
  project: string | null
}

export interface ShiftsMeta {
  total: number
  open: number
  coveragePct: number
  totalHours: number
  weekLabel: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TZ = "Europe/Bucharest"
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

const ROLE_LABELS: Record<ShiftRole, string> = {
  foreman: "Construction Foreman",
  bricklayer: "Bricklayer",
  electrician: "Electrician",
  finisher: "Finishing Crew",
  welder: "Welder",
  general: "General Worker",
}

function todayStr(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date())
}

function weekBounds(anchorDate: string): { monday: string; sunday: string; weekLabel: string } {
  const d = new Date(anchorDate + "T12:00:00Z")
  const dow = d.getUTCDay()
  const diffToMonday = (dow + 6) % 7
  const monday = new Date(d)
  monday.setUTCDate(d.getUTCDate() - diffToMonday)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)

  const fmt = (dt: Date) => `${dt.getUTCDate()} ${MONTH_LABELS[dt.getUTCMonth()]}`
  const weekLabel = `${fmt(monday)}–${fmt(sunday)}`

  const toStr = (dt: Date) => dt.toISOString().slice(0, 10)
  return { monday: toStr(monday), sunday: toStr(sunday), weekLabel }
}

function fmtDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z")
  return `${DAY_NAMES[d.getUTCDay()]} ${d.getUTCDate()} ${MONTH_LABELS[d.getUTCMonth()]}`
}

// ── GET ───────────────────────────────────────────────────────────────────────

export const GET = withGates(
  { action: "schedule.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = req.nextUrl
    const statusFilter = searchParams.get("status") as ShiftStatus | null
    const cursor = searchParams.get("cursor")
    const anchor = searchParams.get("week") ?? todayStr()
    const { monday, sunday, weekLabel } = weekBounds(anchor)

    // 1. Fetch shifts for the week
    const shiftRows = await db
      .select({
        id: shifts.id,
        role: shifts.role,
        roleLabel: shifts.roleLabel,
        title: shifts.title,
        location: shifts.location,
        date: shifts.date,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        durationHours: shifts.durationHours,
        status: shifts.status,
        totalSlots: shifts.totalSlots,
        storeName: stores.name,
        storeCity: stores.city,
        projectName: projects.name,
      })
      .from(shifts)
      .leftJoin(stores, eq(shifts.storeId, stores.id))
      .leftJoin(projects, eq(shifts.projectId, projects.id))
      .where(
        and(
          eq(shifts.companyId, ctx.session.companyId),
          isNull(shifts.deletedAt),
          gte(shifts.date, monday),
          lte(shifts.date, sunday),
          cursor ? gt(shifts.id, cursor) : undefined
        )
      )
      .orderBy(asc(shifts.date), asc(shifts.startTime))
      .limit(LIMIT + 1)

    if (shiftRows.length === 0) {
      const meta: ShiftsMeta = { total: 0, open: 0, coveragePct: 100, totalHours: 0, weekLabel }
      return NextResponse.json({ shifts: [], count: 0, meta })
    }

    const hasMore = shiftRows.length > LIMIT
    const pageRows = hasMore ? shiftRows.slice(0, LIMIT) : shiftRows
    const nextCursor = hasMore ? (pageRows[pageRows.length - 1]?.id ?? null) : null

    const shiftIds = pageRows.map((s) => s.id)

    // 2. Fetch assignees for all shifts in one query
    const assigneeRows = await db
      .select({
        shiftId: shiftAssignments.shiftId,
        userId: shiftAssignments.userId,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(shiftAssignments)
      .innerJoin(users, eq(shiftAssignments.userId, users.id))
      .where(inArray(shiftAssignments.shiftId, shiftIds))

    // 3. Index assignees by shiftId
    const assigneesByShift = new Map<string, ShiftAssignee[]>()
    for (const a of assigneeRows) {
      const list = assigneesByShift.get(a.shiftId) ?? []
      list.push({
        id: a.userId,
        initials: ((a.firstName[0] ?? "") + (a.lastName[0] ?? "")).toUpperCase(),
        name: `${a.firstName} ${a.lastName}`,
      })
      assigneesByShift.set(a.shiftId, list)
    }

    // 4. Assemble shifts
    const all: ShiftSummary[] = pageRows.map((s) => {
      const assignees = assigneesByShift.get(s.id) ?? []
      const openSlots = Math.max(0, s.totalSlots - assignees.length)
      const role = s.role as ShiftRole
      const site = s.storeCity ?? s.storeName ?? s.location ?? "—"
      return {
        id: s.id,
        role,
        roleLabel: s.roleLabel ?? ROLE_LABELS[role] ?? role,
        title: s.title,
        location: s.location ?? site,
        site,
        date: s.date,
        dayLabel: fmtDayLabel(s.date),
        startTime: s.startTime,
        endTime: s.endTime,
        durationHours: Number(s.durationHours),
        status: s.status as ShiftStatus,
        assignees,
        openSlots,
        project: s.projectName ?? null,
      }
    })

    const filtered = statusFilter ? all.filter((s) => s.status === statusFilter) : all

    const openCount = all.filter((s) => s.status === "open").length
    const coveredCount = all.filter((s) => s.openSlots === 0).length
    const coveragePct = all.length > 0 ? Math.round((coveredCount / all.length) * 100) : 100
    const totalHours = all.reduce((sum, s) => sum + s.durationHours * s.assignees.length, 0)

    const meta: ShiftsMeta = {
      total: all.length,
      open: openCount,
      coveragePct,
      totalHours,
      weekLabel,
    }

    return NextResponse.json({ shifts: filtered, count: filtered.length, meta, nextCursor })
  }
)

// ─── POST /api/schedule ──────────────────────────────────────────────────────

const createShiftSchema = z.object({
  title: z.string().min(1).max(255),
  date: z.string().min(1),
  startTime: z.string().min(4).max(5),
  endTime: z.string().min(4).max(5),
  role: z
    .enum(["foreman", "bricklayer", "electrician", "finisher", "welder", "general"])
    .optional(),
  roleLabel: z.string().max(100).optional(),
  location: z.string().max(255).optional(),
  totalSlots: z.number().int().min(1).optional(),
  projectId: z.string().uuid().nullable().optional(),
})

function calcShiftHours(start: string, end: string): number {
  const [sh = 0, sm = 0] = start.split(":").map(Number)
  const [eh = 0, em = 0] = end.split(":").map(Number)
  return Math.round(((eh * 60 + em - (sh * 60 + sm)) / 60) * 10) / 10
}

export const POST = withGates(
  { action: "schedule.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = createShiftSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const [record] = await db
      .insert(shifts)
      .values({
        companyId,
        ...parsed.data,
        durationHours: String(calcShiftHours(parsed.data.startTime, parsed.data.endTime)),
      })
      .returning({ id: shifts.id, title: shifts.title })

    if (!record) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "schedule.create",
      entityType: "shift",
      entityId: record.id,
      payload: parsed.data,
      method: "POST",
      path: "/api/schedule",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record.id, title: record.title }, { status: 201 })
  }
)
