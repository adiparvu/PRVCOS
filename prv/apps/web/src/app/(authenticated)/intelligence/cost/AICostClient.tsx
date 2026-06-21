"use client"

import { useEffect, useState } from "react"

// ── Types ──────────────────────────────────────────────────────────────────────

interface AgentUsage {
  agentType: string
  tokens: number
  messages: number
  percentage: number
}

interface DailyUsage {
  date: string
  tokens: number
  messages: number
}

interface CostData {
  totalTokens: number
  estimatedCost: number
  totalMessages: number
  model: string
  agentBreakdown: AgentUsage[]
  dailyUsage: DailyUsage[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function GlassCard({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={`rounded-[18px] relative overflow-hidden ${className}`}
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        ...style,
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)",
        }}
      />
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[.1em] text-white/30 mx-1 mt-5 mb-2">
      {children}
    </p>
  )
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatCost(eur: number): string {
  return `€${eur.toFixed(2)}`
}

const AGENT_LABELS: Record<string, string> = {
  general: "General",
  finance: "Finance",
  hr: "HR",
  project: "Projects",
  renovation: "Renovation",
  report_builder: "Report Builder",
}

// ── Sparkline SVG ──────────────────────────────────────────────────────────────

function Sparkline({ data }: { data: DailyUsage[] }) {
  if (!data.length) return null

  const W = 300
  const H = 48
  const PAD = 4

  const values = data.map((d) => d.tokens)
  const max = Math.max(...values) || 1
  const min = Math.min(...values)
  const range = max - min || 1

  function px(i: number) {
    return PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2)
  }
  function py(v: number) {
    return H - PAD - ((v - min) / range) * (H - PAD * 2)
  }

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${px(i)},${py(d.tokens)}`).join(" ")

  const areaPath = linePath + ` L${px(data.length - 1)},${H - PAD} L${px(0)},${H - PAD} Z`

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkGrad)" />
      <path
        d={linePath}
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((d, i) => (
        <text
          key={d.date}
          x={px(i)}
          y={H + 2}
          fontSize="7"
          fill="rgba(255,255,255,0.25)"
          fontFamily="system-ui"
          textAnchor="middle"
          dominantBaseline="hanging"
        >
          {d.date.slice(-2)}
        </text>
      ))}
    </svg>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-[8px] animate-pulse ${className}`}
      style={{ background: "rgba(255,255,255,0.07)" }}
    />
  )
}

// ── Root Client ────────────────────────────────────────────────────────────────

export function AICostClient({ role: _role }: { role: string }) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const monthLabel = now.toLocaleString("default", { month: "long" })

  const [data, setData] = useState<CostData | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch(`/api/intelligence/cost?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [year, month])

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-white/35 text-[13px] font-medium mb-0.5">Intelligence</p>
          <h1 className="text-white/92 text-[26px] font-bold tracking-tight leading-tight">
            AI Usage
          </h1>
        </div>
        <div
          className="px-3 py-1.5 rounded-[100px] text-[11px] font-semibold text-white/50"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {monthLabel} {year}
        </div>
      </div>

      {/* KPI row */}
      {!loaded ? (
        <div className="grid grid-cols-3 gap-2.5 mb-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-[18px] p-4"
              style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
            >
              <Skeleton className="h-2.5 w-12 mb-3" />
              <Skeleton className="h-5 w-16 mb-2" />
              <Skeleton className="h-2 w-10" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5 mb-1">
          {[
            {
              label: "Tokens",
              value: data ? formatTokens(data.totalTokens) : "—",
              sub: "this month",
            },
            {
              label: "Cost",
              value: data ? formatCost(data.estimatedCost) : "—",
              sub: "estimated",
            },
            {
              label: "Messages",
              value: data ? String(data.totalMessages) : "—",
              sub: "total",
            },
          ].map((kpi) => (
            <GlassCard key={kpi.label} className="p-3.5">
              <p className="text-[9px] font-bold uppercase tracking-[.09em] text-white/30 mb-1.5">
                {kpi.label}
              </p>
              <p className="text-[18px] font-bold text-white/92 leading-none tracking-tight mb-1">
                {kpi.value}
              </p>
              <p className="text-[9px] text-white/30">{kpi.sub}</p>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Usage by Agent */}
      <SectionLabel>Usage by Agent</SectionLabel>
      <GlassCard className="mb-1 p-4">
        {!loaded ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <div className="flex justify-between mb-1.5">
                  <Skeleton className="h-2.5 w-20" />
                  <Skeleton className="h-2.5 w-12" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        ) : !data?.agentBreakdown?.length ? (
          <p className="text-[12px] text-white/35 text-center py-4">No data available</p>
        ) : (
          <div className="flex flex-col gap-3.5">
            {data.agentBreakdown.map((agent) => (
              <div key={agent.agentType}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[12px] font-semibold text-white/70">
                    {AGENT_LABELS[agent.agentType] ?? agent.agentType}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-medium text-white/40">
                      {formatTokens(agent.tokens)}
                    </p>
                    <p className="text-[10px] font-bold text-white/25">{agent.percentage}%</p>
                  </div>
                </div>
                <div
                  className="w-full rounded-full overflow-hidden"
                  style={{
                    height: "4px",
                    background: "rgba(255,255,255,0.07)",
                  }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${agent.percentage}%`,
                      background: "rgba(255,255,255,0.55)",
                      transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Daily sparkline */}
      <SectionLabel>Daily Usage · Last 7 Days</SectionLabel>
      <GlassCard className="mb-1 px-4 pt-4 pb-6">
        {!loaded ? (
          <Skeleton className="h-12 w-full" />
        ) : data?.dailyUsage?.length ? (
          <Sparkline data={data.dailyUsage.slice(-7)} />
        ) : (
          <p className="text-[12px] text-white/35 text-center py-3">No data available</p>
        )}
      </GlassCard>

      {/* Model row */}
      <SectionLabel>Model</SectionLabel>
      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-white/80">
              {loaded && data ? data.model : "—"}
            </p>
            <p className="text-[11px] text-white/35 mt-0.5">Active model</p>
          </div>
          <div
            className="px-2.5 py-1 rounded-[100px] text-[10px] font-semibold text-white/40"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            All usage
          </div>
        </div>
      </GlassCard>

      <style>{`
        @keyframes pulse-bg { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>
    </div>
  )
}
