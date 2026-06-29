"use client"

import { useState } from "react"
import Link from "next/link"
import {
  GlassStatCard,
  GlassAreaChart,
  GlassDonutChart,
  GlassSegmentedControl,
  GlassTabs,
  GlassAIPromptCard,
  type SegmentItem,
  type TabItem,
  type DonutSegment,
} from "@prv/ui"
import { useIntelligence, useForecastMetrics, useAnalyticsMetrics } from "@/lib/api-hooks"

// ── Static display data ───────────────────────────────────────────────────────

const PERIODS: SegmentItem[] = [
  { id: "1w", label: "1W" },
  { id: "1m", label: "1M" },
  { id: "3m", label: "3M" },
  { id: "6m", label: "6M" },
  { id: "1y", label: "1Y" },
]

// Fallback shape used until /api/intelligence/analytics-metrics resolves.
const CHART_DATA: Record<string, { labels: string[]; actual: number[]; forecast?: number[] }> = {
  "1w": {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    actual: [14, 18, 16, 21, 19, 24, 22],
    forecast: [22, 25, 27],
  },
  "1m": {
    labels: ["W1", "W2", "W3", "W4"],
    actual: [88, 102, 96, 118],
    forecast: [118, 128],
  },
  "3m": {
    labels: ["Apr", "May", "Jun"],
    actual: [340, 412, 482],
    forecast: [482, 534],
  },
  "6m": {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    actual: [320, 348, 360, 402, 438, 482],
    forecast: [482, 534],
  },
  "1y": {
    labels: ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    actual: [290, 305, 318, 330, 298, 310, 320, 348, 360, 402, 438, 482],
    forecast: [482, 534],
  },
}

// Fallback breakdown until /api/intelligence/analytics-metrics resolves.
const DONUT_SEGMENTS: DonutSegment[] = [
  { label: "Shop", value: 40 },
  { label: "Renovations", value: 25 },
  { label: "Projects", value: 20 },
  { label: "Other", value: 15 },
]

// Fallback sparklines until /api/intelligence/analytics-metrics resolves.
const SPARK = {
  revenue: [12, 14, 13, 16, 15, 18, 17],
  avgOrder: [162, 165, 168, 172, 175, 180, 184],
  orders: [8, 9, 7, 11, 10, 13, 12],
  alerts: [2, 1, 2, 3, 2, 1, 2],
}

// ── Icon / badge maps for reports ─────────────────────────────────────────────

const REPORT_TYPE_ICON: Record<string, { path: string; color: string }> = {
  monthly: {
    path: "M3 3v18h18M18 9l-6 6-3-3-6 6",
    color: "var(--prv-text-2)",
  },
  performance: {
    path: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    color: "var(--prv-text-2)",
  },
  inventory: {
    path: "M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z",
    color: "rgba(10,132,255,0.70)",
  },
  forecast: {
    path: "M12 2a6 6 0 0 1 6 6c0 2.5-1.5 4.7-3.7 5.7L14 16H10l-.3-2.3A6.01 6.01 0 0 1 6 8a6 6 0 0 1 6-6zM10 19h4M11 22h2",
    color: "rgba(191,90,242,0.70)",
  },
}

const REPORT_STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  ready: { bg: "rgba(48,209,88,0.14)", color: "rgba(48,209,88,0.95)", label: "Ready" },
  pending: { bg: "rgba(255,159,10,0.14)", color: "rgba(255,159,10,0.95)", label: "Pending" },
  scheduled: { bg: "rgba(10,132,255,0.14)", color: "rgba(10,132,255,0.90)", label: "Scheduled" },
}

// Per-label bar colour for the forecast rows (kept client-side; the values,
// trends and progress come from /api/intelligence/forecast-metrics).
const FORECAST_COLOR: Record<string, string> = {
  Revenue: "var(--prv-text-2)",
  Orders: "rgba(10,132,255,0.70)",
  "New Clients": "rgba(191,90,242,0.70)",
  "Churn Risk": "rgba(255,69,58,0.70)",
  Expenses: "rgba(255,159,10,0.60)",
}

