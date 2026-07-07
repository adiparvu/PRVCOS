import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { tools } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import { computeToolInventory, type ToolInventory, type ToolStatus } from "@/lib/tool-inventory"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type ToolInventoryResponse = ToolInventory

// GET /api/analytics/tool-inventory — tool asset availability: status mix,
// utilization, lost assets, warranty exposure and per-category breakdown.
export const GET = withGates(
  { action: "analytics.kpis.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = await db
      .select({
        status: tools.status,
        category: tools.category,
        warrantyExpiresAt: tools.warrantyExpiresAt,
      })
      .from(tools)
      .where(and(eq(tools.companyId, ctx.session.companyId), isNull(tools.deletedAt)))

    const inventory = computeToolInventory(
      rows.map((r) => ({
        status: r.status as ToolStatus,
        category: r.category,
        warrantyExpiresAt: r.warrantyExpiresAt ? r.warrantyExpiresAt.toISOString() : null,
      })),
      Date.now()
    )

    return NextResponse.json(inventory)
  }
)
