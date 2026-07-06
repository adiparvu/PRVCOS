import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import {
  alerts,
  approvalRequests,
  kpiDailySnapshots,
  safetyIncidents,
  stockLevels,
} from "@prv/db/schema"
import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  lt,
  ne,
  sql,
} from "drizzle-orm"
import { evaluateAlertRules, type AlertRuleInput } from "@prv/ai-engine/alert-rules"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const APPROVAL_STALE_MS = 48 * 3_600_000

function num(v: unknown): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

// POST /api/alerts/evaluate — run the automated-trigger rules over the latest
// KPI snapshots plus live safety / inventory / approval signals, and persist any
// newly-triggered alerts. An alert is skipped when a still-open alert already
// exists for the same rule (deduped by source).
export const POST = withGates(
  { action: "alerts.create", endpointClass: "api_write" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session

    const rows = await db
      .select({
        revenueMonth: kpiDailySnapshots.revenueMonth,
        headcount: kpiDailySnapshots.headcount,
        presentToday: kpiDailySnapshots.presentToday,
        healthScore: kpiDailySnapshots.healthScore,
      })
      .from(kpiDailySnapshots)
      .where(eq(kpiDailySnapshots.companyId, companyId))
      .orderBy(desc(kpiDailySnapshots.snapshotDate))
      .limit(2)

    // rows are newest → oldest.
    const current = rows[0]
    const previous = rows[1]

    // Live cross-module signals (independent of the nightly snapshot).
    const safetyRows = await db
      .select({ n: count() })
      .from(safetyIncidents)
      .where(
        and(
          eq(safetyIncidents.companyId, companyId),
          eq(safetyIncidents.severity, "critical"),
          inArray(safetyIncidents.status, ["open", "under_investigation"])
        )
      )
    const stockoutRows = await db
      .select({ n: countDistinct(stockLevels.productId) })
      .from(stockLevels)
      .where(
        and(
          eq(stockLevels.companyId, companyId),
          isNotNull(stockLevels.reorderPoint),
          gt(stockLevels.reorderPoint, 0),
          sql`${stockLevels.quantity} <= ${stockLevels.reorderPoint}`
        )
      )
    const approvalRows = await db
      .select({ n: count() })
      .from(approvalRequests)
      .where(
        and(
          eq(approvalRequests.companyId, companyId),
          eq(approvalRequests.status, "pending"),
          lt(approvalRequests.createdAt, new Date(Date.now() - APPROVAL_STALE_MS))
        )
      )

    const prevRevenue = previous ? num(previous.revenueMonth) : 0
    const revenueDeltaPct =
      previous && prevRevenue > 0
        ? ((num(current?.revenueMonth) - prevRevenue) / prevRevenue) * 100
        : null
    const attendanceRatePct =
      current && current.headcount > 0
        ? (num(current.presentToday) / current.headcount) * 100
        : null

    const input: AlertRuleInput = {
      revenueDeltaPct,
      cashPosition: null, // not tracked in the daily snapshot yet
      cashThreshold: 0,
      attendanceRatePct,
      openCriticalSafety: num(safetyRows[0]?.n),
      stockoutRisk: num(stockoutRows[0]?.n),
      overdueApprovalsOver48h: num(approvalRows[0]?.n),
      healthScore: current ? num(current.healthScore) : 100,
    }

    const specs = evaluateAlertRules(input)
    if (specs.length === 0) {
      return NextResponse.json({ evaluated: 0, created: [], skipped: [] })
    }

    const sources = specs.map((s) => `rule:${s.ruleKey}`)
    const openRows = await db
      .select({ source: alerts.source })
      .from(alerts)
      .where(
        and(
          eq(alerts.companyId, companyId),
          ne(alerts.status, "resolved"),
          inArray(alerts.source, sources)
        )
      )
    const openSources = new Set(openRows.map((r) => r.source))

    const toCreate = specs.filter((s) => !openSources.has(`rule:${s.ruleKey}`))
    const skipped = specs.filter((s) => openSources.has(`rule:${s.ruleKey}`)).map((s) => s.ruleKey)

    if (toCreate.length > 0) {
      await db.insert(alerts).values(
        toCreate.map((s) => ({
          companyId,
          severity: s.severity,
          status: "open" as const,
          title: s.title,
          description: s.description,
          source: `rule:${s.ruleKey}`,
        }))
      )
    }

    return NextResponse.json({
      evaluated: specs.length,
      created: toCreate.map((s) => s.ruleKey),
      skipped,
    })
  }
)
