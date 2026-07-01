import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { and, eq, gte, lte, isNull, inArray } from "drizzle-orm"
import { db } from "@prv/db"
import {
  projects,
  projectMilestones,
  shifts,
  leaveRequests,
  invoices,
  users,
  clients,
} from "@prv/db/schema"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type CalendarModule = "projects" | "shifts" | "finance" | "leave"

export interface CalendarEvent {
  id: string
  date: string // YYYY-MM-DD
  module: CalendarModule
  title: string
  subtitle: string
  time: string
}

const ISO = /^\d{4}-\d{2}-\d{2}$/
function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10)
}
function eur(n: number): string {
  return `€${Math.round(n).toLocaleString("en-US")}`
}
// Inclusive day range [from, to] as YYYY-MM-DD strings.
function daysBetween(from: string, to: string): string[] {
  const out: string[] = []
  let t = new Date(from + "T12:00:00Z").getTime()
  const end = new Date(to + "T12:00:00Z").getTime()
  let guard = 0
  while (t <= end && guard++ < 400) {
    out.push(new Date(t).toISOString().slice(0, 10))
    t += 86_400_000
  }
  return out
}

// GET /api/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD — the Universal Calendar:
// aggregates real events across modules (project deadlines + milestones, shift
// schedules, approved leave, invoice due dates), company-scoped.
export const GET = withGates(
  { action: "calendar.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const cid = ctx.session.companyId
    const now = new Date()
    const sp = req.nextUrl.searchParams
    const rawFrom = sp.get("from")
    const rawTo = sp.get("to")
    const from =
      rawFrom && ISO.test(rawFrom)
        ? rawFrom
        : isoDay(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)))
    const to =
      rawTo && ISO.test(rawTo)
        ? rawTo
        : isoDay(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)))

    const [projectRows, milestoneRows, shiftRows, invoiceRows, leaveRows] = await Promise.all([
      db
        .select({ id: projects.id, name: projects.name, dueDate: projects.dueDate })
        .from(projects)
        .where(
          and(
            eq(projects.companyId, cid),
            isNull(projects.deletedAt),
            gte(projects.dueDate, from),
            lte(projects.dueDate, to)
          )
        ),
      db
        .select({
          id: projectMilestones.id,
          title: projectMilestones.title,
          dueDate: projectMilestones.dueDate,
          projectName: projects.name,
        })
        .from(projectMilestones)
        .innerJoin(projects, eq(projectMilestones.projectId, projects.id))
        .where(
          and(
            eq(projects.companyId, cid),
            isNull(projects.deletedAt),
            gte(projectMilestones.dueDate, from),
            lte(projectMilestones.dueDate, to)
          )
        ),
      db
        .select({
          id: shifts.id,
          title: shifts.title,
          roleLabel: shifts.roleLabel,
          date: shifts.date,
          startTime: shifts.startTime,
          endTime: shifts.endTime,
        })
        .from(shifts)
        .where(
          and(
            eq(shifts.companyId, cid),
            isNull(shifts.deletedAt),
            gte(shifts.date, from),
            lte(shifts.date, to)
          )
        ),
      db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          total: invoices.total,
          status: invoices.status,
          dueDate: invoices.dueDate,
          clientName: clients.name,
        })
        .from(invoices)
        .leftJoin(clients, eq(invoices.clientId, clients.id))
        .where(
          and(
            eq(invoices.companyId, cid),
            isNull(invoices.deletedAt),
            inArray(invoices.status, ["draft", "sent", "overdue"]),
            gte(invoices.dueDate, from),
            lte(invoices.dueDate, to)
          )
        ),
      db
        .select({
          id: leaveRequests.id,
          type: leaveRequests.type,
          label: leaveRequests.label,
          startDate: leaveRequests.startDate,
          endDate: leaveRequests.endDate,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(leaveRequests)
        .innerJoin(users, eq(leaveRequests.userId, users.id))
        .where(
          and(
            eq(leaveRequests.companyId, cid),
            eq(leaveRequests.status, "approved"),
            isNull(leaveRequests.deletedAt),
            lte(leaveRequests.startDate, to),
            gte(leaveRequests.endDate, from)
          )
        ),
    ])

    const events: CalendarEvent[] = []

    for (const p of projectRows) {
      if (!p.dueDate) continue
      events.push({
        id: `project-${p.id}`,
        date: p.dueDate,
        module: "projects",
        title: `${p.name} — deadline`,
        subtitle: "Project due",
        time: "EOD",
      })
    }
    for (const m of milestoneRows) {
      if (!m.dueDate) continue
      events.push({
        id: `milestone-${m.id}`,
        date: m.dueDate,
        module: "projects",
        title: `${m.projectName} — ${m.title}`,
        subtitle: "Milestone due",
        time: "EOD",
      })
    }
    for (const s of shiftRows) {
      events.push({
        id: `shift-${s.id}`,
        date: s.date,
        module: "shifts",
        title: s.title || s.roleLabel || "Shift",
        subtitle: s.roleLabel ?? "Shift",
        time: `${s.startTime.slice(0, 5)}–${s.endTime.slice(0, 5)}`,
      })
    }
    for (const inv of invoiceRows) {
      events.push({
        id: `invoice-${inv.id}`,
        date: inv.dueDate,
        module: "finance",
        title: `Invoice ${inv.invoiceNumber} due — ${eur(Number(inv.total))}`,
        subtitle: inv.clientName ? `Client: ${inv.clientName}` : inv.status,
        time: "EOD",
      })
    }
    for (const l of leaveRows) {
      const span = daysBetween(
        l.startDate < from ? from : l.startDate,
        l.endDate > to ? to : l.endDate
      )
      const name = `${l.firstName} ${l.lastName}`.trim()
      for (const day of span) {
        events.push({
          id: `leave-${l.id}-${day}`,
          date: day,
          module: "leave",
          title: `${name} — ${l.label ?? `${l.type} leave`}`,
          subtitle: `${l.startDate}–${l.endDate}`,
          time: "All day",
        })
      }
    }

    events.sort((a, b) =>
      a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)
    )

    return NextResponse.json({ events, range: { from, to } })
  }
)
