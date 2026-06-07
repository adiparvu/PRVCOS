"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import type { Insight, Report, StoreKpi, IntelligenceMeta } from "@/app/api/intelligence/route"

type FilterType = "Toate" | "Analytics" | "AI Insights" | "Rapoarte"

interface IntelligenceData {
  insights: Insight[]
  reports: Report[]
  storeKpis: StoreKpi[]
  meta: IntelligenceMeta
}

function KpiTile({
  label,
  value,
  trend,
  color,
}: {
  label: string
  value: string | number
  trend: string
  color: string
}) {
  return (
    <div
      style={{
        flex: 1,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 16,
        padding: "14px 10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 3,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)",
        }}
      />
      <span style={{ fontSize: 19, fontWeight: 700, color, letterSpacing: "-0.5px" }}>{value}</span>
      <span
        style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.40)",
          fontWeight: 500,
          letterSpacing: 0.2,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: color.replace("0.95", "0.6").replace("0.9", "0.6"),
        }}
      >
        {trend}
      </span>
    </div>
  )
}

function InsightRow({ insight }: { insight: Insight }) {
  const priorityColor =
    insight.priority === "urgent"
      ? "rgba(255,69,58,0.9)"
      : insight.priority === "medium"
        ? "rgba(255,159,10,0.9)"
        : "rgba(255,255,255,0.35)"

  const typeColor =
    insight.type === "recommendation"
      ? "rgba(191,90,242,0.9)"
      : insight.type === "alert"
        ? "rgba(255,69,58,0.9)"
        : insight.type === "forecast"
          ? "rgba(10,132,255,0.9)"
          : "rgba(48,209,88,0.9)"

  const typeLabel =
    insight.type === "recommendation"
      ? "Recomandare"
      : insight.type === "alert"
        ? "Alertă"
        : insight.type === "forecast"
          ? "Prognoză"
          : "Raport"

  const borderColor =
    insight.priority === "urgent"
      ? "rgba(255,69,58,0.65)"
      : insight.priority === "medium"
        ? "rgba(255,159,10,0.65)"
        : "transparent"

  return (
    <Link href={`/intelligence/${insight.id}`} style={{ textDecoration: "none" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          padding: "14px 16px 14px 13px",
          borderLeft: "3px solid transparent",
          borderImage:
            borderColor !== "transparent"
              ? `linear-gradient(180deg,${borderColor},${borderColor}80) 1`
              : undefined,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: typeColor.replace("0.9", "0.12"),
            border: `1px solid ${typeColor.replace("0.9", "0.25")}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {insight.type === "recommendation" ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={typeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          ) : insight.type === "alert" ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={typeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={typeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "rgba(255,255,255,0.92)",
              marginBottom: 4,
              lineHeight: 1.3,
            }}
          >
            {insight.title}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.50)",
              lineHeight: 1.4,
              marginBottom: 6,
            }}
          >
            {insight.summary}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: typeColor,
                background: typeColor.replace("0.9", "0.10"),
                border: `1px solid ${typeColor.replace("0.9", "0.22")}`,
                borderRadius: 8,
                padding: "2px 7px",
              }}
            >
              {typeLabel}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: priorityColor,
                background: priorityColor.replace("0.9", "0.10"),
                border: `1px solid ${priorityColor.replace("0.9", "0.22")}`,
                borderRadius: 8,
                padding: "2px 7px",
              }}
            >
              {insight.priority}
            </span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)" }}>
              {insight.confidenceLabel} · {insight.timeAgo}
            </span>
          </div>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0, marginTop: 3 }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </Link>
  )
}

function FeaturedInsight({ insight }: { insight: Insight }) {
  return (
    <Link href={`/intelligence/${insight.id}`} style={{ textDecoration: "none" }}>
      <div
        style={{
          margin: "0 16px",
          background: "rgba(191,90,242,0.08)",
          border: "1px solid rgba(191,90,242,0.22)",
          borderRadius: 18,
          padding: "14px",
          position: "relative",
          overflow: "hidden",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: "linear-gradient(90deg,transparent,rgba(191,90,242,0.30),transparent)",
          }}
        />
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(191,90,242,0.16)",
              border: "1px solid rgba(191,90,242,0.30)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(191,90,242,0.9)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "rgba(191,90,242,0.75)",
                textTransform: "uppercase" as const,
                letterSpacing: 0.6,
                marginBottom: 4,
              }}
            >
              AI Insight · Urgentă
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "rgba(255,255,255,0.90)",
                lineHeight: 1.4,
              }}
            >
              {insight.title}
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "rgba(191,90,242,0.9)",
                  background: "rgba(191,90,242,0.12)",
                  border: "1px solid rgba(191,90,242,0.28)",
                  borderRadius: 8,
                  padding: "2px 7px",
                }}
              >
                Impact ridicat
              </span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.30)" }}>
                {insight.timeAgo}
              </span>
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px solid rgba(191,90,242,0.14)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              color: "rgba(191,90,242,0.85)",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Analizează detalii
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  )
}

function RevenueChart({ kpis }: { kpis: StoreKpi[] }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 20,
        margin: "0 16px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)",
        }}
      />
      {kpis.map((kpi, i) => {
        const barColor =
          kpi.marginPct >= 35
            ? "rgba(48,209,88,0.5)"
            : kpi.marginPct >= 30
              ? "rgba(10,132,255,0.45)"
              : "rgba(255,159,10,0.45)"
        const valColor =
          kpi.marginPct >= 35
            ? "rgba(48,209,88,0.9)"
            : kpi.marginPct >= 30
              ? "rgba(10,132,255,0.8)"
              : "rgba(255,159,10,0.85)"
        return (
          <div
            key={kpi.storeId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 16px",
              borderBottom: i < kpis.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
            }}
          >
            <div
              style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", width: 80, flexShrink: 0 }}
            >
              {kpi.storeName}
            </div>
            <div
              style={{
                flex: 1,
                height: 8,
                background: "rgba(255,255,255,0.08)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${kpi.revenueBarPct}%`,
                  height: "100%",
                  borderRadius: 4,
                  background: barColor,
                }}
              />
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: valColor,
                width: 42,
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              {kpi.revenueTodayLabel}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ReportRow({ report }: { report: Report }) {
  const iconColor =
    report.type === "monthly"
      ? "rgba(10,132,255,0.9)"
      : report.type === "inventory"
        ? "rgba(255,159,10,0.9)"
        : report.type === "forecast"
          ? "rgba(191,90,242,0.85)"
          : "rgba(48,209,88,0.9)"

  const pillColor =
    report.status === "ready"
      ? report.type === "inventory"
        ? "amber"
        : "green"
      : report.status === "scheduled"
        ? "dim"
        : "purple"

  const pillStyle: Record<string, React.CSSProperties> = {
    green: {
      color: "rgba(48,209,88,0.9)",
      background: "rgba(48,209,88,0.10)",
      border: "1px solid rgba(48,209,88,0.25)",
    },
    amber: {
      color: "rgba(255,159,10,0.9)",
      background: "rgba(255,159,10,0.10)",
      border: "1px solid rgba(255,159,10,0.25)",
    },
    purple: {
      color: "rgba(191,90,242,0.9)",
      background: "rgba(191,90,242,0.10)",
      border: "1px solid rgba(191,90,242,0.25)",
    },
    dim: {
      color: "rgba(255,255,255,0.45)",
      background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(255,255,255,0.14)",
    },
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "13px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: iconColor.replace("0.9", "0.12").replace("0.85", "0.12"),
          border: `1px solid ${iconColor.replace("0.9", "0.22").replace("0.85", "0.22")}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {report.type === "monthly" || report.type === "performance" ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={iconColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        ) : report.type === "inventory" ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={iconColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={iconColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "rgba(255,255,255,0.90)",
            marginBottom: 3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {report.title}
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.40)" }}>
          {report.status === "scheduled"
            ? `Programat ${report.generatedDate}`
            : `${report.generatedDate}${report.pages > 0 ? ` · ${report.pages} pagini` : ""}`}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 8,
            padding: "2px 7px",
            ...pillStyle[pillColor],
          }}
        >
          {report.statusLabel}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </div>
  )
}

function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "18px 16px 10px" }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "rgba(255,255,255,0.35)",
          textTransform: "uppercase" as const,
          letterSpacing: 0.8,
        }}
      >
        {label}
      </span>
      {count !== undefined && (
        <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.22)" }}>
          {count}
        </span>
      )}
    </div>
  )
}

function SkeletonRow() {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        gap: 12,
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          background: "rgba(255,255,255,0.07)",
          borderRadius: 10,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1 }}>
        <div
          style={{
            height: 14,
            background: "rgba(255,255,255,0.07)",
            borderRadius: 5,
            marginBottom: 8,
            width: "65%",
          }}
        />
        <div
          style={{
            height: 11,
            background: "rgba(255,255,255,0.04)",
            borderRadius: 4,
            width: "45%",
          }}
        />
      </div>
    </div>
  )
}

export default function IntelligenceListClient() {
  const [data, setData] = useState<IntelligenceData | null>(null)
  const [filter, setFilter] = useState<FilterType>("Toate")
  const [fabOpen, setFabOpen] = useState(false)

  useEffect(() => {
    fetch("/api/intelligence")
      .then((r) => r.json())
      .then((d) => setData(d as IntelligenceData))
      .catch(() => {})
  }, [])

  const filters: FilterType[] = ["Toate", "Analytics", "AI Insights", "Rapoarte"]

  const urgentInsight = data?.insights.find((i) => i.priority === "urgent") ?? null
  const allInsights = data?.insights ?? []
  const allReports = data?.reports ?? []

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        paddingBottom: 120,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ padding: "56px 16px 0" }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "rgba(255,255,255,0.95)",
            margin: 0,
            letterSpacing: "-0.6px",
          }}
        >
          Inteligență
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.35)",
            margin: "4px 0 0",
            fontWeight: 400,
          }}
        >
          Analiză · AI · Rapoarte
        </p>
      </div>

      {/* KPI Strip */}
      <div style={{ display: "flex", gap: 8, padding: "16px 16px 0" }}>
        <KpiTile
          label="Venit Azi"
          value={data?.meta.totalRevenueLabel ?? "—"}
          trend={data?.meta.revenueTrend ?? "—"}
          color="rgba(48,209,88,0.95)"
        />
        <KpiTile
          label="Marjă Medie"
          value={data ? `${data.meta.avgMarginPct}%` : "—"}
          trend={data?.meta.marginTrend ?? "—"}
          color="rgba(255,159,10,0.95)"
        />
        <KpiTile
          label="Comenzi"
          value={data?.meta.ordersToday ?? "—"}
          trend="+5%"
          color="rgba(10,132,255,0.9)"
        />
        <KpiTile
          label="Alerte"
          value={data?.meta.activeAlerts ?? "—"}
          trend="activ"
          color="rgba(255,69,58,0.95)"
        />
      </div>

      {/* Filter Chips */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "16px 16px 0",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "7px 16px",
              borderRadius: 100,
              border:
                filter === f
                  ? "1px solid rgba(255,255,255,0.40)"
                  : "1px solid rgba(255,255,255,0.12)",
              background: filter === f ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)",
              color: filter === f ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)",
              fontSize: 13,
              fontWeight: filter === f ? 600 : 400,
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontFamily: "inherit",
              flexShrink: 0,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ marginTop: 6 }}>
        {/* Featured AI Insight */}
        {(filter === "Toate" || filter === "AI Insights") && urgentInsight && (
          <div>
            <SectionHeader label="AI Insights" />
            <FeaturedInsight insight={urgentInsight} />
          </div>
        )}

        {/* All Insights (AI Insights filter) */}
        {filter === "AI Insights" && (
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 20,
                margin: "0 16px",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 1,
                  background:
                    "linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)",
                }}
              />
              {data
                ? allInsights.map((ins) => <InsightRow key={ins.id} insight={ins} />)
                : [1, 2, 3].map((n) => <SkeletonRow key={n} />)}
            </div>
          </div>
        )}

        {/* Revenue Chart (Analytics / Toate) */}
        {(filter === "Toate" || filter === "Analytics") && (
          <div>
            <SectionHeader label="Venit per Magazin — Azi" />
            {data ? (
              <RevenueChart kpis={data.storeKpis} />
            ) : (
              <div
                style={{
                  margin: "0 16px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 20,
                  overflow: "hidden",
                }}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <div
                    key={n}
                    style={{
                      padding: "10px 16px",
                      borderBottom: n < 5 ? "1px solid rgba(255,255,255,0.06)" : "none",
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 80,
                        height: 10,
                        background: "rgba(255,255,255,0.06)",
                        borderRadius: 4,
                      }}
                    />
                    <div
                      style={{
                        flex: 1,
                        height: 8,
                        background: "rgba(255,255,255,0.05)",
                        borderRadius: 4,
                      }}
                    />
                    <div
                      style={{
                        width: 40,
                        height: 10,
                        background: "rgba(255,255,255,0.06)",
                        borderRadius: 4,
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recent Insights (Toate — limited) */}
        {filter === "Toate" && (
          <div>
            <SectionHeader label="Insights Recente" />
            <div
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 20,
                margin: "0 16px",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 1,
                  background:
                    "linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)",
                }}
              />
              {data
                ? allInsights.slice(0, 3).map((ins) => <InsightRow key={ins.id} insight={ins} />)
                : [1, 2, 3].map((n) => <SkeletonRow key={n} />)}
              {data && allInsights.length > 3 && (
                <button
                  onClick={() => setFilter("AI Insights")}
                  style={{
                    width: "100%",
                    padding: "13px 16px",
                    background: "none",
                    border: "none",
                    color: "rgba(10,132,255,0.9)",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                    textAlign: "center",
                    fontFamily: "inherit",
                  }}
                >
                  Vezi toate {allInsights.length} insights-urile
                </button>
              )}
            </div>
          </div>
        )}

        {/* Reports */}
        {(filter === "Toate" || filter === "Rapoarte") && (
          <div>
            <SectionHeader
              label="Rapoarte"
              count={filter === "Rapoarte" ? allReports.length : undefined}
            />
            <div
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 20,
                margin: "0 16px",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 1,
                  background:
                    "linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)",
                }}
              />
              {data
                ? (filter === "Toate" ? allReports.slice(0, 3) : allReports).map((rep) => (
                    <ReportRow key={rep.id} report={rep} />
                  ))
                : [1, 2, 3].map((n) => <SkeletonRow key={n} />)}
              {filter === "Toate" && data && allReports.length > 3 && (
                <button
                  onClick={() => setFilter("Rapoarte")}
                  style={{
                    width: "100%",
                    padding: "13px 16px",
                    background: "none",
                    border: "none",
                    color: "rgba(10,132,255,0.9)",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                    textAlign: "center",
                    fontFamily: "inherit",
                  }}
                >
                  Vezi toate rapoartele
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setFabOpen(true)}
        style={{
          position: "fixed",
          bottom: 88,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.14)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          border: "1px solid rgba(255,255,255,0.28)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.25)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 40,
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.92)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* FAB Sheet */}
      {fabOpen && (
        <>
          <div
            onClick={() => setFabOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              zIndex: 48,
            }}
          />
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: "rgba(28,28,30,0.92)",
              backdropFilter: "blur(48px)",
              WebkitBackdropFilter: "blur(48px)",
              borderTop: "1px solid rgba(255,255,255,0.14)",
              borderRadius: "28px 28px 0 0",
              padding: "12px 16px 44px",
              zIndex: 50,
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                background: "rgba(255,255,255,0.20)",
                borderRadius: 2,
                margin: "0 auto 20px",
              }}
            />
            {[
              {
                label: "Generează Raport Nou",
                icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8",
                color: "rgba(10,132,255,0.9)",
              },
              {
                label: "Exportă Date CSV",
                icon: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M7 10l5 5 5-5 M12 15V3",
                color: "rgba(48,209,88,0.9)",
              },
              {
                label: "Programează Raport",
                icon: "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
                color: "rgba(255,255,255,0.75)",
              },
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => setFabOpen(false)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "15px 4px",
                  background: "none",
                  border: "none",
                  borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: item.color.replace("0.9", "0.12").replace("0.75", "0.08"),
                    border: `1px solid ${item.color.replace("0.9", "0.25").replace("0.75", "0.18")}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={item.color}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={item.icon} />
                  </svg>
                </div>
                <span style={{ fontSize: 16, fontWeight: 500, color: item.color }}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
