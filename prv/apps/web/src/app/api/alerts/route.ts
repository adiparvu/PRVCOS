import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { alerts } from "@prv/db/schema"
import { and, desc, eq, isNull, ne } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// GET /api/alerts?status=open|acknowledged|all
export const GET = withGates(
  { action: "alerts.list", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const status = new URL(req.url).searchParams.get("status") ?? "open"

    const conditions =
      status === "all"
        ? [eq(alerts.companyId, companyId)]
        : status === "open"
          ? [eq(alerts.companyId, companyId), ne(alerts.status, "resolved")]
          : [
              eq(alerts.companyId, companyId),
              eq(alerts.status, status as "open" | "acknowledged" | "assigned"),
            ]

    const rows = await db
      .select({
        id: alerts.id,
        severity: alerts.severity,
        status: alerts.status,
        title: alerts.title,
        description: alerts.description,
        source: alerts.source,
        entityType: alerts.entityType,
        entityId: alerts.entityId,
        assignedToId: alerts.assignedToId,
        acknowledgedAt: alerts.acknowledgedAt,
        resolvedAt: alerts.resolvedAt,
        resolutionNote: alerts.resolutionNote,
        createdAt: alerts.createdAt,
        updatedAt: alerts.updatedAt,
      })
      .from(alerts)
      .where(and(...conditions))
      .orderBy(desc(alerts.createdAt))
      .limit(100)

    return NextResponse.json({ alerts: rows, total: rows.length })
  }
)

// POST /api/alerts — create a new alert (system or manual)
export const POST = withGates(
  { action: "alerts.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const body = await req.json()

    const { severity, title, description, source, entityType, entityId } = body as {
      severity: "l1_info" | "l2_warning" | "l3_critical" | "l4_emergency" | "l5_crisis"
      title: string
      description?: string
      source?: string
      entityType?: string
      entityId?: string
    }

    if (!severity || !title) {
      return NextResponse.json({ error: "severity and title required" }, { status: 400 })
    }

    const [row] = await db
      .insert(alerts)
      .values({
        companyId,
        severity,
        title,
        description: description ?? null,
        source: source ?? "manual",
        entityType: entityType ?? null,
        entityId: entityId ?? null,
        assignedToId: null,
        status: "open",
      })
      .returning({ id: alerts.id })

    return NextResponse.json({ id: row!.id }, { status: 201 })
  }
)
