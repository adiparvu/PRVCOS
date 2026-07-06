"use client"

import {
  useKpiTrends,
  useAnomalies,
  useCompanyHealth,
  useProjectProfitability,
  useSafetyAnalytics,
  useAttendanceAnalytics,
  useDemandForecast,
} from "@/lib/api-hooks"
import { composeDailyBriefing } from "@/lib/daily-briefing"

// Classify a line's tone by its wording so the bullet colour matches severity.
function toneOf(line: string): "crit" | "warn" | "plain" {
  if (/critical|inj|loss-making/i.test(line)) return "crit"
  if (/stockout|below the attendance|down \d|open safety/i.test(line)) return "warn"
  return "plain"
}

const DOT: Record<string, string> = {
  attention: "rgba(255,105,97,0.95)",
  watch: "rgba(255,190,90,0.92)",
  healthy: "rgba(255,255,255,0.85)",
}

const BULLET: Record<string, string> = {
  crit: "rgba(255,105,97,0.95)",
  warn: "rgba(255,190,90,0.92)",
  plain: "var(--prv-text-3)",
}

export function DailyBriefingClient() {
  const health = useCompanyHealth().data
  const trends = useKpiTrends().data
  const profit = useProjectProfitability().data
  const attendance = useAttendanceAnalytics().data
  const safety = useSafetyAnalytics().data
  const anomalies = useAnomalies().data
  const demand = useDemandForecast().data

  const revenue = trends?.trends.find((t) => t.key === "revenueMonth")

  const briefing = composeDailyBriefing({
    healthScore: health?.composite ?? 100,
    revenueDeltaPct: revenue ? revenue.deltaPct : null,
    portfolioProfit: profit?.totalProfit ?? 0,
    marginPct: profit?.marginPct ?? 0,
    activeProjects: profit?.projects.length ?? 0,
    lossMakingProjects: profit?.lossCount ?? 0,
    attendanceRatePct: attendance?.attendanceRate ?? null,
    attendanceWatch: attendance?.watchlist.length ?? 0,
    openSafety: safety?.open ?? 0,
    safetyInjuries: safety?.injuriesTotal ?? 0,
    stockoutRisk: demand?.criticalCount ?? 0,
    criticalAlerts: anomalies?.meta.critical ?? 0,
  })

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "36px 24px 80px" }}>
      <div
        style={{
          color: "var(--prv-text-3)",
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontWeight: 560,
        }}
      >
        {today} · Morning brief
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 640, letterSpacing: "-0.02em", marginTop: 6 }}>
        Daily Briefing
      </h1>

      <div
        style={{
          display: "flex",
          gap: 13,
          alignItems: "flex-start",
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border)",
          borderRadius: 20,
          padding: "18px 20px",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
          margin: "20px 0 8px",
        }}
      >
        <span
          style={{
            width: 11,
            height: 11,
            borderRadius: "50%",
            marginTop: 5,
            flexShrink: 0,
            background: DOT[briefing.posture],
            boxShadow: `0 0 12px ${DOT[briefing.posture]}`,
          }}
        />
        <p style={{ fontSize: 16, fontWeight: 560, lineHeight: 1.45 }}>{briefing.headline}</p>
      </div>

      {briefing.sections.map((section) => (
        <div key={section.title} style={{ marginTop: 22 }}>
          <h2
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "var(--prv-text-3)",
              fontWeight: 600,
              margin: "0 4px 10px",
            }}
          >
            {section.title}
          </h2>
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border)",
              borderRadius: 18,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
              overflow: "hidden",
            }}
          >
            {section.lines.map((line, i) => {
              const tone = toneOf(line)
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 11,
                    padding: "13px 18px",
                    borderBottom:
                      i < section.lines.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
                    fontSize: 14,
                    lineHeight: 1.45,
                    color: "var(--prv-text-2)",
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: BULLET[tone],
                      marginTop: 8,
                      flexShrink: 0,
                    }}
                  />
                  {line}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
