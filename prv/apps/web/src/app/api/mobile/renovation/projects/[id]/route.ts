import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import type { MobileContext } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import {
  renovationProjects,
  renovationPhases,
  renovationTasks,
  renovationSiteReports,
  clients,
  users,
} from "@prv/db/schema"
import { and, asc, desc, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function projectId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-2) ?? ""
}

export const GET = withMobileAuth(async (req: NextRequest, ctx: MobileContext) => {
  const pid = projectId(req)

  const [project] = await db
    .select({
      id: renovationProjects.id,
      projectCode: renovationProjects.projectCode,
      title: renovationProjects.title,
      description: renovationProjects.description,
      status: renovationProjects.status,
      priority: renovationProjects.priority,
      projectType: renovationProjects.projectType,
      estimatedValue: renovationProjects.estimatedValue,
      contractedValue: renovationProjects.contractedValue,
      currency: renovationProjects.currency,
      completionPercentage: renovationProjects.completionPercentage,
      estimatedStartDate: renovationProjects.estimatedStartDate,
      estimatedEndDate: renovationProjects.estimatedEndDate,
      actualStartDate: renovationProjects.actualStartDate,
      actualEndDate: renovationProjects.actualEndDate,
      city: renovationProjects.city,
      address: renovationProjects.address,
      clientName: clients.name,
      managerFirstName: users.firstName,
      managerLastName: users.lastName,
      createdAt: renovationProjects.createdAt,
    })
    .from(renovationProjects)
    .leftJoin(clients, eq(renovationProjects.clientId, clients.id))
    .leftJoin(users, eq(renovationProjects.projectManagerId, users.id))
    .where(
      and(
        eq(renovationProjects.id, pid),
        eq(renovationProjects.companyId, ctx.companyId),
        isNull(renovationProjects.deletedAt)
      )
    )
    .limit(1)

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

  const [phases, activeTasks, recentReports] = await Promise.all([
    db
      .select({
        id: renovationPhases.id,
        phaseNumber: renovationPhases.phaseNumber,
        title: renovationPhases.title,
        status: renovationPhases.status,
        plannedStartDate: renovationPhases.plannedStartDate,
        plannedEndDate: renovationPhases.plannedEndDate,
        completionPercentage: renovationPhases.completionPercentage,
        estimatedCost: renovationPhases.estimatedCost,
      })
      .from(renovationPhases)
      .where(eq(renovationPhases.projectId, pid))
      .orderBy(asc(renovationPhases.phaseNumber)),

    db
      .select({
        id: renovationTasks.id,
        title: renovationTasks.title,
        taskType: renovationTasks.taskType,
        status: renovationTasks.status,
        priority: renovationTasks.priority,
        dueDate: renovationTasks.dueDate,
        estimatedHours: renovationTasks.estimatedHours,
      })
      .from(renovationTasks)
      .where(and(eq(renovationTasks.projectId, pid), isNull(renovationTasks.deletedAt)))
      .orderBy(asc(renovationTasks.dueDate))
      .limit(20),

    db
      .select({
        id: renovationSiteReports.id,
        reportDate: renovationSiteReports.reportDate,
        reportType: renovationSiteReports.reportType,
        workersOnSite: renovationSiteReports.workersOnSite,
        completionDelta: renovationSiteReports.completionDelta,
        workPerformed: renovationSiteReports.workPerformed,
      })
      .from(renovationSiteReports)
      .where(eq(renovationSiteReports.projectId, pid))
      .orderBy(desc(renovationSiteReports.reportDate))
      .limit(5),
  ])

  return NextResponse.json({
    project: {
      id: project.id,
      projectCode: project.projectCode,
      title: project.title,
      description: project.description,
      status: project.status,
      priority: project.priority,
      projectType: project.projectType,
      estimatedValue: project.estimatedValue ? Number(project.estimatedValue) : null,
      contractedValue: project.contractedValue ? Number(project.contractedValue) : null,
      currency: project.currency,
      completionPercentage: project.completionPercentage,
      estimatedStartDate: project.estimatedStartDate,
      estimatedEndDate: project.estimatedEndDate,
      actualStartDate: project.actualStartDate,
      actualEndDate: project.actualEndDate,
      city: project.city,
      address: project.address,
      clientName: project.clientName ?? null,
      projectManagerName:
        project.managerFirstName && project.managerLastName
          ? `${project.managerFirstName} ${project.managerLastName}`
          : null,
      phases: phases.map((p) => ({
        ...p,
        estimatedCost: p.estimatedCost ? Number(p.estimatedCost) : null,
      })),
      tasks: activeTasks.map((t) => ({
        ...t,
        estimatedHours: t.estimatedHours ? Number(t.estimatedHours) : null,
      })),
      recentReports,
    },
  })
})
