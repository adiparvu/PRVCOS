import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { users } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withGates(
  { action: "people.org-chart.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const rootUserId = req.nextUrl.searchParams.get("rootUserId") ?? null

    const allUsers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        email: users.email,
        isActive: users.isActive,
        managerId: users.managerId,
      })
      .from(users)
      .where(and(eq(users.companyId, companyId), eq(users.isActive, true)))

    // Count direct reports for each user
    const reportCountMap = new Map<string, number>()
    for (const u of allUsers) {
      if (u.managerId) {
        reportCountMap.set(u.managerId, (reportCountMap.get(u.managerId) ?? 0) + 1)
      }
    }

    // Find roots (no manager, or manager not in set)
    const userIds = new Set(allUsers.map((u) => u.id))
    let roots = allUsers.filter((u) => !u.managerId || !userIds.has(u.managerId))

    // If rootUserId provided, subtree only
    let workingSet = allUsers
    if (rootUserId) {
      const subtree = new Set<string>()
      const queue = [rootUserId]
      while (queue.length > 0) {
        const cur = queue.shift()!
        subtree.add(cur)
        for (const u of allUsers) {
          if (u.managerId === cur) queue.push(u.id)
        }
      }
      workingSet = allUsers.filter((u) => subtree.has(u.id))
      roots = workingSet.filter((u) => u.id === rootUserId || !u.managerId)
    }

    // BFS depth assignment
    const depthMap = new Map<string, number>()
    const bfsQueue: Array<{ id: string; depth: number }> = roots.map((r) => ({
      id: r.id,
      depth: 0,
    }))
    while (bfsQueue.length > 0) {
      const { id, depth } = bfsQueue.shift()!
      if (depthMap.has(id)) continue
      depthMap.set(id, depth)
      for (const u of workingSet) {
        if (u.managerId === id) bfsQueue.push({ id: u.id, depth: depth + 1 })
      }
    }

    const nodes = workingSet.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      fullName: `${u.firstName} ${u.lastName}`.trim(),
      role: u.role,
      email: u.email,
      isActive: u.isActive,
      managerId: u.managerId,
      reportCount: reportCountMap.get(u.id) ?? 0,
      depth: depthMap.get(u.id) ?? 0,
    }))

    const edges = workingSet
      .filter((u) => u.managerId && userIds.has(u.managerId))
      .map((u) => ({ source: u.managerId!, target: u.id }))

    return NextResponse.json({
      nodes,
      edges,
      rootIds: roots.map((r) => r.id),
      totalNodes: nodes.length,
    })
  }
)
