"use client"

import { useState } from "react"
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

// ── Static data ───────────────────────────────────────────────────────────────

const PERIODS: SegmentItem[] = [
  { id: "1w", label: "1W" },
  { id: "1m", label: "1M" },
  { id: "3m", label: "3M" },
  { id: "6m", label: "6M" },
  { id: "1y", label: "1Y" },
]

const CHART_DATA: Record<string, { labels: string[]; actual: number[]; forecast?: number[] }> = {
  "1w": {
    labels:   ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    actual:   [14, 18, 16, 21, 19, 24, 22],
    forecast: [22, 25, 27],
  },
  "1m": {
    labels:   ["W1", "W2", "W3", "W4"],
    actual:   [88, 102, 96, 118],
    forecast: [118, 128],
  },
  "3m": {
    labels:   ["Apr", "May", "Jun"],
    actual:   [340, 412, 482],
    forecast: [482, 534],
  },
  "6m": {
    labels:   ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    actual:   [320, 348, 360, 402, 438, 482],
    forecast: [482, 534],
  },
  "1y": {
    labels:   ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    actual:   [290, 305, 318, 330, 298, 310, 320, 348, 360, 402, 438, 482],
    forecast: [482, 534],
  },
}

const DONUT_SEGMENTS: DonutSegment[] = [
  { label: "Shop",        value: 40 },
  { label: "Renovations", value: 25 },
  { label: "Projects",    value: 20 },
  { label: "Other",       value: 15 },
]

const SPARK = {
  conversion: [3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8],
  avgOrder:   [162, 165, 168, 172, 175, 180, 184],
  churn:      [8, 8, 9, 9, 10, 11, 12],
  aiActions:  [28, 30, 33, 36, 40, 43, 47],
}

const AI_INSIGHTS = [
  {
    title: "Replicate Cluj replenishment",
    description: "Applying Cluj's replenishment cadence to Brașov could lift group margin ~1.8pp. Confidence: 91%.",
  },
  {
    title: "Iași promo push",
    description: "Foot traffic down 23% vs last month. A targeted campaign before Jun 15 is recommended. Confidence: 87%.",
  },
  {
    title: "Worker reallocation",
    description: "2 projects risk slipping this week. Suggest moving 3 workers from Cluj to Timișoara on Thursday.",
  },
]

interface ForecastRow {
  label: string
  value: string
  trend: string
  trendDir: "up" | "down" | "flat"
  pct: number
  color: string
}

const FORECAST_ROWS: ForecastRow[] = [
  { label: "Revenue",     value: "€534K",  trend: "▲ 10.8%", trendDir: "up",   pct: 88, color: "rgba(255,255,255,0.50)" },
  { label: "Orders",      value: "4,280",  trend: "▲ 8.4%",  trendDir: "up",   pct: 76, color: "rgba(10,132,255,0.70)"  },
  { label: "New Clients", value: "148",    trend: "▲ 5.1%",  trendDir: "up",   pct: 62, color: "rgba(191,90,242,0.70)"  },
  { label: "Churn Risk",  value: "12",     trend: "▲ 3",     trendDir: "down",  pct: 28, color: "rgba(255,69,58,0.70)"   },
  { label: "Expenses",    value: "€360K",  trend: "→ +4.7%", trendDir: "flat",  pct: 54, color: "rgba(255,159,10,0.60)"  },
]

interface ReportRow {
  icon: string
  iconColor: string
  name: string
  sub: string
  date: string
  badge: "ready" | "new"
}

