"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

interface PLPeriod {
  label: string
  revenue: number
  costs: number
  profit: number
  marginPct: number
  vatCollected: number
  vatDeductible: number
  vatDue: number
}

interface PLData {
  year: number
  periodType: "monthly" | "quarterly"
  currency: string
  periods: PLPeriod[]
  totals: {
    revenue: number
    costs: number
    profit: number
    marginPct: number
    vatDue: number
  }
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)}k`
  return Math.round(n).toString()
}

function Bar({
  revenue,
  costs,
  maxVal,
  label,
  isSelected,
  onClick,
}: {
  revenue: number
  costs: number
  maxVal: number
  label: string
  isSelected: boolean
  onClick: () => void
}) {
  const h = 72
  const revH = maxVal > 0 ? Math.round((revenue / maxVal) * h) : 0
  const costH = maxVal > 0 ? Math.round((costs / maxVal) * h) : 0

  return (
    <div
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        cursor: "pointer",
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: "100%",
          height: h,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 2,
          position: "relative",
        }}
      >
        {/* Revenue bar */}
        <div
          style={{
            flex: 1,
            height: revH,
            borderRadius: "3px 3px 0 0",
            background: isSelected ? "rgba(48,209,88,0.80)" : "rgba(48,209,88,0.40)",
            transition: "height 0.3s ease, background 0.15s",
            minHeight: revenue > 0 ? 3 : 0,
          }}
        />
        {/* Costs bar */}
        <div
          style={{
            flex: 1,
            height: costH,
            borderRadius: "3px 3px 0 0",
            background: isSelected ? "rgba(255,69,58,0.70)" : "rgba(255,69,58,0.35)",
            transition: "height 0.3s ease, background 0.15s",
            minHeight: costs > 0 ? 3 : 0,
          }}
        />
      </div>
      <span
        style={{
          fontSize: 9,
          color: isSelected ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.30)",
          fontWeight: isSelected ? 600 : 400,
          letterSpacing: "0.2px",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </div>
  )
}

function PeriodDetail({ period, currency }: { period: PLPeriod; currency: string }) {
  const profit = period.profit
  const profitColor = profit >= 0 ? "rgba(48,209,88,0.95)" : "rgba(255,69,58,0.95)"

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: "14px 16px",
        marginTop: 12,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        animation: "fadeIn 0.18s ease",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
          {period.label}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: profitColor,
            background: profitColor.replace(/[\d.]+\)$/, "0.10)"),
            border: `1px solid ${profitColor.replace(/[\d.]+\)$/, "0.22)")}`,
            borderRadius: 8,
            padding: "2px 8px",
          }}
        >
          {profit >= 0 ? "+" : ""}
          {fmt(profit)} {currency} · {period.marginPct}%
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {[
          { label: "Venituri", val: period.revenue, color: "rgba(48,209,88,0.85)" },
          { label: "Costuri", val: period.costs, color: "rgba(255,69,58,0.85)" },
          { label: "TVA colectat", val: period.vatCollected, color: "rgba(255,255,255,0.55)" },
          { label: "TVA de plată", val: period.vatDue, color: "rgba(255,159,10,0.85)" },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: "rgba(255,255,255,0.04)",
              borderRadius: 10,
              padding: "8px 10px",
            }}
          >
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>
              {item.label}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: item.color }}>
              {fmt(item.val)} {currency}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PLChartView() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [periodType, setPeriodType] = useState<"monthly" | "quarterly">("monthly")
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  const { data, isLoading: loading } = useQuery({
    queryKey: ["pl-report", year, periodType],
    queryFn: () =>
      fetch(`/api/finance/reports/pl?year=${year}&periodType=${periodType}`).then(
        (r) => r.json() as Promise<PLData>
      ),
  })

  // Clear the selected bar whenever the year / period selection changes.
  const paramKey = `${year}-${periodType}`
  const [activeParamKey, setActiveParamKey] = useState(paramKey)
  if (paramKey !== activeParamKey) {
    setActiveParamKey(paramKey)
    setSelectedIdx(null)
  }

  const maxVal = data ? Math.max(...data.periods.map((p) => Math.max(p.revenue, p.costs)), 1) : 1

  const selectedPeriod = selectedIdx !== null ? (data?.periods[selectedIdx] ?? null) : null

  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
      }}
    >
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:translateY(0) } }`}</style>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        {/* Year selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setYear((y) => y - 1)}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.65)",
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ‹
          </button>
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "rgba(255,255,255,0.90)",
              letterSpacing: "-0.3px",
              minWidth: 36,
              textAlign: "center",
            }}
          >
            {year}
          </span>
          <button
            onClick={() => setYear((y) => Math.min(y + 1, new Date().getFullYear()))}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.65)",
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ›
          </button>
        </div>

        {/* Period type toggle */}
        <div
          style={{
            display: "flex",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 10,
            padding: 3,
            gap: 3,
          }}
        >
          {(["monthly", "quarterly"] as const).map((pt) => (
            <button
              key={pt}
              onClick={() => setPeriodType(pt)}
              style={{
                padding: "4px 10px",
                borderRadius: 7,
                border: "none",
                background: periodType === pt ? "rgba(255,255,255,0.16)" : "transparent",
                color: periodType === pt ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.40)",
                fontSize: 11,
                fontWeight: periodType === pt ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {pt === "monthly" ? "Lunar" : "Trimestrial"}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, marginBottom: 10 }}>
        {[
          { color: "rgba(48,209,88,0.75)", label: "Venituri" },
          { color: "rgba(255,69,58,0.65)", label: "Costuri" },
        ].map((l) => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: l.color,
              }}
            />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.40)" }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      {loading ? (
        <div
          style={{
            height: 96,
            background: "rgba(255,255,255,0.05)",
            borderRadius: 12,
            animation: "pulse 1.4s ease-in-out infinite",
          }}
        />
      ) : data && data.periods.length > 0 ? (
        <div style={{ display: "flex", gap: 4, alignItems: "flex-end" }}>
          {data.periods.map((p, i) => (
            <Bar
              key={p.label}
              revenue={p.revenue}
              costs={p.costs}
              maxVal={maxVal}
              label={p.label.length > 4 ? p.label.slice(0, 3) : p.label}
              isSelected={selectedIdx === i}
              onClick={() => setSelectedIdx(selectedIdx === i ? null : i)}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            height: 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.25)",
            fontSize: 13,
          }}
        >
          Nicio dată disponibilă pentru {year}
        </div>
      )}

      {/* Selected period detail */}
      {selectedPeriod && (
        <PeriodDetail period={selectedPeriod} currency={data?.currency ?? "RON"} />
      )}

      {/* Totals summary */}
      {data && !loading && (
        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
          }}
        >
          {[
            { label: "Total Venituri", val: data.totals.revenue, color: "rgba(48,209,88,0.90)" },
            { label: "Total Costuri", val: data.totals.costs, color: "rgba(255,69,58,0.90)" },
            {
              label: `Profit · ${data.totals.marginPct}%`,
              val: data.totals.profit,
              color: data.totals.profit >= 0 ? "rgba(48,209,88,0.90)" : "rgba(255,69,58,0.90)",
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: "10px 10px 8px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: item.color, marginBottom: 3 }}>
                {fmt(item.val)}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", lineHeight: 1.3 }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
