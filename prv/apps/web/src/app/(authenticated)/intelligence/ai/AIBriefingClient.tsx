"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { GlassTabs, type TabItem } from "@prv/ui"

// ── Types ─────────────────────────────────────────────────────────────────────

interface KpiValue {
  value: string | number
  trend: string
  dir: "up" | "down" | "flat"
}

interface BriefingAlert {
  type: "error" | "warning" | "info"
  title: string
  description: string
  href: string
}

interface BriefingData {
  greeting: string
  kpis: {
    revenue: KpiValue
    profit: KpiValue
    staffIn: KpiValue
    activeJobs: KpiValue
  }
  alerts: BriefingAlert[]
  recommendation: {
    badge: string
    text: string
    ctaLabel: string
    ctaHref: string
  }
}

interface Anomaly {
  type: "risk" | "spike" | "opportunity"
  severity: "high" | "medium" | "low"
  domain: string
  title: string
  description: string
  metric: string
  actionLabel: string
  href: string
}

interface ForecastPoint {
  month: string
  actual?: number
  forecast?: number
  lower?: number
  upper?: number
}

interface Risk {
  domain: string
  level: "low" | "medium" | "high"
}

interface Opportunity {
  title: string
  value: string
  href: string
}

interface ForecastData {
  confidence: number
  series: ForecastPoint[]
  risks: Risk[]
  opportunities: Opportunity[]
}

interface ChatMessage {
  role: "user" | "ai"
  text: string
  streaming?: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const ALERT_STYLE = {
  error: {
    bg: "rgba(255,69,58,0.07)",
    border: "rgba(255,69,58,0.14)",
    icon: "⚠",
    iconBg: "rgba(255,69,58,0.18)",
  },
  warning: {
    bg: "rgba(255,159,10,0.07)",
    border: "rgba(255,159,10,0.14)",
    icon: "↓",
    iconBg: "rgba(255,159,10,0.18)",
  },
  info: {
    bg: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.1)",
    icon: "i",
    iconBg: "rgba(255,255,255,0.1)",
  },
}

const ANOMALY_STYLE = {
  risk: {
    bg: "rgba(255,69,58,0.07)",
    border: "rgba(255,69,58,0.14)",
    typeColor: "rgba(255,69,58,0.8)",
    prefix: "⚠ Risk",
  },
  spike: {
    bg: "rgba(255,159,10,0.07)",
    border: "rgba(255,159,10,0.14)",
    typeColor: "rgba(255,159,10,0.8)",
    prefix: "↑ Spike",
  },
  opportunity: {
    bg: "rgba(48,209,88,0.07)",
    border: "rgba(48,209,88,0.14)",
    typeColor: "rgba(48,209,88,0.8)",
    prefix: "✓ Opportunity",
  },
}

const RISK_STYLE = {
  low: {
    badge: "rgba(48,209,88,0.14)",
    text: "rgba(48,209,88,0.9)",
    dot: "rgba(48,209,88,0.8)",
    label: "LOW",
  },
  medium: {
    badge: "rgba(255,159,10,0.14)",
    text: "rgba(255,159,10,0.9)",
    dot: "rgba(255,159,10,0.8)",
    label: "MEDIUM",
  },
  high: {
    badge: "rgba(255,69,58,0.14)",
    text: "rgba(255,69,58,0.9)",
    dot: "rgba(255,69,58,0.8)",
    label: "HIGH",
  },
}

const TREND_COLOR = {
  up: "rgba(48,209,88,0.9)",
  down: "rgba(255,69,58,0.9)",
  flat: "rgba(255,255,255,0.35)",
}

const SUGGESTED_QUERIES = [
  "Why is cash flow tight this week?",
  "Which store is most profitable this month?",
  "Show invoice status",
  "When is the next payroll run?",
]

const MAIN_TABS: TabItem[] = [
  { value: "briefing", label: "Briefing" },
  { value: "signals", label: "Signals" },
  { value: "ask", label: "Ask AI" },
  { value: "forecast", label: "Forecast" },
]

