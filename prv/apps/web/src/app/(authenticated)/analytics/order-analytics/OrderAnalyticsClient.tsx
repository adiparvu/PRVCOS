"use client"

import { useOrderAnalytics, type OrderAnalyticsResponse } from "@/lib/api-hooks"

const STATUS_ROWS: {
  key: keyof OrderAnalyticsResponse["byStatus"]
  label: string
  kind: "plain" | "amber"
}[] = [
  { key: "delivered", label: "Delivered", kind: "plain" },
  { key: "shipped", label: "Shipped", kind: "plain" },
  { key: "processing", label: "Processing", kind: "plain" },
  { key: "confirmed", label: "Confirmed", kind: "plain" },
  { key: "pending", label: "Pending", kind: "plain" },
  { key: "cancelled", label: "Cancelled", kind: "amber" },
  { key: "refunded", label: "Refunded", kind: "amber" },
]

function eur(n: number): string {
  if (Math.abs(n) >= 1000)
    return `€${(n / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k`
  return `€${Math.round(n)}`
}

function Tile({
  label,
  value,
  suffix,
}: {
  label: string
  value: React.ReactNode
  suffix?: string
}) {
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
        {suffix && (
          <span style={{ fontSize: 13, color: "var(--prv-text-3)", fontWeight: 560 }}>
            {suffix}
          </span>
        )}
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

export function OrderAnalyticsClient() {
  const { data, isLoading } = useOrderAnalytics()
  const byStatus = data?.byStatus
  const maxStatus = Math.max(1, ...STATUS_ROWS.map((r) => byStatus?.[r.key] ?? 0))
  const months = data?.months ?? []
  const maxMonth = Math.max(1, ...months.map((m) => m.revenue))
  const mom = data?.momChangePct ?? null

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>Order Analytics</h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Analytics · shop · fulfillment &amp; revenue
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          margin: "24px 0",
        }}
      >
        <Tile label="Orders" value={(data?.totalOrders ?? 0).toLocaleString("en-US")} />
        <Tile label="Booked revenue" value={eur(data?.revenue ?? 0)} />
        <Tile label="Avg order value" value={eur(data?.aov ?? 0)} />
        <Tile
          label="Cancel / refund"
          value={data?.cancelRatePct ?? "—"}
          suffix={data?.cancelRatePct != null ? "%" : undefined}
        />
      </div>

      {isLoading && <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Loading…</div>}
      {!isLoading && (data?.totalOrders ?? 0) === 0 && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>No orders in the window.</div>
      )}

      {(data?.totalOrders ?? 0) > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16 }}>
          <Card title="Status mix">
            {STATUS_ROWS.map((r) => {
              const count = byStatus?.[r.key] ?? 0
              const pct = Math.max(count > 0 ? 5 : 0, (count / maxStatus) * 100)
              const fill = r.kind === "amber" ? "rgba(255,190,90,0.92)" : "rgba(255,255,255,0.5)"
              return (
                <div
                  key={r.key}
                  style={{ display: "flex", alignItems: "center", gap: 10, margin: "9px 0" }}
                >
                  <div style={{ width: 96, fontSize: 13, color: "var(--prv-text-2)" }}>
                    {r.label}
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
                        background: fill,
                        width: `${pct}%`,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      width: 30,
                      textAlign: "right",
                      fontSize: 13,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {count}
                  </div>
                </div>
              )
            })}
          </Card>

          <Card title="Revenue trend · monthly">
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
                  <div style={{ fontSize: 11, color: "var(--prv-text-2)" }}>{eur(m.revenue)}</div>
                  <div
                    style={{
                      width: "100%",
                      height: `${Math.max(m.revenue > 0 ? 4 : 2, (m.revenue / maxMonth) * 96)}px`,
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
                    color: mom < 0 ? "rgba(255,190,90,0.92)" : "var(--prv-text-1)",
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
