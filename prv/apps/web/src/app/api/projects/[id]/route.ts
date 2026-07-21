import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import {
  projects,
  projectMembers,
  projectMilestones,
  clients,
  users,
  invoices,
  auditLogs,
} from "@prv/db/schema"
import { and, asc, desc, eq, isNull, notInArray, sum } from "drizzle-orm"
import { z } from "zod"
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

function auditToProjectActivity(log: {
  id: string
  action: string
  createdAt: Date
}): ProjectActivity {
  const type: ProjectActivityType = log.action.includes("delete")
    ? "warning"
    : log.action.includes("milestone") || log.action.includes("complete")
      ? "complete"
      : "note"
  const text = (() => {
    if (log.action === "projects.create") return "Project created"
    if (log.action === "projects.update") return "Project updated"
    if (log.action === "projects.delete") return "Project deleted"
    if (log.action.includes("milestone")) return "Milestone updated"
    if (log.action.includes("member")) return "Team updated"
    return log.action
  })()
  return { id: log.id, type, text, timestamp: log.createdAt.toISOString() }
}

export const GET = withGates(
  { action: "projects.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId } = ctx.session

    const [projectRows, memberRows, milestoneRows, spentRow, activityRows] = await Promise.all([
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

      db
        .select({ total: sum(invoices.total) })
        .from(invoices)
        .where(
          and(
            eq(invoices.projectId, id),
            eq(invoices.companyId, companyId),
            isNull(invoices.deletedAt),
            notInArray(invoices.status, ["cancelled", "refunded"])
          )
        ),

      db
        .select({ id: auditLogs.id, action: auditLogs.action, createdAt: auditLogs.createdAt })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.companyId, companyId),
            eq(auditLogs.entityId, id),
            eq(auditLogs.entityType, "project")
          )
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(10),
    ])

    const row = projectRows[0]
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const spent = Number(spentRow[0]?.total ?? 0)
    const activities: ProjectActivity[] = activityRows.map(auditToProjectActivity)

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
      spent,
      startDate: row.startDate ?? "",
      endDate: row.dueDate ?? "",
      daysLeft: daysLeft(row.dueDate ?? null),
      team,
      phases: [],
      milestones,
      activities,
    }

    return NextResponse.json({ project })
  }
)

// ─── PATCH /api/projects/[id] ─────────────────────────────────────────────────

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const patchProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(["draft", "active", "on_hold", "completed", "cancelled", "archived"]).optional(),
  type: z.enum(["renovation", "installation", "maintenance", "consultation", "other"]).optional(),
  priority: z.enum(["critical", "high", "medium", "low"]).optional(),
  budget: z.number().nonnegative().optional(),
  approvedBudget: z.number().nonnegative().optional(),
  spentBudget: z.number().nonnegative().optional(),
  clientId: z.string().uuid().nullable().optional(),
  storeId: z.string().uuid().nullable().optional(),
  ownerId: z.string().uuid().nullable().optional(),
  projectManagerId: z.string().uuid().nullable().optional(),
  projectDirectorId: z.string().uuid().nullable().optional(),
  startDate: z.string().regex(ISO_DATE).nullable().optional(),
  dueDate: z.string().regex(ISO_DATE).nullable().optional(),
  actualStartDate: z.string().regex(ISO_DATE).nullable().optional(),
  actualEndDate: z.string().regex(ISO_DATE).nullable().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const PATCH = withGates(
  { action: "projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId } = ctx.session

    const [existing] = await db
      .select({ id: projects.id, name: projects.name, status: projects.status })
      .from(projects)
      .where(
        and(eq(projects.id, id), eq(projects.companyId, companyId), isNull(projects.deletedAt))
      )
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchProjectSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const { budget, approvedBudget, spentBudget, ...projectFields } = parsed.data
    // Lifecycle stamp (parity with the mobile + phase routes): stamp completedAt
    // when a project enters "completed", and clear it when it leaves — otherwise
    // a project completed via this generic PATCH keeps completedAt = null.
    const completedAtPatch =
      parsed.data.status === "completed"
        ? { completedAt: new Date() }
        : parsed.data.status !== undefined && existing.status === "completed"
          ? { completedAt: null }
          : {}
    const [updated] = await db
      .update(projects)
      .set({
        ...projectFields,
        ...completedAtPatch,
        ...(budget !== undefined ? { budget: String(budget) } : {}),
        ...(approvedBudget !== undefined ? { approvedBudget: String(approvedBudget) } : {}),
        ...(spentBudget !== undefined ? { spentBudget: String(spentBudget) } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, id), eq(projects.companyId, companyId)))
      .returning({ id: projects.id, name: projects.name, status: projects.status })

    void writeAuditLog({
      companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "projects.update",
      entityType: "project",
      entityId: id,
      payload: parsed.data,
      method: "PATCH",
      path: `/api/projects/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)

// ─── DELETE /api/projects/[id] ────────────────────────────────────────────────
// Soft-delete: sets isActive=false, deletedAt=now, status="cancelled".

export const DELETE = withGates(
  { action: "projects.delete", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId } = ctx.session

    const [existing] = await db
      .select({ id: projects.id, name: projects.name, status: projects.status })
      .from(projects)
      .where(
        and(eq(projects.id, id), eq(projects.companyId, companyId), isNull(projects.deletedAt))
      )
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db
      .update(projects)
      .set({
        isActive: false,
        deletedAt: new Date(),
        status: "cancelled" as const,
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, id), eq(projects.companyId, companyId)))

    void writeAuditLog({
      companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "projects.delete",
      entityType: "project",
      entityId: id,
      payload: { name: existing.name },
      method: "DELETE",
      path: `/api/projects/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
