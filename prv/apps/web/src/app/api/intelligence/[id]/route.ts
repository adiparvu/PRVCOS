import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { aiInsights, insightAffectedStores, insightRecommendations } from "@prv/db/schema"
import { and, asc, eq, isNull } from "drizzle-orm"
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
