import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import {
  projects,
  projectMembers,
  projectMilestones,
  invoices,
  notifications,
} from "@prv/db/schema"
import { clients } from "@prv/db/schema"
import { users } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import { eq, and, isNull, count, sum, sql, desc, inArray } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function formatCurrency(amount: number, currency = "EUR"): string {
  const symbol = currency === "RON" ? "RON " : "€"
  if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `${symbol}${Math.round(amount / 1_000)}k`
  return `${symbol}${Math.round(amount)}`
}

export const GET = withMobileAuth(async (req: NextRequest, ctx) => {
  const projectId = req.nextUrl.pathname.split("/").pop() ?? ""
  if (!projectId) {
    return NextResponse.json({ error: "Missing project ID" }, { status: 400 })
  }

  const [projectRow] = await db
    .select({
      id: projects.id,
      name: projects.name,
      code: projects.code,
      status: projects.status,
      description: projects.description,
      budget: projects.budget,
      currency: projects.currency,
      startDate: projects.startDate,
      dueDate: projects.dueDate,
      completedAt: projects.completedAt,
      isActive: projects.isActive,
      clientId: projects.clientId,
    })
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.companyId, ctx.companyId),
        isNull(projects.deletedAt)
      )
    )
    .limit(1)

  if (!projectRow) {
    return NextResponse.json({ error: "Project not found", code: "NOT_FOUND" }, { status: 404 })
  }

  const now = new Date()

  const [clientRow, milestoneRows, memberRows, milestoneCountRow, invoiceRows, activityRows] =
    await Promise.all([
      // Client name
      projectRow.clientId
        ? db
            .select({ name: clients.name })
            .from(clients)
            .where(eq(clients.id, projectRow.clientId))
            .limit(1)
        : Promise.resolve([]),

      // All milestones ordered by sortOrder
      db
        .select({
          id: projectMilestones.id,
          title: projectMilestones.title,
          dueDate: projectMilestones.dueDate,
          isComplete: projectMilestones.isComplete,
          completedAt: projectMilestones.completedAt,
          sortOrder: projectMilestones.sortOrder,
        })
        .from(projectMilestones)
        .where(eq(projectMilestones.projectId, projectId))
        .orderBy(projectMilestones.sortOrder, projectMilestones.dueDate),

      // Team members
      db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          role: projectMembers.role,
          jobTitle: users.jobTitle,
          avatarUrl: users.avatarUrl,
        })
        .from(projectMembers)
        .innerJoin(users, eq(projectMembers.userId, users.id))
        .where(eq(projectMembers.projectId, projectId))
        .orderBy(projectMembers.role),

      // Milestone counts for KPIs
      db
        .select({
          total: count(),
          completed: sql<number>`COUNT(*) FILTER (WHERE ${projectMilestones.isComplete} = true)`,
        })
        .from(projectMilestones)
        .where(eq(projectMilestones.projectId, projectId)),

      // Invoices for this project
      db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          status: invoices.status,
          total: invoices.total,
          issueDate: invoices.issueDate,
          dueDate: invoices.dueDate,
          paidAt: invoices.paidAt,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.projectId, projectId),
            eq(invoices.companyId, ctx.companyId),
            isNull(invoices.deletedAt)
          )
        )
        .orderBy(desc(invoices.issueDate))
        .limit(10),

      // Recent activity (notifications linked to this project)
      db
        .select({
          id: notifications.id,
          title: notifications.title,
          body: notifications.body,
          type: notifications.type,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .where(
          and(
            eq(notifications.companyId, ctx.companyId),
            eq(notifications.entityType, "project"),
            eq(notifications.entityId, projectId)
          )
        )
        .orderBy(desc(notifications.createdAt))
        .limit(10),
    ])

  // KPI calculations
  const totalMilestones = milestoneCountRow[0]?.total ?? 0
  const completedMilestones = Number(milestoneCountRow[0]?.completed ?? 0)
  const openMilestones = totalMilestones - completedMilestones
  const overdueMilestones = milestoneRows.filter(
    (m) => !m.isComplete && m.dueDate && new Date(m.dueDate) < now
  ).length

  const progress =
    totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0

  const totalInvoiced = invoiceRows
    .filter((i) => i.status !== "draft" && i.status !== "cancelled")
    .reduce((acc, i) => acc + Number(i.total ?? 0), 0)

  const totalPaid = invoiceRows
    .filter((i) => i.status === "paid")
    .reduce((acc, i) => acc + Number(i.total ?? 0), 0)

  const budget = Number(projectRow.budget ?? 0)

  return NextResponse.json({
    project: {
      id: projectRow.id,
      name: projectRow.name,
      code: projectRow.code ?? null,
      status: projectRow.status,
      description: projectRow.description ?? null,
      clientName: clientRow[0]?.name ?? null,
      budget: budget > 0 ? formatCurrency(budget, projectRow.currency) : null,
      budgetRaw: budget,
      currency: projectRow.currency,
      startDate: projectRow.startDate ?? null,
      dueDate: projectRow.dueDate ?? null,
      completedAt: projectRow.completedAt ?? null,
      isActive: projectRow.isActive,
    },
    kpis: {
      progress,
      totalMilestones,
      completedMilestones,
      openMilestones,
      overdueMilestones,
      totalInvoiced: totalInvoiced > 0 ? formatCurrency(totalInvoiced, projectRow.currency) : "€0",
      totalPaid: totalPaid > 0 ? formatCurrency(totalPaid, projectRow.currency) : "€0",
      remaining:
        budget > 0
          ? formatCurrency(Math.max(0, budget - totalInvoiced), projectRow.currency)
          : null,
      teamCount: memberRows.length,
    },
    milestones: milestoneRows.map((m) => ({
      id: m.id,
      title: m.title,
      dueDate: m.dueDate ?? null,
      isComplete: m.isComplete,
      isOverdue: !m.isComplete && !!m.dueDate && new Date(m.dueDate) < now,
      sortOrder: m.sortOrder,
    })),
    team: memberRows.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      role: u.role,
      jobTitle: u.jobTitle ?? null,
      avatarUrl: u.avatarUrl ?? null,
    })),
    activity: activityRows.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body ?? null,
      type: n.type,
      createdAt: n.createdAt,
    })),
    invoices: invoiceRows.map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      status: i.status,
      total: formatCurrency(Number(i.total ?? 0), projectRow.currency),
      issueDate: i.issueDate,
      dueDate: i.dueDate,
      paidAt: i.paidAt ?? null,
    })),
  })
})

