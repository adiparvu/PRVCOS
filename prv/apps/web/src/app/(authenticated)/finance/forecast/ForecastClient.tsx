"use client"

import { useState } from "react"
import { useFinanceForecast } from "@/lib/api-hooks"

type Horizon = "3" | "6" | "12"
const SCEN_LABEL: Record<string, string> = {
  conservative: "Conservative",
  base: "Base",
  optimistic: "Optimistic",
}

function eur(n: number): string {
  const abs = Math.abs(n)
  const s =
    abs >= 1000
      ? `€${(n / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k`
      : `€${Math.round(n)}`
  return s
}

const card = {
  background: "var(--prv-g1)",
  border: "1px solid var(--prv-border)",
  borderRadius: 22,
  padding: 20,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 24px 64px rgba(0,0,0,0.5)",
  marginBottom: 16,
} as const

function Tile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border)",
        borderRadius: 18,
        padding: "15px 17px",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      <div
        style={{
          color: "var(--prv-text-3)",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          fontWeight: 560,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 23, fontWeight: 680, marginTop: 8, letterSpacing: "-0.02em" }}>
        {value}
        {unit && <span style={{ fontSize: 13, color: "var(--prv-text-3)" }}>{unit}</span>}
      </div>
    </div>
  )
}

export function ForecastClient() {
  const { data, isLoading, isError } = useFinanceForecast()
  const [horizon, setHorizon] = useState<Horizon>("6")

  const months = data?.horizons[horizon] ?? []
  const scenarios = data?.scenarios[horizon] ?? []
  const a = data?.assumptions
  const maxStack = Math.max(1, ...months.map((m) => m.revenue + m.expenses))

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "36px 24px 80px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 20,
        }}
      >
        <div>
          <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>Forecast</h1>
          <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
            Finance · forward P&amp;L from run-rate + weighted pipeline
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 4,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border)",
            borderRadius: 100,
            padding: 4,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
          }}
        >
          {(["3", "6", "12"] as Horizon[]).map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              style={{
                border: 0,
                background: horizon === h ? "var(--prv-g3)" : "transparent",
                color: horizon === h ? "var(--prv-text-1)" : "var(--prv-text-2)",
                font: "inherit",
                fontSize: 12.5,
                padding: "7px 15px",
                borderRadius: 100,
                cursor: "pointer",
                boxShadow: horizon === h ? "inset 0 1px 0 rgba(255,255,255,0.22)" : "none",
              }}
            >
              {h} mo
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14, marginTop: 24 }}>
          Loading forecast…
        </div>
      )}
      {isError && (
        <div style={{ color: "var(--prv-text-2)", fontSize: 14, marginTop: 24 }}>
          Could not load forecast.
        </div>
      )}

      {data && a && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 14,
              margin: "24px 0",
            }}
          >
            <Tile label="Revenue run-rate" value={eur(a.monthlyRevenueRunRate)} unit="/mo" />
            <Tile label="Weighted pipeline" value={eur(a.weightedPipelineTotal)} />
            <Tile label="Expense run-rate" value={eur(a.monthlyExpenseRunRate)} unit="/mo" />
            <Tile
              label="Break-even"
              value={
                data.breakEvenMonth === null
                  ? "—"
                  : data.breakEvenMonth === 0
                    ? "Now"
                    : `Month ${data.breakEvenMonth}`
              }
            />
          </div>

          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>Projected P&amp;L · base case</h2>
              <span style={{ color: "var(--prv-text-3)", fontSize: 12 }}>revenue vs expenses</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 8,
                height: 180,
                borderBottom: "1px solid var(--prv-border-subtle)",
                paddingBottom: 2,
              }}
            >
              {months.map((m) => (
                <div
                  key={m.index}
                  title={`M${m.index}: rev ${eur(m.revenue)}, exp ${eur(m.expenses)}, net ${eur(m.net)}`}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 6,
                    height: "100%",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      maxWidth: 40,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                      height: "100%",
                      gap: 2,
                    }}
                  >
                    <div
                      style={{
                        height: `${(m.revenue / maxStack) * 100}%`,
                        borderRadius: "6px 6px 0 0",
                        background:
                          "linear-gradient(180deg,rgba(255,255,255,.30),rgba(255,255,255,.12))",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
                      }}
                    />
                    <div
                      style={{
                        height: `${(m.expenses / maxStack) * 100}%`,
                        borderRadius: "0 0 6px 6px",
                        background:
                          "repeating-linear-gradient(45deg,rgba(255,255,255,.10),rgba(255,255,255,.10) 5px,rgba(255,255,255,.04) 5px,rgba(255,255,255,.04) 10px)",
                      }}
                    />
                  </div>
                  <div style={{ color: "var(--prv-text-3)", fontSize: 10.5 }}>M{m.index}</div>
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                gap: 16,
                marginTop: 14,
                fontSize: 12,
                color: "var(--prv-text-2)",
              }}
            >
              <span>
                <span
                  style={{
                    display: "inline-block",
                    width: 11,
                    height: 11,
                    borderRadius: 3,
                    marginRight: 6,
                    verticalAlign: -1,
                    background: "rgba(255,255,255,.3)",
                  }}
                />
                Revenue
              </span>
              <span>
                <span
                  style={{
                    display: "inline-block",
                    width: 11,
                    height: 11,
                    borderRadius: 3,
                    marginRight: 6,
                    verticalAlign: -1,
                    background: "rgba(255,255,255,.1)",
                  }}
                />
                Expenses
              </span>
            </div>
          </div>

          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>Scenarios · {horizon} months</h2>
              <span style={{ color: "var(--prv-text-3)", fontSize: 12 }}>net profit</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {scenarios.map((sc) => (
                <div
                  key={sc.scenario}
                  style={{
                    border: "1px solid var(--prv-border)",
                    borderRadius: 16,
                    padding: 16,
                    background: "var(--prv-g1)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--prv-text-3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {SCEN_LABEL[sc.scenario]}
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      marginTop: 10,
                      letterSpacing: "-0.02em",
                      color: sc.netProfit < 0 ? "rgba(255,190,90,0.92)" : undefined,
                    }}
                  >
                    {eur(sc.netProfit)}
                  </div>
                  <div
                    style={{
                      color: "var(--prv-text-2)",
                      fontSize: 12,
                      marginTop: 8,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>Rev {eur(sc.totalRevenue)}</span>
                    <span>
                      {sc.breakEvenMonth === null
                        ? "No break-even"
                        : sc.breakEvenMonth === 0
                          ? "Break-even now"
                          : `Break-even M${sc.breakEvenMonth}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
