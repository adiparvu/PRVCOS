import { NextRequest, NextResponse } from "next/server"
import { withPortalAuth } from "@/lib/portal-middleware"
import type { PortalSessionContext } from "@/lib/portal-auth"
import { db } from "@prv/db"
import {
  renovationProjects,
  renovationPhases,
  renovationEstimates,
  renovationContracts,
  renovationSiteReports,
  users,
} from "@prv/db/schema"
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function projectId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-2) ?? ""
}

export const GET = withPortalAuth(
  async (req: NextRequest, ctx: PortalSessionContext): Promise<NextResponse> => {
    if (!ctx.clientId) {
      return NextResponse.json(
        { error: "No client profile linked to this account" },
        { status: 403 }
      )
    }

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
        managerFirstName: users.firstName,
        managerLastName: users.lastName,
        createdAt: renovationProjects.createdAt,
      })
      .from(renovationProjects)
      .leftJoin(users, eq(renovationProjects.projectManagerId, users.id))
      .where(
        and(
          eq(renovationProjects.id, pid),
          eq(renovationProjects.companyId, ctx.companyId),
          eq(renovationProjects.clientId, ctx.clientId),
          isNull(renovationProjects.deletedAt)
        )
      )
      .limit(1)

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const [phases, estimates, contracts, siteReports] = await Promise.all([
      db
        .select({
          id: renovationPhases.id,
          phaseNumber: renovationPhases.phaseNumber,
          title: renovationPhases.title,
          description: renovationPhases.description,
          status: renovationPhases.status,
          plannedStartDate: renovationPhases.plannedStartDate,
          plannedEndDate: renovationPhases.plannedEndDate,
          actualStartDate: renovationPhases.actualStartDate,
          actualEndDate: renovationPhases.actualEndDate,
          completionPercentage: renovationPhases.completionPercentage,
          requiresClientApproval: renovationPhases.requiresClientApproval,
        })
        .from(renovationPhases)
        .where(eq(renovationPhases.projectId, pid))
        .orderBy(asc(renovationPhases.phaseNumber)),

      db
        .select({
          id: renovationEstimates.id,
          estimateNumber: renovationEstimates.estimateNumber,
          version: renovationEstimates.version,
          status: renovationEstimates.status,
          validUntil: renovationEstimates.validUntil,
          subtotal: renovationEstimates.subtotal,
          vatRate: renovationEstimates.vatRate,
          vatAmount: renovationEstimates.vatAmount,
          total: renovationEstimates.total,
          currency: renovationEstimates.currency,
          notes: renovationEstimates.notes,
          clientViewedAt: renovationEstimates.clientViewedAt,
          clientResponse: renovationEstimates.clientResponse,
          createdAt: renovationEstimates.createdAt,
        })
        .from(renovationEstimates)
        .where(
          and(
            eq(renovationEstimates.projectId, pid),
            isNull(renovationEstimates.deletedAt),
            inArray(renovationEstimates.status, ["sent_to_client", "accepted"])
          )
        )
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
          signedByClientAt: renovationContracts.signedByClientAt,
          signedByCompanyAt: renovationContracts.signedByCompanyAt,
          createdAt: renovationContracts.createdAt,
        })
        .from(renovationContracts)
        .where(
          and(
            eq(renovationContracts.projectId, pid),
            isNull(renovationContracts.deletedAt),
            inArray(renovationContracts.status, ["sent", "signed", "active"])
          )
        )
        .orderBy(desc(renovationContracts.createdAt)),

      db
        .select({
          id: renovationSiteReports.id,
          reportDate: renovationSiteReports.reportDate,
          reportType: renovationSiteReports.reportType,
          workPerformed: renovationSiteReports.workPerformed,
          workersOnSite: renovationSiteReports.workersOnSite,
          completionDelta: renovationSiteReports.completionDelta,
          photos: renovationSiteReports.photos,
          createdAt: renovationSiteReports.createdAt,
        })
        .from(renovationSiteReports)
        .where(
          and(
            eq(renovationSiteReports.projectId, pid),
            eq(renovationSiteReports.clientVisible, true)
          )
        )
        .orderBy(desc(renovationSiteReports.reportDate))
        .limit(20),
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
        projectManagerName:
          project.managerFirstName && project.managerLastName
            ? `${project.managerFirstName} ${project.managerLastName}`
            : null,
        phases,
        estimates: estimates.map((e) => ({
          ...e,
          subtotal: Number(e.subtotal),
          vatRate: Number(e.vatRate),
          vatAmount: Number(e.vatAmount),
          total: Number(e.total),
        })),
        contracts: contracts.map((c) => ({
          ...c,
          contractValue: Number(c.contractValue),
        })),
        siteReports,
      },
    })
  },
  { portalType: "client" }
)