// ── Mini forecast SVG ─────────────────────────────────────────────────────────

function ForecastChart({ series }: { series: ForecastPoint[] }) {
  if (!series.length) return null

  const values = series.map((s) => s.actual ?? s.forecast ?? 0)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const W = 240
  const H = 70
  const PAD = 8

  function px(i: number) {
    return PAD + (i / (series.length - 1)) * (W - PAD * 2)
  }
  function py(v: number) {
    return H - PAD - ((v - min) / range) * (H - PAD * 2)
  }

  const actualPoints = series.filter((s) => s.actual != null)
  const forecastPoints = series.filter((s) => s.forecast != null)
  const splitIdx = series.findIndex((s) => s.forecast != null) - 1

  const actualPath = actualPoints
    .map((s, i) => {
      const idx = series.indexOf(s)
      return `${i === 0 ? "M" : "L"}${px(idx)},${py(s.actual!)}`
    })
    .join(" ")

  const forecastPath = forecastPoints
    .map((s, i) => {
      const idx = series.indexOf(s)
      const base =
        i === 0 && splitIdx >= 0
          ? `M${px(splitIdx)},${py(series[splitIdx]!.actual!)} L`
          : i === 0
            ? "M"
            : "L"
      return `${base}${px(idx)},${py(s.forecast!)}`
    })
    .join(" ")

  const bandPath =
    forecastPoints.length >= 2
      ? `M${forecastPoints
          .map((s) => `${px(series.indexOf(s))},${py(s.lower ?? s.forecast!)}`)
          .join(" L")} L${[...forecastPoints]
          .reverse()
          .map((s) => `${px(series.indexOf(s))},${py(s.upper ?? s.forecast!)}`)
          .join(" L")} Z`
      : ""

  const splitX = splitIdx >= 0 ? px(splitIdx) : null

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {bandPath && <path d={bandPath} fill="rgba(255,255,255,0.05)" />}
      {splitX && (
        <line
          x1={splitX}
          y1={PAD}
          x2={splitX}
          y2={H - PAD}
          stroke="rgba(255,255,255,0.1)"
          strokeDasharray="3,3"
          strokeWidth="1"
        />
      )}
      {actualPath && (
        <path
          d={actualPath}
          stroke="rgba(255,255,255,0.75)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {forecastPath && (
        <path
          d={forecastPath}
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1.5"
          strokeDasharray="4,3"
          strokeLinecap="round"
        />
      )}
      {actualPoints.length > 0 &&
        (() => {
          const last = actualPoints[actualPoints.length - 1]!
          const idx = series.indexOf(last)
          return <circle cx={px(idx)} cy={py(last.actual!)} r="3.5" fill="rgba(255,255,255,0.9)" />
        })()}
      {series.map((s, i) => (
        <text
          key={s.month}
          x={px(i)}
          y={H}
          fontSize="7"
          fill={s.actual ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.18)"}
          fontFamily="system-ui"
          textAnchor="middle"
        >
          {s.month}
        </text>
      ))}
    </svg>
  )
}

// ── Panels ────────────────────────────────────────────────────────────────────

