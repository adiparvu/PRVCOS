import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { projectAllocations, projects, users } from "@prv/db/schema"
import { and, eq, isNull, or, gte } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type WorkloadBand = "under" | "optimal" | "full" | "over"

export interface WorkloadProjectSlice {
  projectId: string
  projectName: string
  allocationPercentage: number
  roleLabel: string | null
}

export interface WorkloadRow {
  userId: string
  name: string
  jobTitle: string | null
  avatarUrl: string | null
  totalPercentage: number
  band: WorkloadBand
  projects: WorkloadProjectSlice[]
}

export interface WorkloadSummary {
  people: number
  overAllocated: number
  underUtilized: number
  averageUtilization: number
}

// Green < 85 (under), 85–99 optimal, 100 full, > 100 over.
function bandFor(total: number): WorkloadBand {
  if (total > 100) return "over"
  if (total === 100) return "full"
  if (total >= 85) return "optimal"
  return "under"
}

// GET /api/resources/workload — company-wide employee utilization built from
// active project allocations. The workload board + utilization report (6.3):
// each person's committed capacity across projects, with over/under flags.
export const GET = withGates(
  { action: "resources.workload.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const day = new Date().toISOString().slice(0, 10)

    const rows = await db
      .select({
        userId: projectAllocations.userId,
        allocationPercentage: projectAllocations.allocationPercentage,
        roleLabel: projectAllocations.roleLabel,
        projectId: projectAllocations.projectId,
        projectName: projects.name,
        firstName: users.firstName,
        lastName: users.lastName,
        jobTitle: users.jobTitle,
        avatarUrl: users.avatarUrl,
      })
      .from(projectAllocations)
      .innerJoin(projects, eq(projectAllocations.projectId, projects.id))
      .innerJoin(users, eq(projectAllocations.userId, users.id))
      .where(
        and(
          eq(projectAllocations.companyId, ctx.session.companyId),
          isNull(projects.deletedAt),
          or(isNull(projectAllocations.endDate), gte(projectAllocations.endDate, day))
        )
      )

    const byUser = new Map<string, WorkloadRow>()
    for (const r of rows) {
      let row = byUser.get(r.userId)
      if (!row) {
        row = {
          userId: r.userId,
          name: `${r.firstName} ${r.lastName}`.trim(),
          jobTitle: r.jobTitle,
          avatarUrl: r.avatarUrl,
          totalPercentage: 0,
          band: "under",
          projects: [],
        }
        byUser.set(r.userId, row)
      }
      row.totalPercentage += r.allocationPercentage
      row.projects.push({
        projectId: r.projectId,
        projectName: r.projectName,
        allocationPercentage: r.allocationPercentage,
        roleLabel: r.roleLabel,
      })
    }

    const people = [...byUser.values()]
    for (const p of people) {
      p.band = bandFor(p.totalPercentage)
      p.projects.sort((a, b) => b.allocationPercentage - a.allocationPercentage)
    }
    // Most-loaded first — over-allocations surface at the top.
    people.sort((a, b) => b.totalPercentage - a.totalPercentage)

    const summary: WorkloadSummary = {
      people: people.length,
      overAllocated: people.filter((p) => p.band === "over").length,
      underUtilized: people.filter((p) => p.band === "under").length,
      averageUtilization: people.length
        ? Math.round(people.reduce((s, p) => s + p.totalPercentage, 0) / people.length)
        : 0,
    }

    return NextResponse.json({ people, summary })
  }
)