const patchProjectSchema = z.object({
  status: z.enum(["draft", "active", "on_hold", "completed", "cancelled"]),
})

export const PATCH = withMobileAuth(async (req: NextRequest, ctx) => {
  const ipAddress =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"

  const projectId = req.nextUrl.pathname.split("/").pop() ?? ""
  if (!projectId) {
    return NextResponse.json({ error: "Missing project ID" }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = patchProjectSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { status } = parsed.data

  const [existing] = await db
    .select({ id: projects.id, status: projects.status })
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.companyId, ctx.companyId),
        isNull(projects.deletedAt)
      )
    )
    .limit(1)

  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const updateValues: Record<string, unknown> = { status }
  if (status === "completed") {
    updateValues.completedAt = new Date()
  } else if (existing.status === "completed") {
    updateValues.completedAt = null
  }

  const [updated] = await db
    .update(projects)
    .set(updateValues)
    .where(eq(projects.id, projectId))
    .returning({ id: projects.id, status: projects.status })

  if (!updated) {
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 })
  }

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "mobile.project.status_update",
    entityType: "project",
    entityId: projectId,
    method: "PATCH",
    path: `/api/mobile/projects/${projectId}`,
    ipAddress,
    userAgent: req.headers.get("user-agent") ?? "",
    payload: { from: existing.status, to: status },
  })

  return NextResponse.json({ id: updated.id, status: updated.status })
})