const REPORTS: ReportRow[] = [
  { icon: "M3 3v18h18M18 9l-6 6-3-3-6 6",        iconColor: "rgba(255,255,255,0.55)", name: "Monthly Financial Summary",  sub: "Revenue · Profit · Expenses · Tax",   date: "Jun 1",  badge: "ready" },
  { icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75", iconColor: "rgba(255,255,255,0.55)", name: "Workforce Performance",      sub: "Attendance · Productivity · Cost",    date: "Jun 1",  badge: "ready" },
  { icon: "M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z", iconColor: "rgba(10,132,255,0.70)",  name: "Store Performance Index",    sub: "All 18 stores · Jun 2026",            date: "Today",  badge: "new"   },
  { icon: "M12 2a6 6 0 0 1 6 6c0 2.5-1.5 4.7-3.7 5.7L14 16H10l-.3-2.3A6.01 6.01 0 0 1 6 8a6 6 0 0 1 6-6zM10 19h4M11 22h2", iconColor: "rgba(191,90,242,0.70)", name: "AI Insights Digest",          sub: "Anomalies · Recommendations · Risks", date: "Today",  badge: "new"   },
]

const TREND_COLOR = {
  up:   "rgba(48,209,88,0.95)",
  down: "rgba(255,69,58,0.95)",
  flat: "rgba(255,255,255,0.35)",
}

const BADGE_STYLE = {
  ready: { bg: "rgba(48,209,88,0.14)",  color: "rgba(48,209,88,0.95)",  label: "Ready" },
  new:   { bg: "rgba(10,132,255,0.14)", color: "rgba(10,132,255,0.90)", label: "New"   },
}

const MAIN_TABS: TabItem[] = [
  { id: "analytics", label: "Analytics"  },
  { id: "ai",        label: "AI"         },
  { id: "reports",   label: "Reports"    },
  { id: "forecast",  label: "Forecast"   },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mx-1 mt-6 mb-2.5">
      {children}
    </p>
  )
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
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
  const [period, setPeriod]   = useState("3m")
  const [activeTab, setActiveTab] = useState("analytics")

  const chart = CHART_DATA[period]!

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-white/35 text-[13px] font-medium mb-0.5">PRV</p>
          <h1 className="text-white/90 text-[26px] font-semibold tracking-tight leading-tight">Intelligence</h1>
        </div>
        <div
          className="px-3 py-1.5 rounded-[10px] text-[12px] font-medium text-white/60"
          style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
        >
          Live · Jun 2026
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <GlassStatCard label="Conversion"  value="3.8%"  trend={{ direction: "up",   value: "0.4pp"      }} sparkline={SPARK.conversion} />
        <GlassStatCard label="Avg Order"   value="€184"  trend={{ direction: "up",   value: "6.2%"       }} sparkline={SPARK.avgOrder}   />
        <GlassStatCard label="Churn Risk"  value="12"    trend={{ direction: "down", value: "3 accounts" }} sparkline={SPARK.churn}      />
        <GlassStatCard label="AI Actions"  value="47"    trend={{ direction: "flat", value: "this week"  }} sparkline={SPARK.aiActions}  />
      </div>

      {/* Main tabs */}
      <GlassTabs tabs={MAIN_TABS} activeTab={activeTab} onTabChange={setActiveTab} className="mb-4" />

      {/* ── Analytics tab ── */}
      {activeTab === "analytics" && (
        <>
          <GlassSegmentedControl items={PERIODS} activeId={period} onChange={setPeriod} fullWidth className="mb-4" />

          {/* Revenue trend area chart */}
          <GlassCard className="p-4 mb-3.5">
            <GlassAreaChart
              series={[
                { label: "Revenue",  data: chart.actual   },
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
                segments={DONUT_SEGMENTS}
                size={140}
                centerLabel="Total"
                centerValue="€482K"
                showLegend
                animated
              />
            </div>
          </GlassCard>
        </>
      )}

      {/* ── AI tab ── */}
      {activeTab === "ai" && (
        <>
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
                style={{ background: "linear-gradient(135deg, rgba(191,90,242,0.8), rgba(10,132,255,0.8))" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
              <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest">AI Analysis · Updated 4 min ago</p>
            </div>
            <p className="text-[13px] text-white/65 leading-relaxed mb-2">
              Revenue is tracking <span className="text-white/95 font-semibold">+12% MoM</span>. Cluj is your top-margin store at <span className="text-white/95 font-semibold">39%</span>.
            </p>
            <p className="text-[13px] text-white/65 leading-relaxed">
              Iași shows a <span className="text-white/95 font-semibold">23% drop in foot traffic</span>. <span className="text-white/95 font-semibold">2 projects</span> risk slipping this week due to understaffing.
            </p>
          </div>

          <Label>AI Recommendations</Label>
          <div className="flex flex-col gap-3">
            {AI_INSIGHTS.map((insight) => (
              <GlassAIPromptCard
                key={insight.title}
                variant="card"
                title={insight.title}
                description={insight.description}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Reports tab ── */}
      {activeTab === "reports" && (
        <>
          <Label>Available Reports</Label>
          <GlassCard>
            {REPORTS.map((r) => {
              const b = BADGE_STYLE[r.badge]
              return (
                <div
                  key={r.name}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: "1px solid var(--prv-border-subtle)" }}
                >
                  <div
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                    style={{ background: "var(--prv-g2)" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={r.iconColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d={r.icon} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-white/90 truncate">{r.name}</p>
                    <p className="text-[12px] text-white/35 mt-0.5">{r.sub}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-white/35">{r.date}</p>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px] mt-1 inline-block"
                      style={{ background: b.bg, color: b.color }}
                    >
                      {b.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </GlassCard>
        </>
      )}

      {/* ── Forecast tab ── */}
      {activeTab === "forecast" && (
        <>
          <Label>AI Forecast · Next 30 Days</Label>
          <GlassCard>
            {FORECAST_ROWS.map((row) => (
              <div
                key={row.label}
                className="flex items-center gap-3 px-4 py-3.5"
                style={{ borderBottom: "1px solid var(--prv-border-subtle)" }}
              >
                <p className="text-[13px] font-semibold text-white/90 w-24 shrink-0">{row.label}</p>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--prv-g2)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${row.pct}%`, background: row.color }}
                  />
                </div>
                <p className="text-[13px] font-bold text-white/90 w-16 text-right shrink-0">{row.value}</p>
                <p className="text-[11px] font-semibold w-16 text-right shrink-0" style={{ color: TREND_COLOR[row.trendDir] }}>
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
