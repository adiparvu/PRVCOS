import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { safetyBriefings } from "@prv/db/schema"
import { and, count, eq, gte, lte, desc } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BriefingSummary {
  id: string
  title: string
  category: string
  scheduledAt: string | null
  isActive: boolean
  attendeeCount: number
  createdAt: string
}

export interface BriefingsMeta {
  total: number
  active: number
  scheduledThisMonth: number
}

const LIMIT = 50

// ── GET /api/safety/briefings ─────────────────────────────────────────────────

export const GET = withGates(
  { action: "safety.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session

    const isActiveParam = req.nextUrl.searchParams.get("isActive")
    const limitParam = req.nextUrl.searchParams.get("limit")
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || LIMIT, 200) : LIMIT

    const isActiveFilter =
      isActiveParam === "true" ? true : isActiveParam === "false" ? false : null

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const rows = await db
      .select({
        id: safetyBriefings.id,
        title: safetyBriefings.title,
        category: safetyBriefings.category,
        scheduledAt: safetyBriefings.scheduledAt,
        isActive: safetyBriefings.isActive,
        attendeeCount: safetyBriefings.attendeeCount,
        createdAt: safetyBriefings.createdAt,
      })
      .from(safetyBriefings)
      .where(
        and(
          eq(safetyBriefings.companyId, companyId),
          isActiveFilter !== null ? eq(safetyBriefings.isActive, isActiveFilter) : undefined
        )
      )
      .orderBy(desc(safetyBriefings.createdAt))
      .limit(limit)

    const [totalRow, activeRow, scheduledThisMonthRow] = await Promise.all([
      db
        .select({ value: count() })
        .from(safetyBriefings)
        .where(eq(safetyBriefings.companyId, companyId)),
      db
        .select({ value: count() })
        .from(safetyBriefings)
        .where(and(eq(safetyBriefings.companyId, companyId), eq(safetyBriefings.isActive, true))),
      db
        .select({ value: count() })
        .from(safetyBriefings)
        .where(
          and(
            eq(safetyBriefings.companyId, companyId),
            gte(safetyBriefings.scheduledAt, startOfMonth),
            lte(safetyBriefings.scheduledAt, endOfMonth)
          )
        ),
    ])

    const briefings: BriefingSummary[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category ?? "general",
      scheduledAt: r.scheduledAt ? r.scheduledAt.toISOString() : null,
      isActive: r.isActive,
      attendeeCount: r.attendeeCount,
      createdAt: r.createdAt.toISOString(),
    }))

    const meta: BriefingsMeta = {
      total: totalRow[0]?.value ?? 0,
      active: activeRow[0]?.value ?? 0,
      scheduledThisMonth: scheduledThisMonthRow[0]?.value ?? 0,
    }

    return NextResponse.json({ briefings, meta })
  }
)

// ── POST /api/safety/briefings ────────────────────────────────────────────────

const createBriefingSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().min(1),
  category: z.string().max(100).optional(),
  scheduledAt: z.string().datetime().optional(),
})

export const POST = withGates(
  { action: "safety.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = createBriefingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const d = parsed.data

    const [record] = await db
      .insert(safetyBriefings)
      .values({
        companyId,
        createdBy: userId,
        title: d.title,
        content: d.content,
        category: d.category ?? "general",
        scheduledAt: d.scheduledAt ? new Date(d.scheduledAt) : null,
        isActive: true,
      })
      .returning({ id: safetyBriefings.id, title: safetyBriefings.title })

    if (!record) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "safety.briefing.create",
      entityType: "safety_briefing",
      entityId: record.id,
      payload: d,
      method: "POST",
      path: "/api/safety/briefings",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record.id, title: record.title }, { status: 201 })
  }
)
