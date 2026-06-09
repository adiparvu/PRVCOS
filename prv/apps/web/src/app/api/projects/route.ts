import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import {
  projects,
  projectMembers,
  projectMilestones,
  clients,
  users,
  invoices,
} from "@prv/db/schema"
import { and, asc, desc, eq, inArray, isNull, isNotNull, sum } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type ProjectStatus = "active" | "planning" | "review" | "done" | "hold"

export interface ProjectTeamMember {
  id: string
  initials: string
  name: string
  role: string
}

export interface ProjectSummary {
  id: string
  name: string
  clientId: string
  clientName: string
  clientInitials: string
  status: ProjectStatus
  currentPhaseName: string
  completionPct: number
  budget: number
  spent: number
  startDate: string
  endDate: string
  daysLeft: number
  team: ProjectTeamMember[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DB_STATUS_TO_API: Record<string, ProjectStatus> = {
  draft: "planning",
  active: "active",
  on_hold: "hold",
  completed: "done",
  cancelled: "done",
  archived: "done",
}

const API_STATUS_TO_DB: Record<string, string[]> = {
  active: ["active"],
  planning: ["draft"],
  hold: ["on_hold"],
  done: ["completed", "cancelled", "archived"],
  review: ["active"],
}

function toApiStatus(dbStatus: string): ProjectStatus {
  return DB_STATUS_TO_API[dbStatus] ?? "planning"
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? "--").toUpperCase()
  return ((parts[0]?.[0] ?? "-") + (parts[parts.length - 1]?.[0] ?? "-")).toUpperCase()
}

function daysLeftFromDue(dueDate: string | null): number {
  if (!dueDate) return 0
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / 86_400_000)
}

function capitalizeRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1)
}

// ── GET ───────────────────────────────────────────────────────────────────────

export const GET = withGates(
  { action: "projects.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get("status")

    // Build optional DB status filter
    const dbStatuses = statusFilter ? (API_STATUS_TO_DB[statusFilter] ?? []) : []
    const statusClause =
      dbStatuses.length > 0
        ? inArray(projects.status, dbStatuses as (typeof projects.status._.data)[])
        : undefined

    // 1. Fetch projects with client name
    const projectRows = await db
      .select({
        id: projects.id,
        name: projects.name,
        clientId: projects.clientId,
        status: projects.status,
        budget: projects.budget,
        startDate: projects.startDate,
        dueDate: projects.dueDate,
        clientName: clients.name,
      })
      .from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(
        and(eq(projects.companyId, ctx.session.companyId), isNull(projects.deletedAt), statusClause)
      )
      .orderBy(desc(projects.createdAt))

    if (projectRows.length === 0) {
      return NextResponse.json({ projects: [], count: 0 })
    }

    const projectIds = projectRows.map((p) => p.id)

    // 2. Fetch milestones, members, and invoice sums in parallel
    const [milestoneRows, memberRows, invoiceAgg] = await Promise.all([
      db
        .select({
          projectId: projectMilestones.projectId,
          title: projectMilestones.title,
          isComplete: projectMilestones.isComplete,
          sortOrder: projectMilestones.sortOrder,
        })
        .from(projectMilestones)
        .where(inArray(projectMilestones.projectId, projectIds))
        .orderBy(asc(projectMilestones.sortOrder)),

      db
        .select({
          projectId: projectMembers.projectId,
          userId: projectMembers.userId,
          role: projectMembers.role,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(projectMembers)
        .innerJoin(users, eq(projectMembers.userId, users.id))
        .where(inArray(projectMembers.projectId, projectIds)),

      db
        .select({ projectId: invoices.projectId, total: sum(invoices.total) })
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, ctx.session.companyId),
            eq(invoices.status, "paid"),
            isNotNull(invoices.projectId),
            inArray(invoices.projectId, projectIds),
            isNull(invoices.deletedAt)
          )
        )
        .groupBy(invoices.projectId),
    ])

    // 3. Index by projectId for O(1) lookup
    const milestonesByProject = new Map<string, typeof milestoneRows>()
    for (const m of milestoneRows) {
      const arr = milestonesByProject.get(m.projectId) ?? []
      arr.push(m)
      milestonesByProject.set(m.projectId, arr)
    }

    const membersByProject = new Map<string, typeof memberRows>()
    for (const m of memberRows) {
      const arr = membersByProject.get(m.projectId) ?? []
      arr.push(m)
      membersByProject.set(m.projectId, arr)
    }

    const spentByProject = new Map<string, number>()
    for (const row of invoiceAgg) {
      if (row.projectId) spentByProject.set(row.projectId, Number(row.total ?? 0))
    }

    // 4. Assemble response
    const result: ProjectSummary[] = projectRows.map((p) => {
      const milestones = milestonesByProject.get(p.id) ?? []
      const completed = milestones.filter((m) => m.isComplete)
      const completionPct =
        milestones.length > 0 ? Math.round((completed.length / milestones.length) * 100) : 0
      const nextMilestone = milestones.find((m) => !m.isComplete)
      const currentPhaseName =
        milestones.length === 0 ? "—" : nextMilestone ? nextMilestone.title : "Complete"

      const members = membersByProject.get(p.id) ?? []
      const team: ProjectTeamMember[] = members.map((m) => ({
        id: m.userId,
        name: `${m.firstName} ${m.lastName}`,
        initials: ((m.firstName[0] ?? "") + (m.lastName[0] ?? "")).toUpperCase(),
        role: capitalizeRole(m.role),
      }))

      const clientName = p.clientName ?? "—"

      return {
        id: p.id,
        name: p.name,
        clientId: p.clientId ?? "",
        clientName,
        clientInitials: initials(clientName),
        status: toApiStatus(p.status),
        currentPhaseName,
        completionPct,
        budget: Number(p.budget ?? 0),
        spent: spentByProject.get(p.id) ?? 0,
        startDate: p.startDate ?? "",
        endDate: p.dueDate ?? "",
        daysLeft: daysLeftFromDue(p.dueDate),
        team,
      }
    })

    return NextResponse.json({ projects: result, count: result.length })
  }
)