const TREND_COLOR = {
  up: "rgba(48,209,88,0.95)",
  down: "rgba(255,69,58,0.95)",
  flat: "var(--prv-text-3)",
}

const MAIN_TABS: TabItem[] = [
  { value: "analytics", label: "Analytics" },
  { value: "ai", label: "AI" },
  { value: "reports", label: "Reports" },
  { value: "forecast", label: "Forecast" },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mx-1 mt-6 mb-2.5">
      {children}
    </p>
  )
}

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-[18px] relative overflow-hidden ${className}`}
      style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
    >
      {children}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function IntelligenceWorkspace() {
  const [period, setPeriod] = useState("3m")
  const [activeTab, setActiveTab] = useState("analytics")

  const { data, isLoading } = useIntelligence()
  const { data: forecastData } = useForecastMetrics()
  const { data: analytics } = useAnalyticsMetrics()

  const spark = analytics?.spark ?? SPARK
  const donutSegments = analytics?.donut?.length ? analytics.donut : DONUT_SEGMENTS

  const forecastRows = (forecastData?.metrics ?? []).map((m) => ({
    ...m,
    color: FORECAST_COLOR[m.label] ?? "var(--prv-text-2)",
  }))

  const chart = analytics?.chart?.[period] ?? CHART_DATA[period]!

  const insights = data?.insights ?? []
  const reports = data?.reports ?? []
  const storeKpis = data?.storeKpis ?? []
  const meta = data?.meta

  // When the donut is real, its centre total must match the slices (same 90-day
  // window); fall back to the company-wide revenue label otherwise.
  const donutCenter = analytics?.donut?.length
    ? analytics.donutTotalLabel
    : (meta?.totalRevenueLabel ?? "—")

  // Derive recommendation-type insights for the AI tab
  const aiRecommendations = insights.filter((i) => i.type === "recommendation")

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-white/35 text-[13px] font-medium mb-0.5">PRV</p>
          <h1 className="text-white/90 text-[26px] font-semibold tracking-tight leading-tight">
            Intelligence
          </h1>
        </div>
        <div
          className="px-3 py-1.5 rounded-[10px] text-[12px] font-medium text-white/60"
          style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
        >
          Live · Jun 2026
        </div>
      </div>

      {/* KPI grid — wired to IntelligenceMeta */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <GlassStatCard
          label="Total Revenue"
          value={isLoading ? "…" : (meta?.totalRevenueLabel ?? "—")}
          trend={
            meta?.revenueTrend && meta.revenueTrend !== "—"
              ? { direction: "up", value: meta.revenueTrend }
              : undefined
          }
          sparkline={spark.revenue}
        />
        <GlassStatCard
          label="Avg Margin"
          value={isLoading ? "…" : meta ? `${meta.avgMarginPct}%` : "—"}
          trend={
            meta?.marginTrend && meta.marginTrend !== "—"
              ? { direction: "up", value: meta.marginTrend }
              : undefined
          }
          sparkline={spark.avgOrder}
        />
        <GlassStatCard
          label="Orders Today"
          value={isLoading ? "…" : String(meta?.ordersToday ?? 0)}
          trend={{ direction: "flat", value: "today" }}
          sparkline={spark.orders}
        />
        <GlassStatCard
          label="Active Alerts"
          value={isLoading ? "…" : String(meta?.activeAlerts ?? 0)}
          trend={
            (meta?.activeAlerts ?? 0) > 0 ? { direction: "down", value: "need review" } : undefined
          }
          sparkline={spark.alerts}
        />
      </div>

      {/* Main tabs */}
      <GlassTabs tabs={MAIN_TABS} value={activeTab} onChange={setActiveTab} className="mb-4" />

      {/* ── Analytics tab ── */}
      {activeTab === "analytics" && (
        <>
          <GlassSegmentedControl
            items={PERIODS}
            activeId={period}
            onChange={setPeriod}
            fullWidth
            className="mb-4"
          />

          {/* Revenue trend area chart — real orders via /api/intelligence/analytics-metrics */}
          <GlassCard className="p-4 mb-3.5">
            <GlassAreaChart
              series={[
                { label: "Revenue", data: chart.actual },
                { label: "Forecast", data: chart.forecast ?? [] },
              ]}
              labels={[...chart.labels, ...(chart.forecast ? ["→"] : [])]}
              height={180}
              legend
              animated
            />
          </GlassCard>

          {/* Revenue breakdown donut */}
          <GlassCard className="mb-3.5">
            <div className="p-4">
              <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mb-4">
                Revenue Breakdown
              </p>
              <GlassDonutChart
                segments={donutSegments}
                size={140}
                centerLabel="Total"
                centerValue={isLoading ? "…" : donutCenter}
                showLegend
                animated
              />
            </div>
          </GlassCard>

          {/* Store KPIs — wired to StoreKpi[] */}
          {storeKpis.length > 0 && (
            <>
              <Label>Store Performance · Today</Label>
              <GlassCard>
                {storeKpis.map((store) => (
                  <div
                    key={store.storeId}
                    className="flex items-center gap-3 px-4 py-3.5"
                    style={{ borderBottom: "1px solid var(--prv-border-subtle)" }}
                  >
                    <p className="text-[13px] font-semibold text-white/90 w-28 shrink-0 truncate">
                      {store.storeName}
                    </p>
                    <div
                      className="flex-1 h-1.5 rounded-full overflow-hidden"
                      style={{ background: "var(--prv-g2)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${store.revenueBarPct}%`,
                          background: "var(--prv-text-2)",
                        }}
                      />
                    </div>
                    <p className="text-[13px] font-bold text-white/90 w-16 text-right shrink-0">
                      {store.revenueTodayLabel}
                    </p>
                  </div>
                ))}
              </GlassCard>
            </>
          )}
        </>
      )}

      {/* ── AI tab ── */}
      {activeTab === "ai" && (
        <>
          {/* Deep-dive entry point */}
          <Link
            href="/intelligence/ai"
            className="flex items-center justify-between px-4 py-3.5 rounded-[16px] mb-4 relative overflow-hidden"
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
            }}
          >
            <div
              className="absolute inset-x-0 top-0 h-px"
              style={{
                background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)",
              }}
            />
            <div>
              <p className="text-[11px] font-bold text-white/35 uppercase tracking-[.08em] mb-0.5">
                Full AI Briefing
              </p>
              <p className="text-[15px] font-semibold text-white/88">
                Morning Brief · Signals · Ask AI · Forecast
              </p>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white/30 flex-shrink-0"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>

          {/* AI header card */}
          <div
            className="p-4 rounded-[18px] mb-4 relative overflow-hidden"
            style={{
              background:
                "radial-gradient(circle at 0% 0%, rgba(191,90,242,0.12), transparent 55%), radial-gradient(circle at 100% 100%, rgba(10,132,255,0.10), transparent 55%), var(--prv-g1)",
              border: "1px solid rgba(191,90,242,0.20)",
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, rgba(191,90,242,0.8), rgba(10,132,255,0.8))",
                }}
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
                  <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest">
                AI Analysis · {isLoading ? "Loading…" : `${insights.length} signals`}
              </p>
            </div>
            {isLoading ? (
              <p className="text-[13px] text-white/40 leading-relaxed">Loading intelligence…</p>
            ) : (
              <>
                <p className="text-[13px] text-white/65 leading-relaxed mb-2">
                  {meta ? (
                    <>
                      Revenue today:{" "}
                      <span className="text-white/95 font-semibold">{meta.totalRevenueLabel}</span>.
                      Avg margin:{" "}
                      <span className="text-white/95 font-semibold">{meta.avgMarginPct}%</span>.
                    </>
                  ) : (
                    "No revenue data available."
                  )}
                </p>
                <p className="text-[13px] text-white/65 leading-relaxed">
                  {meta?.activeAlerts ?? 0} active alert
                  {(meta?.activeAlerts ?? 0) !== 1 ? "s" : ""} ·{" "}
                  <span className="text-white/95 font-semibold">
                    {meta?.ordersToday ?? 0} orders
                  </span>{" "}
                  today.
                </p>
              </>
            )}
          </div>

          <Label>AI Recommendations</Label>
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-[18px] animate-pulse"
                  style={{ background: "var(--prv-g1)" }}
                />
              ))}
            </div>
          ) : aiRecommendations.length > 0 ? (
            <div className="flex flex-col gap-3">
              {aiRecommendations.map((insight) => (
                <GlassAIPromptCard
                  key={insight.id}
                  variant="card"
                  title={insight.title}
                  description={insight.summary}
                />
              ))}
            </div>
          ) : insights.length > 0 ? (
            // Fall back to showing all insights if no recommendations specifically
            <div className="flex flex-col gap-3">
              {insights.slice(0, 5).map((insight) => (
                <GlassAIPromptCard
                  key={insight.id}
                  variant="card"
                  title={insight.title}
                  description={insight.summary}
                />
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-white/35 mx-1">No recommendations at this time.</p>
          )}
        </>
      )}

      {/* ── Reports tab ── */}
      {activeTab === "reports" && (
        <>
          <Label>Available Reports</Label>
          {isLoading ? (
            <GlassCard>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: "1px solid var(--prv-border-subtle)" }}
                >
                  <div
                    className="w-9 h-9 rounded-[10px] animate-pulse shrink-0"
                    style={{ background: "var(--prv-g2)" }}
                  />
                  <div className="flex-1 space-y-1.5">
                    <div
                      className="h-3 w-40 rounded animate-pulse"
                      style={{ background: "var(--prv-g2)" }}
                    />
                    <div
                      className="h-2.5 w-28 rounded animate-pulse"
                      style={{ background: "var(--prv-g2)" }}
                    />
                  </div>
                </div>
              ))}
            </GlassCard>
          ) : reports.length > 0 ? (
            <GlassCard>
              {reports.map((r) => {
                const icon = REPORT_TYPE_ICON[r.type] ?? REPORT_TYPE_ICON.monthly!
                const badge = REPORT_STATUS_BADGE[r.status] ?? REPORT_STATUS_BADGE.ready!
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ borderBottom: "1px solid var(--prv-border-subtle)" }}
                  >
                    <div
                      className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                      style={{ background: "var(--prv-g2)" }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={icon.color}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d={icon.path} />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-white/90 truncate">{r.title}</p>
                      <p className="text-[12px] text-white/35 mt-0.5">
                        {r.pages} pages · {r.generatedDate}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] text-white/35">{r.generatedDate}</p>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px] mt-1 inline-block"
                        style={{ background: badge.bg, color: badge.color }}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </GlassCard>
          ) : (
            <p className="text-[13px] text-white/35 mx-1">No reports available.</p>
          )}
        </>
      )}

      {/* ── Forecast tab ── */}
      {activeTab === "forecast" && (
        <>
          <Label>AI Forecast · Next 30 Days</Label>
          <GlassCard>
            {forecastRows.length === 0 && (
              <p className="px-4 py-6 text-[13px] text-white/35 text-center">
                No forecast data available yet.
              </p>
            )}
            {forecastRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center gap-3 px-4 py-3.5"
                style={{ borderBottom: "1px solid var(--prv-border-subtle)" }}
              >
                <p className="text-[13px] font-semibold text-white/90 w-24 shrink-0">{row.label}</p>
                <div
                  className="flex-1 h-1.5 rounded-full overflow-hidden"
                  style={{ background: "var(--prv-g2)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${row.pct}%`, background: row.color }}
                  />
                </div>
                <p className="text-[13px] font-bold text-white/90 w-16 text-right shrink-0">
                  {row.value}
                </p>
                <p
                  className="text-[11px] font-semibold w-16 text-right shrink-0"
                  style={{ color: TREND_COLOR[row.trendDir] }}
                >
                  {row.trend}
                </p>
              </div>
            ))}
          </GlassCard>
        </>
      )}
    </div>
  )
}
