"use client"

import { useExpenseBreakdown, type ExpenseBreakdownResponse } from "@/lib/api-hooks"

type Category = ExpenseBreakdownResponse["byCategory"][number]

function eur(n: number): string {
  if (Math.abs(n) >= 1000)
    return `€${(n / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k`
  return `€${Math.round(n)}`
}

function Tile({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "amber" }) {
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
      <div
        style={{
          fontSize: 22,
          fontWeight: 680,
          marginTop: 8,
          letterSpacing: "-0.02em",
          color: tone === "amber" ? "rgba(255,190,90,0.92)" : undefined,
        }}
      >
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

export function ExpenseBreakdownClient() {
  const { data, isLoading } = useExpenseBreakdown()
  const byCategory: Category[] = data?.byCategory ?? []
  const maxCat = Math.max(1, ...byCategory.map((c) => c.amount))
  const months = data?.months ?? []
  const maxMonth = Math.max(1, ...months.map((m) => m.amount))
  const mom = data?.momChangePct ?? null

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>Expense Breakdown</h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Analytics · finance · committed spend
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          margin: "24px 0",
        }}
      >
        <Tile label="Committed spend" value={eur(data?.totalSpend ?? 0)} />
        <Tile label="Paid" value={eur(data?.paidAmount ?? 0)} />
        <Tile label="Pending approval" value={eur(data?.pendingAmount ?? 0)} tone="amber" />
        <Tile label="Expenses" value={data?.committedCount ?? 0} />
      </div>

      {isLoading && <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Loading…</div>}
      {!isLoading && (data?.committedCount ?? 0) === 0 && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>
          No committed expenses in the window.
        </div>
      )}

      {(data?.committedCount ?? 0) > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
          <Card title="By category">
            {byCategory.map((c) => (
              <div
                key={c.category}
                style={{ display: "flex", alignItems: "center", gap: 10, margin: "9px 0" }}
              >
                <div
                  style={{
                    width: 100,
                    fontSize: 13,
                    color: "var(--prv-text-2)",
                    textTransform: "capitalize",
                  }}
                >
                  {c.category}
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
                      width: `${Math.max(4, (c.amount / maxCat) * 100)}%`,
                    }}
                  />
                </div>
                <div
                  style={{
                    width: 56,
                    textAlign: "right",
                    fontSize: 12.5,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {eur(c.amount)}
                </div>
              </div>
            ))}
          </Card>

          <Card title="Spend trend · monthly">
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
                  <div style={{ fontSize: 11, color: "var(--prv-text-2)" }}>{eur(m.amount)}</div>
                  <div
                    style={{
                      width: "100%",
                      height: `${Math.max(m.amount > 0 ? 4 : 2, (m.amount / maxMonth) * 96)}px`,
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
                <span
                  style={{
                    fontWeight: 600,
                    color: mom > 0 ? "rgba(255,190,90,0.92)" : "var(--prv-text-2)",
                  }}
                >
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
