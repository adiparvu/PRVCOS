import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { aiInsights, insightAffectedStores, insightRecommendations } from "@prv/db/schema"
import { and, asc, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import type { InsightType, InsightPriority, InsightStatus } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface AffectedStore {
  storeId: string
  storeName: string
  statusDot: "red" | "amber" | "green"
  metricLabel: string
  metricValue: string
  detail: string
}

export interface Recommendation {
  id: string
  title: string
  priority: "urgent" | "medium" | "low"
  deadline: string
}

export interface InsightDetail {
  id: string
  type: InsightType
  priority: InsightPriority
  status: InsightStatus
  title: string
  summary: string
  affectedCount: number
  affectedLabel: string
  confidenceLabel: string
  timeAgo: string
  score: number
  riskLabel: string
  riskDeadline: string
  dataSource: string
  affectedStores: AffectedStore[]
  recommendations: Recommendation[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(date: Date): string {
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60_000)
  if (diffMin < 1) return "acum"
  if (diffMin < 60) return `acum ${diffMin} min`
  const h = Math.floor(diffMin / 60)
  if (h < 24) return `acum ${h}h`
  if (h < 48) return "ieri"
  return `acum ${Math.floor(h / 24)} zile`
}

// ── GET ───────────────────────────────────────────────────────────────────────

export const GET = withGates(
  { action: "intelligence.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const [[insight], affectedStoreRows, recommendationRows] = await Promise.all([
      db
        .select({
          id: aiInsights.id,
          type: aiInsights.type,
          priority: aiInsights.priority,
          status: aiInsights.status,
          title: aiInsights.title,
          summary: aiInsights.summary,
          affectedCount: aiInsights.affectedCount,
          affectedLabel: aiInsights.affectedLabel,
          confidenceLabel: aiInsights.confidenceLabel,
          score: aiInsights.score,
          riskLabel: aiInsights.riskLabel,
          riskDeadline: aiInsights.riskDeadline,
          dataSource: aiInsights.dataSource,
          createdAt: aiInsights.createdAt,
        })
        .from(aiInsights)
        .where(
          and(
            eq(aiInsights.id, id),
            eq(aiInsights.companyId, companyId),
            isNull(aiInsights.deletedAt)
          )
        )
        .limit(1),

      db
        .select({
          storeId: insightAffectedStores.storeId,
          storeName: insightAffectedStores.storeName,
          statusDot: insightAffectedStores.statusDot,
          metricLabel: insightAffectedStores.metricLabel,
          metricValue: insightAffectedStores.metricValue,
          detail: insightAffectedStores.detail,
        })
        .from(insightAffectedStores)
        .where(eq(insightAffectedStores.insightId, id))
        .orderBy(asc(insightAffectedStores.sortOrder)),

      db
        .select({
          id: insightRecommendations.id,
          title: insightRecommendations.title,
          priority: insightRecommendations.priority,
          deadline: insightRecommendations.deadline,
        })
        .from(insightRecommendations)
        .where(eq(insightRecommendations.insightId, id))
        .orderBy(asc(insightRecommendations.sortOrder)),
    ])

    if (!insight) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const detail: InsightDetail = {
      id: insight.id,
      type: insight.type as InsightType,
      priority: insight.priority as InsightPriority,
      status: insight.status as InsightStatus,
      title: insight.title,
      summary: insight.summary,
      affectedCount: insight.affectedCount,
      affectedLabel: insight.affectedLabel,
      confidenceLabel: insight.confidenceLabel,
      timeAgo: relativeTime(insight.createdAt),
      score: insight.score,
      riskLabel: insight.riskLabel,
      riskDeadline: insight.riskDeadline,
      dataSource: insight.dataSource,
      affectedStores: affectedStoreRows.map((s) => ({
        storeId: s.storeId ?? "",
        storeName: s.storeName,
        statusDot: s.statusDot as "red" | "amber" | "green",
        metricLabel: s.metricLabel,
        metricValue: s.metricValue,
        detail: s.detail,
      })),
      recommendations: recommendationRows.map((r) => ({
        id: r.id,
        title: r.title,
        priority: r.priority as "urgent" | "medium" | "low",
        deadline: r.deadline,
      })),
    }

    return NextResponse.json(detail)
  }
)

// ─── PATCH /api/intelligence/[id] ────────────────────────────────────────────

const insightPatchSchema = z
  .object({
    status: z.enum(["new", "reviewed", "actioned", "dismissed"]).optional(),
    priority: z.enum(["urgent", "medium", "low"]).optional(),
  })
  .refine((d) => d.status !== undefined || d.priority !== undefined, {
    message: "At least one field required",
  })

export const PATCH = withGates(
  { action: "intelligence.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const raw = await req.json().catch(() => ({}))
    const parsed = insightPatchSchema.safeParse(raw)
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )

    const [existing] = await db
      .select({ id: aiInsights.id, status: aiInsights.status })
      .from(aiInsights)
      .where(
        and(
          eq(aiInsights.id, id),
          eq(aiInsights.companyId, companyId),
          isNull(aiInsights.deletedAt)
        )
      )
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const d = parsed.data
    const [updated] = await db
      .update(aiInsights)
      .set({
        ...(d.status !== undefined && { status: d.status }),
        ...(d.priority !== undefined && { priority: d.priority }),
        updatedAt: new Date(),
      })
      .where(and(eq(aiInsights.id, id), eq(aiInsights.companyId, companyId)))
      .returning({ id: aiInsights.id, status: aiInsights.status })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "intelligence.update",
      entityType: "ai_insight",
      entityId: id,
      payload: { from: existing.status, changes: d },
      method: "PATCH",
      path: `/api/intelligence/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)

// ─── DELETE /api/intelligence/[id] ───────────────────────────────────────────

export const DELETE = withGates(
  { action: "intelligence.delete", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const [existing] = await db
      .select({ id: aiInsights.id })
      .from(aiInsights)
      .where(
        and(
          eq(aiInsights.id, id),
          eq(aiInsights.companyId, companyId),
          isNull(aiInsights.deletedAt)
        )
      )
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db
      .update(aiInsights)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(aiInsights.id, id), eq(aiInsights.companyId, companyId)))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "intelligence.delete",
      entityType: "ai_insight",
      entityId: id,
      payload: {},
      method: "DELETE",
      path: `/api/intelligence/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
