import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import {
  renovationProjects,
  renovationPhases,
  renovationTasks,
  renovationEstimates,
  renovationContracts,
  renovationSiteReports,
  clients,
  users,
} from "@prv/db/schema"
import { and, desc, eq, isNull, asc } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withGates(
  { action: "renovation.projects.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId } = ctx.session

    const [projectRows, phaseRows, taskRows, estimateRows, contractRows, reportRows] =
      await Promise.all([
        db
          .select({
            id: renovationProjects.id,
            projectCode: renovationProjects.projectCode,
            title: renovationProjects.title,
            description: renovationProjects.description,
            status: renovationProjects.status,
            priority: renovationProjects.priority,
            projectType: renovationProjects.projectType,
            address: renovationProjects.address,
            city: renovationProjects.city,
            coordinates: renovationProjects.coordinates,
            estimatedStartDate: renovationProjects.estimatedStartDate,
            estimatedEndDate: renovationProjects.estimatedEndDate,
            actualStartDate: renovationProjects.actualStartDate,
            actualEndDate: renovationProjects.actualEndDate,
            estimatedValue: renovationProjects.estimatedValue,
            contractedValue: renovationProjects.contractedValue,
            currency: renovationProjects.currency,
            completionPercentage: renovationProjects.completionPercentage,
            tags: renovationProjects.tags,
            metadata: renovationProjects.metadata,
            clientId: renovationProjects.clientId,
            clientName: clients.name,
            clientEmail: clients.email,
            clientPhone: clients.phone,
            projectManagerId: renovationProjects.projectManagerId,
            managerFirstName: users.firstName,
            managerLastName: users.lastName,
            createdAt: renovationProjects.createdAt,
            updatedAt: renovationProjects.updatedAt,
          })
          .from(renovationProjects)
          .leftJoin(clients, eq(renovationProjects.clientId, clients.id))
          .leftJoin(users, eq(renovationProjects.projectManagerId, users.id))
          .where(
            and(
              eq(renovationProjects.id, id),
              eq(renovationProjects.companyId, companyId),
              isNull(renovationProjects.deletedAt)
            )
          )
          .limit(1),

        db
          .select({
            id: renovationPhases.id,
            phaseNumber: renovationPhases.phaseNumber,
            title: renovationPhases.title,
            status: renovationPhases.status,
            completionPercentage: renovationPhases.completionPercentage,
            plannedStartDate: renovationPhases.plannedStartDate,
            plannedEndDate: renovationPhases.plannedEndDate,
            estimatedCost: renovationPhases.estimatedCost,
          })
          .from(renovationPhases)
          .where(eq(renovationPhases.projectId, id))
          .orderBy(asc(renovationPhases.phaseNumber)),

        db
          .select({
            id: renovationTasks.id,
            title: renovationTasks.title,
            status: renovationTasks.status,
            priority: renovationTasks.priority,
            taskType: renovationTasks.taskType,
            dueDate: renovationTasks.dueDate,
            phaseId: renovationTasks.phaseId,
          })
          .from(renovationTasks)
          .where(and(eq(renovationTasks.projectId, id), isNull(renovationTasks.deletedAt)))
          .orderBy(desc(renovationTasks.createdAt))
          .limit(20),

        db
          .select({
            id: renovationEstimates.id,
            estimateNumber: renovationEstimates.estimateNumber,
            version: renovationEstimates.version,
            status: renovationEstimates.status,
            total: renovationEstimates.total,
            currency: renovationEstimates.currency,
          })
          .from(renovationEstimates)
          .where(and(eq(renovationEstimates.projectId, id), isNull(renovationEstimates.deletedAt)))
          .orderBy(desc(renovationEstimates.createdAt)),

        db
          .select({
            id: renovationContracts.id,
            contractNumber: renovationContracts.contractNumber,
            status: renovationContracts.status,
            contractValue: renovationContracts.contractValue,
            currency: renovationContracts.currency,
            startDate: renovationContracts.startDate,
            endDate: renovationContracts.endDate,
          })
          .from(renovationContracts)
          .where(and(eq(renovationContracts.projectId, id), isNull(renovationContracts.deletedAt)))
          .orderBy(desc(renovationContracts.createdAt)),

        db
          .select({
            id: renovationSiteReports.id,
            reportDate: renovationSiteReports.reportDate,
            reportType: renovationSiteReports.reportType,
            workersOnSite: renovationSiteReports.workersOnSite,
            completionDelta: renovationSiteReports.completionDelta,
          })
          .from(renovationSiteReports)
          .where(eq(renovationSiteReports.projectId, id))
          .orderBy(desc(renovationSiteReports.reportDate))
          .limit(5),
      ])

    const row = projectRows[0]
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const project = {
      id: row.id,
      projectCode: row.projectCode,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      projectType: row.projectType,
      address: row.address,
      city: row.city,
      coordinates: row.coordinates,
      estimatedStartDate: row.estimatedStartDate,
      estimatedEndDate: row.estimatedEndDate,
      actualStartDate: row.actualStartDate,
      actualEndDate: row.actualEndDate,
      estimatedValue: row.estimatedValue ? Number(row.estimatedValue) : null,
      contractedValue: row.contractedValue ? Number(row.contractedValue) : null,
      currency: row.currency,
      completionPercentage: row.completionPercentage,
      tags: row.tags,
      metadata: row.metadata,
      client: row.clientId
        ? {
            id: row.clientId,
            name: row.clientName ?? null,
            email: row.clientEmail ?? null,
            phone: row.clientPhone ?? null,
          }
        : null,
      projectManager: row.projectManagerId
        ? {
            id: row.projectManagerId,
            name:
              row.managerFirstName && row.managerLastName
                ? `${row.managerFirstName} ${row.managerLastName}`
                : null,
          }
        : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      phases: phaseRows.map((p) => ({
        ...p,
        estimatedCost: p.estimatedCost ? Number(p.estimatedCost) : null,
      })),
      recentTasks: taskRows,
      estimates: estimateRows.map((e) => ({
        ...e,
        total: Number(e.total),
      })),
      contracts: contractRows.map((c) => ({
        ...c,
        contractValue: Number(c.contractValue),
      })),
      recentSiteReports: reportRows,
    }

    return NextResponse.json({ project })
  }
)

const patchSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  projectCode: z.string().max(50).optional(),
  status: z
    .enum([
      "inquiry",
      "estimation",
      "contracted",
      "in_progress",
      "paused",
      "completed",
      "cancelled",
    ])
    .optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  projectType: z.enum(["residential", "commercial", "industrial", "public"]).optional(),
  clientId: z.string().uuid().nullable().optional(),
  projectManagerId: z.string().uuid().nullable().optional(),
  siteSupervisorId: z.string().uuid().nullable().optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  coordinates: z.record(z.unknown()).optional(),
  estimatedStartDate: z.string().optional(),
  estimatedEndDate: z.string().optional(),
  actualStartDate: z.string().optional(),
  actualEndDate: z.string().optional(),
  estimatedValue: z.number().nonnegative().optional(),
  contractedValue: z.number().nonnegative().optional(),
  completionPercentage: z.number().int().min(0).max(100).optional(),
  currency: z.string().length(3).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const PATCH = withGates(
  { action: "renovation.projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId } = ctx.session

    const [existing] = await db
      .select({ id: renovationProjects.id })
      .from(renovationProjects)
      .where(
        and(
          eq(renovationProjects.id, id),
          eq(renovationProjects.companyId, companyId),
          isNull(renovationProjects.deletedAt)
        )
      )
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const { estimatedValue, contractedValue, ...rest } = parsed.data
    const [updated] = await db
      .update(renovationProjects)
      .set({
        ...rest,
        ...(estimatedValue !== undefined ? { estimatedValue: String(estimatedValue) } : {}),
        ...(contractedValue !== undefined ? { contractedValue: String(contractedValue) } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(renovationProjects.id, id), eq(renovationProjects.companyId, companyId)))
      .returning({
        id: renovationProjects.id,
        title: renovationProjects.title,
        status: renovationProjects.status,
      })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "renovation.projects.update",
      entityType: "renovation_project",
      entityId: id,
      payload: parsed.data,
      method: "PATCH",
      path: `/api/renovation/projects/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)

export const DELETE = withGates(
  { action: "renovation.projects.delete", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId } = ctx.session

    const [existing] = await db
      .select({ id: renovationProjects.id, title: renovationProjects.title })
      .from(renovationProjects)
      .where(
        and(
          eq(renovationProjects.id, id),
          eq(renovationProjects.companyId, companyId),
          isNull(renovationProjects.deletedAt)
        )
      )
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db
      .update(renovationProjects)
      .set({ deletedAt: new Date(), updatedAt: new Date(), status: "cancelled" as const })
      .where(and(eq(renovationProjects.id, id), eq(renovationProjects.companyId, companyId)))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "renovation.projects.delete",
      entityType: "renovation_project",
      entityId: id,
      payload: { title: existing.title },
      method: "DELETE",
      path: `/api/renovation/projects/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