function BriefingPanel() {
  const router = useRouter()
  const [data, setData] = useState<BriefingData | null>(null)

  useEffect(() => {
    fetch("/api/intelligence/briefing")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
  }, [])

  if (!data) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    )
  }

  const { greeting, kpis, alerts, recommendation } = data

  return (
    <>
      {/* Hero greeting */}
      <div
        className="rounded-[20px] p-4 mb-3 relative overflow-hidden"
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
        }}
      >
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)",
          }}
        />
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[13px] text-white/60 font-medium">{greeting}</p>
            <p className="text-[22px] font-bold text-white/92 leading-tight tracking-tight">
              Your 60-second briefing
            </p>
          </div>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[8px]"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: "rgba(48,209,88,0.9)",
                animation: "pulse 1.8s ease-in-out infinite",
              }}
            />
            <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wide">
              Live
            </span>
          </div>
        </div>

        {/* KPI 2×2 */}
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["Revenue", kpis.revenue],
              ["Profit", kpis.profit],
              ["Staff In", kpis.staffIn],
              ["Active Jobs", kpis.activeJobs],
            ] as [string, KpiValue][]
          ).map(([label, kpi]) => (
            <div
              key={label}
              className="rounded-[13px] p-3"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <p className="text-[9px] font-bold uppercase tracking-[.09em] text-white/30 mb-1">
                {label}
              </p>
              <p className="text-[20px] font-bold text-white/92 leading-none tracking-tight">
                {kpi.value}
              </p>
              <p
                className="text-[10px] font-semibold mt-1.5"
                style={{ color: TREND_COLOR[kpi.dir] }}
              >
                {kpi.dir === "up" ? "↑ " : kpi.dir === "down" ? "↓ " : "→ "}
                {kpi.trend}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      <SectionLabel>Critical Alerts</SectionLabel>
      <GlassCard className="mb-3" style={{ padding: "8px" }}>
        {alerts.map((alert, i) => {
          const s = ALERT_STYLE[alert.type]
          return (
            <button
              key={i}
              onClick={() => router.push(alert.href)}
              className="w-full flex items-start gap-2.5 p-2 rounded-[12px] text-left"
              style={{
                background: s.bg,
                border: `1px solid ${s.border}`,
                marginBottom: i < alerts.length - 1 ? "6px" : 0,
              }}
            >
              <div
                className="w-5 h-5 rounded-[6px] flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px]"
                style={{ background: s.iconBg }}
              >
                {s.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-white/88 leading-tight">
                  {alert.title}
                </p>
                <p className="text-[10px] text-white/40 mt-0.5 leading-tight">
                  {alert.description}
                </p>
              </div>
            </button>
          )
        })}
      </GlassCard>

      {/* AI Recommendation */}
      <SectionLabel>AI Recommendation</SectionLabel>
      <div
        className="rounded-[18px] p-4 relative overflow-hidden"
        style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
      >
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)",
          }}
        />
        <div
          className="inline-flex items-center px-2 py-0.5 rounded-[5px] mb-2 text-[9px] font-bold uppercase tracking-[.1em] text-white/40"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {recommendation.badge}
        </div>
        <p className="text-[13px] text-white/70 leading-relaxed mb-3">"{recommendation.text}"</p>
        <button
          onClick={() => router.push(recommendation.ctaHref)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12px] font-bold"
          style={{ background: "rgba(255,255,255,0.9)", color: "#000" }}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {recommendation.ctaLabel}
        </button>
      </div>
    </>
  )
}

