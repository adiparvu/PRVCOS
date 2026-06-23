import { NextRequest, NextResponse } from "next/server"
import { withPortalMobileAuth } from "@/lib/mobile/portal-auth"
import type { PortalSessionContext } from "@/lib/portal-auth"
import { db } from "@prv/db"
import { renovationProjects, renovationPhases } from "@prv/db/schema"
import { and, desc, eq, inArray, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Format a numeric value as "€X,XXX" (no cents for budget display) */
function formatBudget(value: string | number | null | undefined): string | null {
  if (value == null) return null
  const n = Number(value)
  if (isNaN(n)) return null
  return `€${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

/** Map renovation project status to the simplified mobile enum + label */
function mapStatus(status: string): {
  mapped: "planning" | "in_progress" | "on_hold" | "completed"
  label: string
} {
  switch (status) {
    case "inquiry":
      return { mapped: "planning", label: "Inquiry" }
    case "estimation":
      return { mapped: "planning", label: "Estimation" }
    case "contracted":
      return { mapped: "planning", label: "Contracted" }
    case "in_progress":
      return { mapped: "in_progress", label: "In Progress" }
    case "paused":
      return { mapped: "on_hold", label: "On Hold" }
    case "completed":
      return { mapped: "completed", label: "Completed" }
    case "cancelled":
      return { mapped: "completed", label: "Cancelled" }
    default:
      return { mapped: "planning", label: status }
  }
}

/** Map the mobile ?status= param to the DB renovation statuses it covers */
function mobileStatusToDbStatuses(mobileStatus: string): readonly string[] | null {
  switch (mobileStatus) {
    case "planning":
      return ["inquiry", "estimation", "contracted"]
    case "in_progress":
      return ["in_progress"]
    case "on_hold":
      return ["paused"]
    case "completed":
      return ["completed", "cancelled"]
    default:
      return null
  }
}

export const GET = withPortalMobileAuth(
  async (req: NextRequest, ctx: PortalSessionContext): Promise<NextResponse> => {
    if (!ctx.clientId) {
      return NextResponse.json(
        { error: "No client profile linked to this account" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const statusParam = searchParams.get("status")

    const conditions = [
      eq(renovationProjects.companyId, ctx.companyId),
      eq(renovationProjects.clientId, ctx.clientId),
      isNull(renovationProjects.deletedAt),
    ]

    if (statusParam) {
      const dbStatuses = mobileStatusToDbStatuses(statusParam)
      if (dbStatuses) {
        conditions.push(inArray(renovationProjects.status, dbStatuses as [string, ...string[]]))
      }
    }

    const rows = await db
      .select({
        id: renovationProjects.id,
        title: renovationProjects.title,
        status: renovationProjects.status,
        completionPercentage: renovationProjects.completionPercentage,
        estimatedStartDate: renovationProjects.estimatedStartDate,
        estimatedEndDate: renovationProjects.estimatedEndDate,
        actualStartDate: renovationProjects.actualStartDate,
        actualEndDate: renovationProjects.actualEndDate,
        estimatedValue: renovationProjects.estimatedValue,
        contractedValue: renovationProjects.contractedValue,
        address: renovationProjects.address,
        city: renovationProjects.city,
      })
      .from(renovationProjects)
      .where(and(...conditions))
      .orderBy(desc(renovationProjects.createdAt))
      .limit(100)

    if (rows.length === 0) {
      return NextResponse.json({ projects: [] })
    }

    // Fetch next milestone (first pending/in_progress phase) for all returned projects
    const projectIds = rows.map((r) => r.id)
    const phaseRows = await db
      .select({
        projectId: renovationPhases.projectId,
        title: renovationPhases.title,
        phaseNumber: renovationPhases.phaseNumber,
      })
      .from(renovationPhases)
      .where(
        and(
          inArray(renovationPhases.projectId, projectIds),
          inArray(renovationPhases.status, ["pending", "in_progress"])
        )
      )
      .orderBy(renovationPhases.phaseNumber)

    const nextMilestoneMap: Record<string, string | null> = {}
    for (const phase of phaseRows) {
      if (!nextMilestoneMap[phase.projectId]) {
        nextMilestoneMap[phase.projectId] = phase.title
      }
    }

    const projects = rows.map((r) => {
      const { mapped, label } = mapStatus(r.status)
      const startDate = r.actualStartDate ?? r.estimatedStartDate ?? null
      const endDate = r.actualEndDate ?? r.estimatedEndDate ?? null
      // Build address string from city + address
      const addressParts = [r.address, r.city].filter(Boolean)
      const address = addressParts.length > 0 ? addressParts.join(", ") : null

      return {
        id: r.id,
        name: r.title,
        status: mapped,
        statusLabel: label,
        progress: r.completionPercentage,
        startDate: startDate ?? null,
        endDate: endDate ?? null,
        budget: formatBudget(r.estimatedValue),
        spent: formatBudget(r.contractedValue),
        nextMilestone: nextMilestoneMap[r.id] ?? null,
        photosCount: 0, // TODO: query site_report photos JSONB aggregation when needed
        address,
      }
    })

    return NextResponse.json({ projects })
  },
  { portalType: "client" }
)
