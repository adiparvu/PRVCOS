"use client"

import { usePayrollCost, type PayrollCostResponse } from "@/lib/api-hooks"

type TypeBucket = PayrollCostResponse["byType"][number]

const TYPE_LABEL: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  special: "Special",
}

function eur(n: number): string {
  if (Math.abs(n) >= 1000)
    return `€${(n / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k`
  return `€${Math.round(n)}`
}

function Tile({ label, value }: { label: string; value: React.ReactNode }) {
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
      <div style={{ fontSize: 22, fontWeight: 680, marginTop: 8, letterSpacing: "-0.02em" }}>
        {value}
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border)",
        borderRadius: 22,
        padding: "18px 20px",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      <h2
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--prv-text-3)",
          fontWeight: 560,
          marginBottom: 14,
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}

export function PayrollCostClient() {
  const { data, isLoading } = usePayrollCost()
  const byType: TypeBucket[] = data?.byType ?? []
  const maxType = Math.max(1, ...byType.map((t) => t.gross))
  const months = data?.months ?? []
  const maxMonth = Math.max(1, ...months.map((m) => m.gross))
  const mom = data?.momChangePct ?? null
  const st = data?.byStatus

  return (
    <div style={{ maxWidth: 840, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>Payroll Cost</h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Analytics · people · payroll runs
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          margin: "24px 0",
        }}
      >
        <Tile label="Gross cost" value={eur(data?.totalGross ?? 0)} />
        <Tile label="Net paid" value={eur(data?.totalNet ?? 0)} />
        <Tile label="Deductions" value={eur(data?.deductions ?? 0)} />
        <Tile label="Avg / employee" value={eur(data?.avgCostPerEmployee ?? 0)} />
      </div>

      {isLoading && <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Loading…</div>}
      {!isLoading && (data?.runs ?? 0) === 0 && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>
          No payroll runs in the window.
        </div>
      )}

      {(data?.runs ?? 0) > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16 }}>
          <Card title="By run type · gross">
            {byType.map((t) => (
              <div
                key={t.type}
                style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0" }}
              >
                <div style={{ width: 82, fontSize: 13, color: "var(--prv-text-2)" }}>
                  {TYPE_LABEL[t.type] ?? t.type}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 8,
                    borderRadius: 99,
                    background: "var(--prv-g3)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 99,
                      background: "rgba(255,255,255,0.5)",
                      width: `${Math.max(4, (t.gross / maxType) * 100)}%`,
                    }}
                  />
                </div>
                <div
                  style={{
                    width: 64,
                    textAlign: "right",
                    fontSize: 12.5,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {eur(t.gross)}
                </div>
              </div>
            ))}
            {st && (
              <div style={{ marginTop: 16, color: "var(--prv-text-3)", fontSize: 12.5 }}>
                Status ·{" "}
                <span style={{ color: "var(--prv-text-2)", fontWeight: 600 }}>{st.done} done</span>{" "}
                · {st.processing} processing · {st.pending} pending
              </div>
            )}
          </Card>

          <Card title="Gross cost trend · monthly">
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 10,
                height: 130,
                marginTop: 6,
              }}
            >
              {months.map((m) => (
                <div
                  key={m.month}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <div style={{ fontSize: 11, color: "var(--prv-text-2)" }}>{eur(m.gross)}</div>
                  <div
                    style={{
                      width: "100%",
                      height: `${Math.max(m.gross > 0 ? 4 : 2, (m.gross / maxMonth) * 96)}px`,
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.35)",
                    }}
                  />
                  <div style={{ fontSize: 11, color: "var(--prv-text-3)" }}>{m.label}</div>
                </div>
              ))}
            </div>
            {mom !== null && (
              <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--prv-text-3)" }}>
                Month over month:{" "}
                <span style={{ fontWeight: 600, color: "var(--prv-text-1)" }}>
                  {mom > 0 ? "▲" : mom < 0 ? "▼" : "–"} {Math.abs(mom)}%
                </span>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
