"use client"

import { useTaskDelivery, type TaskDeliveryResponse } from "@/lib/api-hooks"

type Priority = TaskDeliveryResponse["byPriority"][number]

const STATUS_ROWS: { key: keyof TaskDeliveryResponse["byStatus"]; label: string }[] = [
  { key: "done", label: "Done" },
  { key: "in_progress", label: "In progress" },
  { key: "todo", label: "Todo" },
  { key: "review", label: "Review" },
  { key: "backlog", label: "Backlog" },
  { key: "cancelled", label: "Cancelled" },
]

const PRIORITY_LABEL: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
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

export function TaskDeliveryClient() {
  const { data, isLoading } = useTaskDelivery()
  const byStatus = data?.byStatus
  const maxStatus = Math.max(1, ...STATUS_ROWS.map((r) => byStatus?.[r.key] ?? 0))
  const byPriority: Priority[] = data?.byPriority ?? []
  const maxOpen = Math.max(1, ...byPriority.map((p) => p.open))

  return (
    <div style={{ maxWidth: 840, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>Task Delivery</h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Analytics · projects · execution health
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          margin: "24px 0",
        }}
      >
        <Tile
          label="Completion"
          value={data?.completionRatePct ?? "—"}
          suffix={data?.completionRatePct != null ? "%" : undefined}
        />
        <Tile
          label="On-time"
          value={data?.onTimeRatePct ?? "—"}
          suffix={data?.onTimeRatePct != null ? "%" : undefined}
        />
        <Tile label="Overdue" value={data?.overdue ?? 0} tone="red" />
        <Tile label="Open tasks" value={data?.open ?? 0} />
      </div>

      {isLoading && <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Loading…</div>}
      {!isLoading && (data?.total ?? 0) === 0 && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>No project tasks yet.</div>
      )}

      {(data?.total ?? 0) > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card title="Status mix">
            {STATUS_ROWS.map((r) => {
              const count = byStatus?.[r.key] ?? 0
              const pct = Math.max(count > 0 ? 5 : 0, (count / maxStatus) * 100)
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
                        background: "rgba(255,255,255,0.5)",
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

          <Card title="Open work by priority">
            {byPriority.map((p) => {
              const isCritical = p.priority === "critical"
              const fill = isCritical ? "rgba(255,105,97,0.95)" : "rgba(255,190,90,0.92)"
              return (
                <div
                  key={p.priority}
                  style={{ display: "flex", alignItems: "center", gap: 10, margin: "11px 0" }}
                >
                  <div style={{ width: 70, fontSize: 13, color: "var(--prv-text-2)" }}>
                    {PRIORITY_LABEL[p.priority] ?? p.priority}
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
                        width: `${Math.max(p.open > 0 ? 5 : 0, (p.open / maxOpen) * 100)}%`,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      marginLeft: "auto",
                      fontSize: 12.5,
                      fontVariantNumeric: "tabular-nums",
                      color: "var(--prv-text-2)",
                    }}
                  >
                    {p.open} / {p.total}
                  </div>
                </div>
              )
            })}
          </Card>
        </div>
      )}
    </div>
  )
}
