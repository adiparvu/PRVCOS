import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { tools, toolCheckouts, users } from "@prv/db/schema"
import { and, desc, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import { canCheckout, summarizeCheckout } from "@/lib/tool-checkout"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// path: /api/tools/[id]/checkout
function toolId(req: NextRequest): string {
  const parts = req.nextUrl.pathname.split("/")
  const i = parts.indexOf("checkout")
  return i > 0 ? (parts[i - 1] ?? "") : ""
}

async function loadTool(id: string, companyId: string) {
  const [row] = await db
    .select({ id: tools.id, name: tools.name, status: tools.status })
    .from(tools)
    .where(and(eq(tools.id, id), eq(tools.companyId, companyId), isNull(tools.deletedAt)))
    .limit(1)
  return row ?? null
}

// ── GET /api/tools/[id]/checkout ──────────────────────────────────────────────
// Custody history for a tool, newest first, plus the current open checkout.

export const GET = withGates(
  { action: "tools.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = toolId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId } = ctx.session
    const tool = await loadTool(id, companyId)
    if (!tool) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const rows = await db
      .select({
        id: toolCheckouts.id,
        status: toolCheckouts.status,
        checkedOutAt: toolCheckouts.checkedOutAt,
        expectedReturnAt: toolCheckouts.expectedReturnAt,
        returnedAt: toolCheckouts.returnedAt,
        checkoutNotes: toolCheckouts.checkoutNotes,
        returnConditionNotes: toolCheckouts.returnConditionNotes,
        damageReported: toolCheckouts.damageReported,
        damageNotes: toolCheckouts.damageNotes,
        custodianFirstName: users.firstName,
        custodianLastName: users.lastName,
      })
      .from(toolCheckouts)
      .leftJoin(users, eq(toolCheckouts.custodianId, users.id))
      .where(and(eq(toolCheckouts.toolId, id), eq(toolCheckouts.companyId, companyId)))
      .orderBy(desc(toolCheckouts.checkedOutAt))
      .limit(50)

    const now = new Date()
    const checkouts = rows.map((r) => ({
      id: r.id,
      custodian: r.custodianFirstName ? `${r.custodianFirstName} ${r.custodianLastName}` : null,
      checkedOutAt: r.checkedOutAt.toISOString(),
      expectedReturnAt: r.expectedReturnAt ? r.expectedReturnAt.toISOString() : null,
      returnedAt: r.returnedAt ? r.returnedAt.toISOString() : null,
      checkoutNotes: r.checkoutNotes,
      returnConditionNotes: r.returnConditionNotes,
      damageReported: r.damageReported,
      damageNotes: r.damageNotes,
      ...summarizeCheckout(
        {
          checkedOutAt: r.checkedOutAt,
          expectedReturnAt: r.expectedReturnAt,
          returnedAt: r.returnedAt,
        },
        now
      ),
    }))

    const current = checkouts.find((c) => c.status === "open") ?? null
    return NextResponse.json({ checkouts, current })
  }
)

// ── POST /api/tools/[id]/checkout ─────────────────────────────────────────────
// Open a checkout: assign a custodian and take the tool out of the pool.

const checkoutSchema = z.object({
  custodianId: z.string().uuid(),
  expectedReturnAt: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
})

export const POST = withGates(
  { action: "tools.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = toolId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId } = ctx.session

    const raw = await req.json().catch(() => ({}))
    const parsed = checkoutSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const tool = await loadTool(id, companyId)
    if (!tool) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (!canCheckout(tool.status)) {
      return NextResponse.json(
        { error: `Tool is not available for checkout (status: ${tool.status})` },
        { status: 409 }
      )
    }

    // Belt-and-suspenders with the partial unique index on the ledger.
    const [open] = await db
      .select({ id: toolCheckouts.id })
      .from(toolCheckouts)
      .where(and(eq(toolCheckouts.toolId, id), eq(toolCheckouts.status, "open")))
      .limit(1)
    if (open) {
      return NextResponse.json({ error: "Tool already has an open checkout" }, { status: 409 })
    }

    const { custodianId, expectedReturnAt, notes } = parsed.data

    const [checkout] = await db
      .insert(toolCheckouts)
      .values({
        companyId,
        toolId: id,
        custodianId,
        checkedOutBy: userId,
        status: "open",
        expectedReturnAt: expectedReturnAt ? new Date(expectedReturnAt) : null,
        checkoutNotes: notes,
      })
      .returning({ id: toolCheckouts.id })

    if (!checkout) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    await db
      .update(tools)
      .set({ status: "in_use", assignedUserId: custodianId, updatedAt: new Date() })
      .where(and(eq(tools.id, id), eq(tools.companyId, companyId)))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "tools.checkout",
      entityType: "tool",
      entityId: id,
      payload: {
        name: tool.name,
        custodianId,
        checkoutId: checkout.id,
        expectedReturnAt: expectedReturnAt ?? null,
      },
      method: "POST",
      path: `/api/tools/${id}/checkout`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: checkout.id }, { status: 201 })
  }
)
