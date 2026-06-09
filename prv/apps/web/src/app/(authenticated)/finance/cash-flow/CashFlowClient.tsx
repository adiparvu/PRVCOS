"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { GlassAreaChart, GlassSegmentedControl, type SegmentItem } from "@prv/ui"
import type {
  CashFlowEntry,
  CashFlowCategory,
  CashFlowMeta,
} from "@/app/api/finance/cash-flow/route"

// ── Static data ───────────────────────────────────────────────────────────────

const PERIOD_ITEMS: SegmentItem[] = [
  { id: "30", label: "30d" },
  { id: "60", label: "60d" },
  { id: "90", label: "90d" },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1000000) return `€${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `€${(n / 1000).toFixed(0)}K`
  return `€${n}`
}

function fmtFull(n: number): string {
  return `€${n.toLocaleString("ro-RO")}`
}

function sampleEvery(arr: CashFlowEntry[], n: number): CashFlowEntry[] {
  if (arr.length <= n) return arr
  const step = Math.ceil(arr.length / n)
  return arr.filter((_, i) => i % step === 0 || i === arr.length - 1)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiTile({
  value,
  label,
  color,
  sub,
}: {
  value: string
  label: string
  color: string
  sub?: string
}) {
  return (
    <div
      className="py-3 px-3 rounded-[14px] flex flex-col"
      style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
    >
      <p className="text-[17px] font-bold leading-tight" style={{ color }}>
        {value}
      </p>
      <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mt-1">
        {label}
      </p>
      {sub && <p className="text-[11px] text-white/30 mt-0.5">{sub}</p>}
    </div>
  )
}

function CategoryBar({ cat, max }: { cat: CashFlowCategory; max: number }) {
  const pct = Math.round((cat.amount / max) * 100)
  const color = cat.type === "in" ? "rgba(48,209,88,0.85)" : "rgba(255,69,58,0.75)"
  const bg = cat.type === "in" ? "rgba(48,209,88,0.10)" : "rgba(255,69,58,0.08)"
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[13px] font-medium text-white/75 truncate">{cat.label}</span>
          <span className="text-[13px] font-bold ml-2 shrink-0" style={{ color }}>
            {cat.type === "out" ? "-" : "+"}
            {fmt(cat.amount)}
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: bg }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function CashFlowClient() {
  const [period, setPeriod] = useState("30")
  const [showForecast, setShowForecast] = useState(true)
  const [periodEntries, setPeriodEntries] = useState<CashFlowEntry[]>([])
  const [forecastEntries, setForecastEntries] = useState<CashFlowEntry[]>([])
  const [categories, setCategories] = useState<CashFlowCategory[]>([])
  const [apiMeta, setApiMeta] = useState<CashFlowMeta | null>(null)

  useEffect(() => {
    fetch(`/api/finance/cash-flow?period=${period}`)
      .then((r) => r.json())
      .then(
        (data: {
          periodEntries: CashFlowEntry[]
          forecastEntries: CashFlowEntry[]
          categories: CashFlowCategory[]
          meta: CashFlowMeta
        }) => {
          setPeriodEntries(data.periodEntries ?? [])
          setForecastEntries(data.forecastEntries ?? [])
          setCategories(data.categories ?? [])
          setApiMeta(data.meta ?? null)
        }
      )
      .catch(() => {})
  }, [period])

  const totalIn = apiMeta?.totalIn ?? 0
  const totalOut = apiMeta?.totalOut ?? 0
  const net = apiMeta?.net ?? 0
  const currentBalance = apiMeta?.currentBalance ?? 0
  const runwayDays = apiMeta?.runwayDays ?? 0
  const avgMonthlyBurn = apiMeta?.avgMonthlyBurn ?? 0
  const forecastBalance30 = apiMeta?.forecastBalance30d ?? 0

  const histBalances = periodEntries.map((e) => e.balance)

  const histSampled = sampleEvery(periodEntries, 22)
  const foreSampled = showForecast ? sampleEvery(forecastEntries, 8) : []

  const combined = [...histSampled, ...foreSampled]
  const labels = combined.map((e) =>
    new Date(e.date).toLocaleDateString("ro-RO", { day: "numeric", month: "short" })
  )
  const balanceData = combined.map((e) => e.balance)

  const maxBar = Math.max(...categories.map((c) => c.amount), 1)
  const inCategories = categories.filter((c) => c.type === "in")
  const outCategories = categories.filter((c) => c.type === "out")

  const minBal = histBalances.length > 0 ? Math.min(...histBalances) : 0
  const maxBal = histBalances.length > 0 ? Math.max(...histBalances) : 0

  const isNegativeNet = net < 0

  const inflowSampled = sampleEvery(periodEntries, 22)
  const inflowData = inflowSampled.map((e) => e.inflow)
  const outflowData = inflowSampled.map((e) => e.outflow)
  const inOutLabels = inflowSampled.map((e) =>
    new Date(e.date).toLocaleDateString("ro-RO", { day: "numeric", month: "short" })
  )

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <Link
            href="/finance"
            className="text-white/35 text-[13px] font-medium mb-0.5 flex items-center gap-1"
            style={{ textDecoration: "none" }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Finanțe
          </Link>
          <h1 className="text-white/90 text-[26px] font-semibold tracking-tight leading-tight">
            Cash Flow
          </h1>
        </div>
        <button
          onClick={() => setShowForecast((v) => !v)}
          className="px-3 h-9 rounded-[10px] text-[12px] font-semibold flex items-center gap-1.5"
          style={{
            background: showForecast ? "rgba(10,132,255,0.15)" : "var(--prv-g1)",
            border: `1px solid ${showForecast ? "rgba(10,132,255,0.3)" : "var(--prv-border-subtle)"}`,
            color: showForecast ? "rgba(10,132,255,0.9)" : "var(--prv-text-2)",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
          Forecast
        </button>
      </div>

      {/* Balance hero */}
      <div
        className="p-5 rounded-[20px] mb-4 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(10,132,255,0.12) 0%, rgba(48,209,88,0.08) 100%)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
        }}
      >
        <p className="text-[12px] font-semibold text-white/40 uppercase tracking-widest mb-1">
          Current Balance
        </p>
        <p className="text-[36px] font-bold text-white/95 leading-none mb-1">
          {fmtFull(currentBalance)}
        </p>
        <div className="flex items-center gap-1.5">
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: isNegativeNet ? "rgba(255,69,58,0.2)" : "rgba(48,209,88,0.2)" }}
          >
            <svg
              width="8"
              height="8"
              viewBox="0 0 24 24"
              fill="none"
              stroke={isNegativeNet ? "rgba(255,69,58,0.9)" : "rgba(48,209,88,0.9)"}
              strokeWidth="3"
              strokeLinecap="round"
            >
              <path d={isNegativeNet ? "M17 7l-12 12M7 7h10v10" : "M7 17l12-12M17 7v10H7"} />
            </svg>
          </div>
          <span
            className="text-[13px] font-semibold"
            style={{ color: isNegativeNet ? "rgba(255,69,58,0.9)" : "rgba(48,209,88,0.9)" }}
          >
            {isNegativeNet ? "" : "+"}
            {fmt(net)}
          </span>
          <span className="text-[13px] text-white/40">net {period}d · </span>
          <span className="text-[13px] text-white/40">{runwayDays}d runway</span>
        </div>
      </div>

      {/* Period selector */}
      <GlassSegmentedControl
        items={PERIOD_ITEMS}
        activeId={period}
        onChange={setPeriod}
        fullWidth
        className="mb-4"
      />

      {/* Balance chart */}
      <div
        className="rounded-[18px] mb-4 overflow-hidden"
        style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
      >
        <div className="px-4 pt-4 pb-1">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[13px] font-semibold text-white/75">Balance</p>
            {showForecast && (
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: "rgba(255,255,255,0.3)" }}
                />
                <span className="text-[11px] text-white/35">Forecast</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-white/30">Min {fmt(minBal)}</span>
            <span className="text-[11px] text-white/30">Max {fmt(maxBal)}</span>
          </div>
        </div>
        <GlassAreaChart
          series={[
            {
              label: "Balance",
              color: "rgba(48,209,88,0.85)",
              data: balanceData,
            },
          ]}
          labels={labels}
          height={180}
          animated
        />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <KpiTile value={fmt(totalIn)} label={`In · ${period}d`} color="rgba(48,209,88,0.95)" />
        <KpiTile value={fmt(totalOut)} label={`Out · ${period}d`} color="rgba(255,69,58,0.9)" />
        <KpiTile value={fmt(avgMonthlyBurn)} label="Monthly Burn" color="rgba(255,159,10,0.95)" />
        <KpiTile
          value={showForecast ? fmt(forecastBalance30) : "—"}
          label="Forecast 30d"
          color="rgba(10,132,255,0.9)"
          sub={showForecast ? "projected" : "toggle forecast"}
        />
      </div>

      {/* In/Out area chart */}
      <div
        className="rounded-[18px] mb-4 overflow-hidden"
        style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
      >
        <div className="px-4 pt-4 pb-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: "rgba(48,209,88,0.85)" }}
              />
              <span className="text-[12px] text-white/55">Inflows</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: "rgba(255,69,58,0.75)" }}
              />
              <span className="text-[12px] text-white/55">Outflows</span>
            </div>
          </div>
        </div>
        <GlassAreaChart
          series={[
            { label: "Inflows", color: "rgba(48,209,88,0.7)", data: inflowData },
            { label: "Outflows", color: "rgba(255,69,58,0.55)", data: outflowData },
          ]}
          labels={inOutLabels}
          height={140}
          animated
        />
      </div>

      {/* Category breakdown */}
      <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mx-1 mt-2 mb-2.5">
        Breakdown
      </p>

      <div
        className="rounded-[18px] mb-3 px-4 pt-2 pb-1 overflow-hidden"
        style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
      >
        <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest pt-2 mb-1">
          Inflows
        </p>
        {inCategories.map((cat) => (
          <CategoryBar key={cat.label} cat={cat} max={maxBar} />
        ))}
      </div>

      <div
        className="rounded-[18px] px-4 pt-2 pb-1 overflow-hidden"
        style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
      >
        <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest pt-2 mb-1">
          Outflows
        </p>
        {outCategories.map((cat) => (
          <CategoryBar key={cat.label} cat={cat} max={maxBar} />
        ))}
      </div>
    </div>
  )
}
