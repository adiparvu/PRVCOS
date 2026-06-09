import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { shifts, shiftAssignments, users, projects } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import type { ShiftSummary } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface TimelineEntry {
  id: string
  time: string
  label: string
  sub: string | null
  done: boolean
}

export interface ShiftDetail extends ShiftSummary {
  breakMinutes: number
  breakTime: string | null
  hourlyRate: number
  estimatedCost: number
  notes: string | null
  timeline: TimelineEntry[]
}

export const GET = withGates(
  { action: "schedule.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId } = ctx.session

    const [shiftRows, assignmentRows] = await Promise.all([
      db
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
          projectName: projects.name,
        })
        .from(shifts)
        .leftJoin(projects, eq(shifts.projectId, projects.id))
        .where(and(eq(shifts.id, id), eq(shifts.companyId, companyId), isNull(shifts.deletedAt)))
        .limit(1),

      db
        .select({
          userId: shiftAssignments.userId,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(shiftAssignments)
        .leftJoin(users, eq(shiftAssignments.userId, users.id))
        .where(eq(shiftAssignments.shiftId, id)),
    ])

    const row = shiftRows[0]
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const assignees = assignmentRows.map((a) => ({
      id: a.userId,
      initials: a.firstName ? `${a.firstName[0]}${a.lastName![0]}` : "?",
      name: a.firstName ? `${a.firstName} ${a.lastName}` : "—",
    }))

    const openSlots = Math.max(0, row.totalSlots - assignees.length)
    const durationHours = Number(row.durationHours)

    const timeline: TimelineEntry[] = [
      { id: "t1", time: row.startTime ?? "", label: "Început Tură", sub: null, done: false },
      {
        id: "t2",
        time: row.endTime ?? "",
        label: "Sfârșit Tură",
        sub: "Semnare pontaj necesară",
        done: false,
      },
    ]

    const shift: ShiftDetail = {
      id: row.id,
      role: row.role,
      roleLabel: row.roleLabel ?? row.role,
      title: row.title,
      location: row.location ?? "",
      site: row.location ?? row.projectName ?? "",
      date: row.date,
      dayLabel: row.date,
      startTime: row.startTime ?? "",
      endTime: row.endTime ?? "",
      durationHours,
      status: row.status,
      assignees,
      openSlots,
      project: row.projectName ?? null,
      breakMinutes: 30,
      breakTime: null,
      hourlyRate: 0,
      estimatedCost: 0,
      notes: null,
      timeline,
    }

    return NextResponse.json({ shift })
  }
)

// ─── PATCH /api/schedule/[id] ─────────────────────────────────────────────────

const patchShiftSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  location: z.string().max(255).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  durationHours: z.number().positive().optional(),
  status: z.enum(["confirmed", "open", "draft", "scheduled"]).optional(),
  totalSlots: z.number().int().positive().optional(),
  projectId: z.string().uuid().nullable().optional(),
})

export const PATCH = withGates(
  { action: "schedule.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const companyId = ctx.session.companyId

    const [existing] = await db
      .select({ id: shifts.id })
      .from(shifts)
      .where(and(eq(shifts.id, id), eq(shifts.companyId, companyId), isNull(shifts.deletedAt)))
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Shift not found" }, { status: 404 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchShiftSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const { durationHours, ...shiftFields } = parsed.data
    const [updated] = await db
      .update(shifts)
      .set({
        ...shiftFields,
        ...(durationHours !== undefined ? { durationHours: String(durationHours) } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(shifts.id, id), eq(shifts.companyId, companyId), isNull(shifts.deletedAt)))
      .returning({ id: shifts.id })

    void writeAuditLog({
      companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "schedule.update",
      entityType: "shift",
      entityId: id,
      payload: parsed.data,
      method: "PATCH",
      path: `/api/schedule/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)

// ─── DELETE /api/schedule/[id] ────────────────────────────────────────────────
// Soft-delete: sets deletedAt=now (shifts has no isActive column).

export const DELETE = withGates(
  { action: "schedule.delete", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const companyId = ctx.session.companyId

    const [existing] = await db
      .select({ id: shifts.id })
      .from(shifts)
      .where(and(eq(shifts.id, id), eq(shifts.companyId, companyId), isNull(shifts.deletedAt)))
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Shift not found" }, { status: 404 })

    await db
      .update(shifts)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(shifts.id, id), eq(shifts.companyId, companyId), isNull(shifts.deletedAt)))

    void writeAuditLog({
      companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "schedule.delete",
      entityType: "shift",
      entityId: id,
      payload: {},
      method: "DELETE",
      path: `/api/schedule/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
