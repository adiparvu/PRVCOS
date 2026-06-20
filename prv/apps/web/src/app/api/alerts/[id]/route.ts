import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { alerts } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface Params {
  params: Promise<{ id: string }>
}

// PATCH /api/alerts/[id] — acknowledge, assign, or resolve
export const PATCH = withGates(
  { action: "alerts.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext, params?: Params): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const { id } = await (params as Params).params
    const body = await req.json()

    const existing = await db
      .select({ id: alerts.id, status: alerts.status })
      .from(alerts)
      .where(and(eq(alerts.id, id), eq(alerts.companyId, companyId)))
      .limit(1)

    if (!existing.length) {
      return NextResponse.json({ error: "not found" }, { status: 404 })
    }

    const { action, assignedToId, resolutionNote } = body as {
      action: "acknowledge" | "assign" | "resolve"
      assignedToId?: string
      resolutionNote?: string
    }

    const now = new Date()

    if (action === "acknowledge") {
      await db
        .update(alerts)
        .set({ status: "acknowledged", acknowledgedAt: now, updatedAt: now })
        .where(and(eq(alerts.id, id), eq(alerts.companyId, companyId)))
    } else if (action === "assign") {
      if (!assignedToId)
        return NextResponse.json({ error: "assignedToId required" }, { status: 400 })
      await db
        .update(alerts)
        .set({ status: "assigned", assignedToId, updatedAt: now })
        .where(and(eq(alerts.id, id), eq(alerts.companyId, companyId)))
    } else if (action === "resolve") {
      await db
        .update(alerts)
        .set({
          status: "resolved",
          resolvedAt: now,
          resolutionNote: resolutionNote ?? null,
          updatedAt: now,
        })
        .where(and(eq(alerts.id, id), eq(alerts.companyId, companyId)))
    } else {
      return NextResponse.json({ error: "invalid action" }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  }
)
