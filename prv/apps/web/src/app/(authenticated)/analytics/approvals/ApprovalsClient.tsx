"use client"

import { useApprovalAnalytics, type ApprovalAnalyticsResponse } from "@/lib/api-hooks"

type TypeBucket = ApprovalAnalyticsResponse["byType"][number]

const STATUS_ROWS: {
  key: keyof ApprovalAnalyticsResponse["byStatus"]
  label: string
  kind: "plain" | "amber" | "red"
}[] = [
  { key: "approved", label: "Approved", kind: "plain" },
  { key: "pending", label: "Pending", kind: "plain" },
  { key: "urgent", label: "Urgent", kind: "red" },
  { key: "rejected", label: "Rejected", kind: "plain" },
  { key: "expired", label: "Expired", kind: "amber" },
]

const TYPE_LABEL: Record<string, string> = {
  purchase: "Purchase",
  leave: "Leave",
  expense: "Expense",
  contract: "Contract",
  overtime: "Overtime",
}

function Tile({
  label,
  value,
  suffix,
  tone,
}: {
  label: string
  value: React.ReactNode
  suffix?: string
  tone?: "red"
}) {
  const positive = typeof value === "number" ? value > 0 : true
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
          color: tone === "red" && positive ? "rgba(255,105,97,0.95)" : undefined,
        }}
      >
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

export function ApprovalsClient() {
  const { data, isLoading } = useApprovalAnalytics()
  const byStatus = data?.byStatus
  const maxStatus = Math.max(1, ...STATUS_ROWS.map((r) => byStatus?.[r.key] ?? 0))
  const byType: TypeBucket[] = data?.byType ?? []

  return (
    <div style={{ maxWidth: 840, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>Approvals</h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Analytics · operations · approval queue
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          margin: "24px 0",
        }}
      >
        <Tile label="Open" value={data?.open ?? 0} />
        <Tile label="Stale > 48h" value={data?.stale ?? 0} tone="red" />
        <Tile
          label="Approval rate"
          value={data?.approvalRatePct ?? "—"}
          suffix={data?.approvalRatePct != null ? "%" : undefined}
        />
        <Tile
          label="Avg decision"
          value={data?.avgDecisionHours ?? "—"}
          suffix={data?.avgDecisionHours != null ? "h" : undefined}
        />
      </div>

      {isLoading && <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Loading…</div>}
      {!isLoading && (data?.total ?? 0) === 0 && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>No approval requests yet.</div>
      )}

      {(data?.total ?? 0) > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card title="Status mix">
            {STATUS_ROWS.map((r) => {
              const count = byStatus?.[r.key] ?? 0
              const pct = Math.max(count > 0 ? 5 : 0, (count / maxStatus) * 100)
              const fill =
                r.kind === "red"
                  ? "rgba(255,105,97,0.95)"
                  : r.kind === "amber"
                    ? "rgba(255,190,90,0.92)"
                    : "rgba(255,255,255,0.5)"
              return (
                <div
                  key={r.key}
                  style={{ display: "flex", alignItems: "center", gap: 10, margin: "9px 0" }}
                >
                  <div style={{ width: 82, fontSize: 13, color: "var(--prv-text-2)" }}>
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

          <Card title="By type">
            {byType.map((t, i) => (
              <div
                key={t.type}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "9px 0",
                  borderBottom:
                    i < byType.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
                  fontSize: 13.5,
                }}
              >
                <div>{TYPE_LABEL[t.type] ?? t.type}</div>
                <div style={{ color: "var(--prv-text-3)", fontVariantNumeric: "tabular-nums" }}>
                  {t.count}
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}
