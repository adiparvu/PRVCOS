import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { projects, projectMembers, projectMilestones, clients, users } from "@prv/db/schema"
import { and, asc, eq, isNull } from "drizzle-orm"
import type { ProjectSummary, ProjectStatus } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type ProjectPhaseState = "done" | "active" | "upcoming"
export type ProjectActivityType = "complete" | "warning" | "note" | "flag"

export interface ProjectPhase {
  id: string
  num: number
  name: string
  startDate: string
  endDate: string
  completionPct: number
  state: ProjectPhaseState
}

export interface ProjectMilestone {
  id: string
  text: string
  done: boolean
  dueDate: string
}

export interface ProjectActivity {
  id: string
  type: ProjectActivityType
  text: string
  timestamp: string
}

export interface ProjectDetail extends ProjectSummary {
  clientContactName: string
  clientPhone: string
  phases: ProjectPhase[]
  milestones: ProjectMilestone[]
  activities: ProjectActivity[]
}

const DB_STATUS_MAP: Record<string, ProjectStatus> = {
  draft: "planning",
  active: "active",
  on_hold: "hold",
  completed: "done",
  cancelled: "done",
  archived: "done",
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? "--").toUpperCase()
  return ((parts[0]?.[0] ?? "-") + (parts[parts.length - 1]?.[0] ?? "-")).toUpperCase()
}

function daysLeft(dueDate: string | null): number {
  if (!dueDate) return 0
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / 86_400_000)
}

export const GET = withGates(
  { action: "projects.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId } = ctx.session

    const [projectRows, memberRows, milestoneRows] = await Promise.all([
      db
        .select({
          id: projects.id,
          name: projects.name,
          status: projects.status,
          budget: projects.budget,
          startDate: projects.startDate,
          dueDate: projects.dueDate,
          metadata: projects.metadata,
          clientId: projects.clientId,
          clientName: clients.name,
          clientPhone: clients.phone,
        })
        .from(projects)
        .leftJoin(clients, eq(projects.clientId, clients.id))
        .where(
          and(eq(projects.id, id), eq(projects.companyId, companyId), isNull(projects.deletedAt))
        )
        .limit(1),

      db
        .select({
          userId: projectMembers.userId,
          role: projectMembers.role,
          firstName: users.firstName,
          lastName: users.lastName,
          jobTitle: users.jobTitle,
        })
        .from(projectMembers)
        .leftJoin(users, eq(projectMembers.userId, users.id))
        .where(eq(projectMembers.projectId, id)),

      db
        .select({
          id: projectMilestones.id,
          title: projectMilestones.title,
          dueDate: projectMilestones.dueDate,
          isComplete: projectMilestones.isComplete,
        })
        .from(projectMilestones)
        .where(eq(projectMilestones.projectId, id))
        .orderBy(asc(projectMilestones.sortOrder)),
    ])

    const row = projectRows[0]
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const meta = (row.metadata ?? {}) as Record<string, unknown>
    const completionPct = typeof meta.completionPct === "number" ? meta.completionPct : 0
    const currentPhaseName =
      typeof meta.currentPhaseName === "string"
        ? meta.currentPhaseName
        : (DB_STATUS_MAP[row.status] ?? "planning")
    const apiStatus = DB_STATUS_MAP[row.status] ?? "planning"
    const clientName = row.clientName ?? "—"

    const team = memberRows.map((m) => {
      const name = m.firstName ? `${m.firstName} ${m.lastName}` : "—"
      return {
        id: m.userId,
        initials: m.firstName ? initials(name) : "?",
        name,
        role: m.jobTitle ?? m.role,
      }
    })

    const milestones: ProjectMilestone[] = milestoneRows.map((m) => ({
      id: m.id,
      text: m.title,
      done: m.isComplete,
      dueDate: m.dueDate ?? "",
    }))

    const project: ProjectDetail = {
      id: row.id,
      name: row.name,
      clientId: row.clientId ?? "",
      clientName,
      clientInitials: initials(clientName),
      clientContactName: row.clientName ?? "—",
      clientPhone: row.clientPhone ?? "—",
      status: apiStatus,
      currentPhaseName,
      completionPct,
      budget: Number(row.budget ?? 0),
      spent: 0,
      startDate: row.startDate ?? "",
      endDate: row.dueDate ?? "",
      daysLeft: daysLeft(row.dueDate ?? null),
      team,
      phases: [],
      milestones,
      activities: [],
    }

    return NextResponse.json({ project })
  }
)
