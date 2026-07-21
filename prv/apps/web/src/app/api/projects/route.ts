import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import {
  projects,
  projectMembers,
  projectMilestones,
  clients,
  users,
  invoices,
} from "@prv/db/schema"
import { and, asc, desc, eq, inArray, isNull, isNotNull, lt, sum } from "drizzle-orm"
import { upsertDocument } from "@prv/search"

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
    const cursor = searchParams.get("cursor")
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200)

    // Build optional DB status filter
    const dbStatuses = statusFilter ? (API_STATUS_TO_DB[statusFilter] ?? []) : []
    const statusClause =
      dbStatuses.length > 0
        ? inArray(projects.status, dbStatuses as (typeof projects.status._.data)[])
        : undefined

    const projectConditions = [
      eq(projects.companyId, ctx.session.companyId),
      isNull(projects.deletedAt),
    ]
    if (statusClause) projectConditions.push(statusClause)
    if (cursor) projectConditions.push(lt(projects.createdAt, new Date(cursor)))

    // 1. Fetch projects with client name
    const rawProjectRows = await db
      .select({
        id: projects.id,
        name: projects.name,
        clientId: projects.clientId,
        status: projects.status,
        budget: projects.budget,
        startDate: projects.startDate,
        dueDate: projects.dueDate,
        clientName: clients.name,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(and(...projectConditions))
      .orderBy(desc(projects.createdAt))
      .limit(limit + 1)

    const hasMore = rawProjectRows.length > limit
    const projectRows = hasMore ? rawProjectRows.slice(0, limit) : rawProjectRows
    const nextCursor =
      hasMore && projectRows.length > 0
        ? projectRows[projectRows.length - 1]!.createdAt.toISOString()
        : null

    if (projectRows.length === 0) {
      return NextResponse.json({ projects: [], count: 0, nextCursor: null })
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

    return NextResponse.json({ projects: result, count: result.length, nextCursor })
  }
)

// ─── POST /api/projects ──────────────────────────────────────────────────────

const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(["draft", "active", "on_hold", "completed", "cancelled"]).optional(),
  budget: z.number().nonnegative().optional(),
  clientId: z.string().uuid().nullable().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
})

export const POST = withGates(
  { action: "projects.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = createProjectSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    // Date-order integrity: the project window cannot end before it starts.
    // Fires only when both dates are supplied and parse validly.
    if (
      parsed.data.startDate &&
      parsed.data.dueDate &&
      new Date(parsed.data.startDate) > new Date(parsed.data.dueDate)
    )
      return NextResponse.json({ error: "startDate must be on or before dueDate" }, { status: 422 })

    const [record] = await db
      .insert(projects)
      .values({
        companyId,
        ...parsed.data,
        budget: parsed.data.budget !== undefined ? String(parsed.data.budget) : undefined,
      })
      .returning({ id: projects.id, name: projects.name })

    if (!record) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "projects.create",
      entityType: "project",
      entityId: record.id,
      payload: parsed.data,
      method: "POST",
      path: "/api/projects",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    void upsertDocument("projects", {
      id: record.id,
      company_id: companyId,
      title: record.name,
      status: parsed.data.status ?? "draft",
      created_at: Math.floor(Date.now() / 1000),
    })

    return NextResponse.json({ id: record.id, name: record.name }, { status: 201 })
  }
)
