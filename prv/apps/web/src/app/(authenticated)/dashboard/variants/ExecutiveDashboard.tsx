import { cacheMemo } from "@prv/cache"
import { queryCompanyKpis } from "@prv/db"
import { db } from "@prv/db"
import { invoices, auditLogs } from "@prv/db/schema"
import { and, desc, eq, gte, isNull, sql, sum } from "drizzle-orm"
import { GlassAlertBanner } from "@prv/ui"
import type { PRVSession } from "@prv/auth"
import type { ActivityEventPayload } from "@prv/cache"
import { OnlineNowPanel } from "@/components/presence/OnlineNowPanel"
import { PinnedContactsRow } from "@/components/dashboard/PinnedContactsRow"
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting"
import { resolveQuickActions } from "@/lib/quick-actions"
import { GlassCard, SectionLabel, QuickActionsGrid } from "../_shared"
import { LiveKpiGrid } from "../islands/LiveKpiGrid"
import { LiveActivityFeed } from "../islands/LiveActivityFeed"
import { ExecutiveSummaryPanel } from "@/components/dashboard/ExecutiveSummaryPanel"

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

const SPARK = {
  revenue: [30, 34, 32, 40, 44, 48],
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function fmtElapsed(createdAt: Date): string {
  const elapsed = Date.now() - createdAt.getTime()
  const mins = Math.floor(elapsed / 60000)
  if (mins < 2) return "just now"
  if (mins < 60) return `${mins} minutes ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`
  return "yesterday"
}

function auditActionToActivity(
  action: string,
  entityType: string | null,
  id: string,
  createdAt: Date,
  actorId: string | null
): ActivityEventPayload {
  const lower = action.toLowerCase()
  let type: ActivityEventPayload["type"] = "info"
  if (
    lower.includes("create") ||
    lower.includes("pay") ||
    lower.includes("approve") ||
    lower.includes("sign")
  ) {
    type = "success"
  } else if (
    lower.includes("delete") ||
    lower.includes("fail") ||
    lower.includes("decline") ||
    lower.includes("reject")
  ) {
    type = "warning"
  } else if (lower.includes("alert") || lower.includes("error") || lower.includes("critical")) {
    type = "error"
  }

  // Format a human-readable title from e.g. "invoices.create" → "Invoice created"
  const parts = action.split(".")
  const entity = parts[0] ?? "item"
  const verb = parts[parts.length - 1] ?? "updated"
  const verbMap: Record<string, string> = {
    create: "created",
    update: "updated",
    delete: "deleted",
    read: "viewed",
    pay: "paid",
    approve: "approved",
    sign: "signed",
  }
  const title = `${capitalize(entity.replace(/_/g, " "))} ${verbMap[verb] ?? verb}`

  return {
    id,
    type,
    title,
    description: entityType ?? "System",
    timestamp: fmtElapsed(createdAt),
    actorId: actorId ?? undefined,
  }
}

interface Props {
  session: PRVSession
}

export async function ExecutiveDashboard({ session }: Props) {
  const periodKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`

  // Build 6-month window (first day of 6 months ago → today)
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: MONTH_SHORT[d.getMonth()] as string,
    }
  })
  const firstDay = `${months[0]!.key}-01`

  let kpis
  let REVENUE_SERIES = [0, 0, 0, 0, 0, 0]
  let REVENUE_LABELS = months.map((m) => m.label)
  let INITIAL_ACTIVITY: ActivityEventPayload[] = []

  try {
    const [kpisResult, revenueRows, activityRows] = await Promise.all([
      cacheMemo(
        "dashboard_kpis",
        `${session.companyId}:${periodKey}`,
        () => queryCompanyKpis(session.companyId, session.userId),
        { ttl: 60 }
      ),

      db
        .select({
          monthKey: sql<string>`to_char(${invoices.issueDate}::date, 'YYYY-MM')`,
          total: sum(invoices.total),
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, session.companyId),
            eq(invoices.status, "paid"),
            gte(invoices.issueDate, firstDay),
            isNull(invoices.deletedAt)
          )
        )
        .groupBy(sql`to_char(${invoices.issueDate}::date, 'YYYY-MM')`),

      db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          actorId: auditLogs.actorId,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .where(and(eq(auditLogs.companyId, session.companyId), eq(auditLogs.gateFailed, 0)))
        .orderBy(desc(auditLogs.createdAt))
        .limit(5),
    ])

    kpis = kpisResult

    const revMap = new Map(
      revenueRows.map((r) => [r.monthKey, Math.round(Number(r.total ?? 0) / 1000)])
    )
    REVENUE_SERIES = months.map((m) => revMap.get(m.key) ?? 0)
    REVENUE_LABELS = months.map((m) => m.label)

    INITIAL_ACTIVITY = activityRows.map((r) =>
      auditActionToActivity(r.action, r.entityType ?? null, r.id, r.createdAt, r.actorId ?? null)
    )
  } catch {
    kpis = null
  }

  const alertCount = kpis?.alerts ?? 0
  const quickActions = resolveQuickActions(session.role)

  const initialKpis = {
    revenue: kpis?.revenue ?? "0",
    workforce: kpis?.workforce ?? 0,
    activeProjects: kpis?.activeProjects ?? 0,
    alerts: alertCount,
  }

  const maxRev = Math.max(...REVENUE_SERIES, 1)

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[13px] font-medium mb-0.5" style={{ color: "var(--prv-text-3)" }}>
            PRV
          </p>
          <h1
            className="text-[26px] font-semibold tracking-tight leading-tight"
            style={{ color: "var(--prv-text-1)" }}
          >
            Command
          </h1>
        </div>
        <div
          className="px-3 py-1.5 rounded-[10px] text-[12px] font-medium"
          style={{
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            color: "var(--prv-text-2)",
          }}
        >
          Executive
        </div>
      </div>

      {/* Greeting */}
      <DashboardGreeting />

      {/* AI Briefing */}
      <div
        className="flex gap-3 p-4 rounded-[16px] relative overflow-hidden mb-3.5"
        style={{
          background:
            "radial-gradient(circle at 0% 0%, rgba(10,132,255,0.14), transparent 60%), var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
        }}
      >
        <div
          className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg,#0A84FF,#5E5CE6)" }}
          aria-hidden="true"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M17.7 17.7l2.1 2.1M2 12h4M18 12h4" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <div>
          <p className="text-[12px] font-bold mb-0.5" style={{ color: "var(--prv-text-1)" }}>
            AI BRIEFING
          </p>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--prv-text-2)" }}>
            Revenue is tracking{" "}
            <span className="font-semibold" style={{ color: "var(--prv-text-1)" }}>
              +12% MoM
            </span>
            . Cluj is your best-margin store (39%). 2 projects risk slipping this week — review
            staffing.
          </p>
        </div>
      </div>

      {/* Critical alerts */}
      {alertCount > 0 && (
        <div className="mb-3.5">
          <GlassAlertBanner
            type="error"
            title={`${alertCount} critical alert${alertCount === 1 ? "" : "s"}`}
            description="Low stock · overdue invoice · failed payment"
          />
        </div>
      )}

      {/* KPI grid — live client island */}
      <LiveKpiGrid initial={initialKpis} companyId={session.companyId} variant="executive" />

      {/* Revenue chart — last 6 months from real DB data */}
      <GlassCard className="mb-3.5">
        <SectionLabel>Revenue · last 6 months</SectionLabel>
        <div className="flex items-end gap-1 h-[88px]" aria-label="Revenue sparkline">
          {REVENUE_SERIES.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-[3px]"
                style={{
                  height: `${Math.round((v / maxRev) * 72)}px`,
                  background:
                    i === REVENUE_SERIES.length - 1
                      ? "rgba(255,255,255,0.55)"
                      : "rgba(255,255,255,0.14)",
                }}
              />
              <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                {REVENUE_LABELS[i]}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Online Now */}
      <div className="mb-3.5">
        <OnlineNowPanel companyId={session.companyId} />
      </div>

      {/* Pinned Contacts */}
      <PinnedContactsRow />

      {/* Quick Actions */}
      <QuickActionsGrid actions={quickActions} />

      {/* Executive Summary — live financial + operational snapshot */}
      <GlassCard className="mb-3.5">
        <SectionLabel>Situație executivă</SectionLabel>
        <ExecutiveSummaryPanel />
      </GlassCard>

      {/* Recent Activity — live client island seeded with real audit log entries */}
      <LiveActivityFeed initialEntries={INITIAL_ACTIVITY} companyId={session.companyId} />
    </div>
  )
}