function SignalsPanel() {
  const router = useRouter()
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch("/api/intelligence/anomalies")
      .then((r) => r.json())
      .then((d) => {
        setAnomalies(d.anomalies ?? [])
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    )
  }

  const count = anomalies.length
  const riskCount = anomalies.filter((a) => a.type === "risk" || a.type === "spike").length

  return (
    <>
      <div
        className="rounded-[16px] p-3.5 mb-3 flex items-center gap-3"
        style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
      >
        <div className="flex-1">
          <p className="text-[11px] font-semibold text-white/40 mb-0.5">
            Signals detected · last 24h
          </p>
          <p className="text-[22px] font-bold text-white/92 leading-none tracking-tight">
            {count} signals
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-white/35 mb-0.5">Action needed</p>
          <p
            className="text-[18px] font-bold leading-none"
            style={{ color: riskCount > 0 ? "rgba(255,69,58,0.9)" : "rgba(48,209,88,0.9)" }}
          >
            {riskCount}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {anomalies.map((a, i) => {
          const s = ANOMALY_STYLE[a.type]
          return (
            <div
              key={i}
              className="rounded-[16px] p-3.5 relative overflow-hidden"
              style={{ background: s.bg, border: `1px solid ${s.border}` }}
            >
              <div
                className="absolute inset-x-0 top-0 h-px"
                style={{
                  background:
                    "linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)",
                }}
              />
              <p
                className="text-[9px] font-bold uppercase tracking-[.1em] mb-1.5"
                style={{ color: s.typeColor }}
              >
                {s.prefix} · {a.domain}
              </p>
              <p className="text-[13px] font-semibold text-white/88 leading-tight mb-1">
                {a.title}
              </p>
              <p className="text-[11px] text-white/45 leading-relaxed mb-3">{a.description}</p>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold" style={{ color: s.typeColor }}>
                  {a.metric}
                </p>
                <button
                  onClick={() => router.push(a.href)}
                  className="text-[10px] font-semibold text-white/55 px-2.5 py-1 rounded-[7px]"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  {a.actionLabel}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function AskPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const send = useCallback(
    async (q: string) => {
      const question = q.trim()
      if (!question || busy) return
      setInput("")
      setBusy(true)

      setMessages((prev) => [...prev, { role: "user", text: question }])

      const aiIdx = messages.length + 1
      setMessages((prev) => [...prev, { role: "ai", text: "", streaming: true }])

      try {
        const res = await fetch("/api/intelligence/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: question }),
        })
        if (!res.ok || !res.body) throw new Error("failed")

        const reader = res.body.getReader()
        const dec = new TextDecoder()
        let full = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          full += dec.decode(value, { stream: true })
          setMessages((prev) => prev.map((m, i) => (i === aiIdx ? { ...m, text: full } : m)))
          bottomRef.current?.scrollIntoView({ behavior: "smooth" })
        }

        setMessages((prev) =>
          prev.map((m, i) => (i === aiIdx ? { ...m, text: full, streaming: false } : m))
        )
      } catch {
        setMessages((prev) =>
          prev.map((m, i) =>
            i === aiIdx
              ? { ...m, text: "Unable to get a response. Please try again.", streaming: false }
              : m
          )
        )
      } finally {
        setBusy(false)
      }
    },
    [busy, messages.length]
  )

  const empty = messages.length === 0

  return (
    <div className="flex flex-col gap-3">
      {/* Search / input bar */}
      <div
        className="flex items-center gap-2.5 px-3.5 py-3 rounded-[14px]"
        style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white/30 flex-shrink-0"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          className="flex-1 bg-transparent text-[13px] text-white/80 placeholder-white/25 outline-none"
          placeholder="Ask anything about your business…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              void send(input)
            }
          }}
          disabled={busy}
        />
        {input.trim() && (
          <button
            onClick={() => void send(input)}
            disabled={busy}
            className="w-6 h-6 rounded-[7px] flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.88)" }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#000"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Conversation or empty state */}
      {empty ? (
        <>
          <div className="flex flex-col gap-2">
            {SUGGESTED_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => void send(q)}
                className="flex items-center gap-2.5 px-3.5 py-3 rounded-[12px] text-left text-[12px] text-white/50"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white/25 flex-shrink-0"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
                {q}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          {messages.map((msg, i) =>
            msg.role === "user" ? (
              <div
                key={i}
                className="self-end max-w-[80%] px-3.5 py-2.5 rounded-[14px_14px_3px_14px] text-[12px] font-medium text-white/90 leading-relaxed"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                {msg.text}
              </div>
            ) : (
              <div
                key={i}
                className="max-w-[92%] px-3.5 py-3 rounded-[3px_14px_14px_14px]"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[9px] font-bold uppercase tracking-[.1em] text-white/30">
                    PRV AI
                  </p>
                  {msg.streaming && (
                    <div className="flex gap-0.5">
                      {[0, 1, 2].map((d) => (
                        <div
                          key={d}
                          className="w-1 h-1 rounded-full bg-white/40"
                          style={{ animation: `bounce 0.9s ease-in-out ${d * 0.15}s infinite` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[12px] text-white/70 leading-relaxed whitespace-pre-line">
                  {msg.text}
                </p>
              </div>
            )
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}

function ForecastPanel() {
  const router = useRouter()
  const [data, setData] = useState<ForecastData | null>(null)

  useEffect(() => {
    fetch("/api/intelligence/forecast")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
  }, [])

  if (!data) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    )
  }

  const forecastMonths = data.series.filter((s) => s.forecast != null)
  const lastForecast = forecastMonths[forecastMonths.length - 1]

  return (
    <>
      {/* Chart card */}
      <GlassCard className="mb-3 p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.09em] text-white/30 mb-0.5">
              Revenue Forecast
            </p>
            {lastForecast && (
              <p className="text-[16px] font-bold text-white/88 tracking-tight">
                {lastForecast.month}: €
                {lastForecast.forecast! >= 1000
                  ? `${Math.round(lastForecast.forecast! / 10) / 100}K`
                  : lastForecast.forecast}
              </p>
            )}
          </div>
          <div
            className="px-2 py-1 rounded-[7px] text-[10px] font-semibold text-white/50"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {data.confidence}% confidence
          </div>
        </div>
        <ForecastChart series={data.series} />
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded bg-white/70" />
            <p className="text-[9px] text-white/35">Actual</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-0.5 rounded bg-white/35 border-dashed"
              style={{ borderTop: "1px dashed rgba(255,255,255,0.35)" }}
            />
            <p className="text-[9px] text-white/35">Forecast</p>
          </div>
        </div>
      </GlassCard>

      {/* Risk radar */}
      <SectionLabel>Risk Radar</SectionLabel>
      <GlassCard className="mb-3" style={{ padding: "8px" }}>
        {data.risks.map((risk, i) => {
          const s = RISK_STYLE[risk.level]
          return (
            <div
              key={risk.domain}
              className="flex items-center justify-between px-3 py-2.5 rounded-[10px]"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                marginBottom: i < data.risks.length - 1 ? "5px" : 0,
              }}
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
                <p className="text-[12px] font-medium text-white/65">{risk.domain}</p>
              </div>
              <p
                className="text-[9px] font-bold uppercase tracking-[.06em] px-2 py-0.5 rounded-[5px]"
                style={{ background: s.badge, color: s.text }}
              >
                {s.label}
              </p>
            </div>
          )
        })}
      </GlassCard>

      {/* Opportunities */}
      <SectionLabel>Opportunities</SectionLabel>
      <div className="flex flex-col gap-2">
        {data.opportunities.map((opp) => (
          <button
            key={opp.title}
            onClick={() => router.push(opp.href)}
            className="flex items-start gap-2.5 px-3.5 py-3 rounded-[13px] text-left"
            style={{ background: "rgba(48,209,88,0.06)", border: "1px solid rgba(48,209,88,0.12)" }}
          >
            <div
              className="w-[18px] h-[18px] rounded-[6px] flex items-center justify-center text-[9px] flex-shrink-0 mt-0.5"
              style={{ background: "rgba(48,209,88,0.14)" }}
            >
              €
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-medium text-white/65 leading-tight">{opp.title}</p>
              <p className="text-[11px] font-bold mt-1" style={{ color: "rgba(48,209,88,0.85)" }}>
                {opp.value}
              </p>
            </div>
          </button>
        ))}
      </div>
    </>
  )
}

// ── Root Client ───────────────────────────────────────────────────────────────

export function AIBriefingClient({ role: _role }: { role: string }) {
  const [tab, setTab] = useState("briefing")

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-white/35 text-[13px] font-medium mb-0.5">Intelligence</p>
          <h1 className="text-white/92 text-[26px] font-bold tracking-tight leading-tight">
            AI Briefing
          </h1>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-medium text-white/60"
          style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "rgba(48,209,88,0.9)",
              animation: "pulse 1.8s ease-in-out infinite",
            }}
          />
          Live
        </div>
      </div>

      <GlassTabs tabs={MAIN_TABS} value={tab} onChange={setTab} className="mb-4" />

      {tab === "briefing" && <BriefingPanel />}
      {tab === "signals" && <SignalsPanel />}
      {tab === "ask" && <AskPanel />}
      {tab === "forecast" && <ForecastPanel />}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.65)} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
      `}</style>
    </div>
  )
}
