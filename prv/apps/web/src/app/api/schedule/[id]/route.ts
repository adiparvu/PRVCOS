import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { shifts, shiftAssignments, users, projects } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
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
