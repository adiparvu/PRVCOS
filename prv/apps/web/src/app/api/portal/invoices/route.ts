import { NextRequest, NextResponse } from "next/server"
import { withPortalAuth } from "@/lib/portal-middleware"
import type { PortalSessionContext } from "@/lib/portal-auth"
import { db } from "@prv/db"
import { invoices } from "@prv/db/schema"
import { and, desc, eq, isNull, lt, notInArray } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withPortalAuth(
  async (req: NextRequest, ctx: PortalSessionContext): Promise<NextResponse> => {
    if (!ctx.clientId) {
      return NextResponse.json(
        { error: "No client profile linked to this account" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const cursor = searchParams.get("cursor")
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100)

    const conditions = [
      eq(invoices.companyId, ctx.companyId),
      eq(invoices.clientId, ctx.clientId),
      isNull(invoices.deletedAt),
      notInArray(invoices.status, ["draft"]),
    ]

    if (status) {
      conditions.push(eq(invoices.status, status as typeof invoices.status._.data))
    }
    if (cursor) conditions.push(lt(invoices.createdAt, new Date(cursor)))

    const rows = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        paidAt: invoices.paidAt,
        subtotal: invoices.subtotal,
        vatAmount: invoices.vatAmount,
        total: invoices.total,
        currency: invoices.currency,
        notes: invoices.notes,
        projectId: invoices.projectId,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .where(and(...conditions))
      .orderBy(desc(invoices.createdAt))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const items = hasMore ? rows.slice(0, limit) : rows
    const nextCursor =
      hasMore && items.length > 0 ? items[items.length - 1]!.createdAt.toISOString() : null

    const data = items.map((r) => ({
      id: r.id,
      invoiceNumber: r.invoiceNumber,
      status: r.status,
      issueDate: r.issueDate,
      dueDate: r.dueDate,
      paidAt: r.paidAt?.toISOString() ?? null,
      subtotal: Number(r.subtotal),
      vatAmount: Number(r.vatAmount),
      total: Number(r.total),
      currency: r.currency,
      notes: r.notes,
      projectId: r.projectId,
    }))

    return NextResponse.json({ invoices: data, count: data.length, nextCursor })
  },
  { portalType: "client" }
)
