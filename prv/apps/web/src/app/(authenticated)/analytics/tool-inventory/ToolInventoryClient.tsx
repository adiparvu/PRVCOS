"use client"

import { useToolInventory, type ToolInventoryResponse } from "@/lib/api-hooks"

type Category = ToolInventoryResponse["byCategory"][number]

const STATUS_ROWS: {
  key: "inUse" | "available" | "maintenance" | "lost" | "retired"
  label: string
  kind: "plain" | "amber" | "red"
}[] = [
  { key: "inUse", label: "In use", kind: "plain" },
  { key: "available", label: "Available", kind: "plain" },
  { key: "maintenance", label: "Maintenance", kind: "amber" },
  { key: "lost", label: "Lost", kind: "red" },
  { key: "retired", label: "Retired", kind: "plain" },
]

function Tile({
  label,
  value,
  suffix,
  tone,
}: {
  label: string
  value: React.ReactNode
  suffix?: string
  tone?: "amber" | "red"
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
          fontSize: 24,
          fontWeight: 680,
          marginTop: 8,
          letterSpacing: "-0.02em",
          color:
            tone === "red" && positive
              ? "rgba(255,105,97,0.95)"
              : tone === "amber" && positive
                ? "rgba(255,190,90,0.92)"
                : undefined,
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

function StatusBar({
  label,
  kind,
  count,
  max,
}: {
  label: string
  kind: "plain" | "amber" | "red"
  count: number
  max: number
}) {
  const pct = max > 0 ? Math.max(count > 0 ? 5 : 0, (count / max) * 100) : 0
  const fill =
    kind === "red"
      ? "rgba(255,105,97,0.95)"
      : kind === "amber"
        ? "rgba(255,190,90,0.92)"
        : "rgba(255,255,255,0.5)"
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0" }}>
      <div style={{ width: 96, fontSize: 13, color: "var(--prv-text-2)" }}>{label}</div>
      <div
        style={{
          flex: 1,
          height: 8,
          borderRadius: 99,
          background: "var(--prv-g3)",
          overflow: "hidden",
        }}
      >
        <div style={{ height: "100%", borderRadius: 99, background: fill, width: `${pct}%` }} />
      </div>
      <div
        style={{ width: 24, textAlign: "right", fontSize: 13, fontVariantNumeric: "tabular-nums" }}
      >
        {count}
      </div>
    </div>
  )
}

export function ToolInventoryClient() {
  const { data, isLoading } = useToolInventory()
  const counts = {
    inUse: data?.inUse ?? 0,
    available: data?.available ?? 0,
    maintenance: data?.maintenance ?? 0,
    lost: data?.lost ?? 0,
    retired: data?.retired ?? 0,
  }
  const maxStatus = Math.max(1, ...STATUS_ROWS.map((r) => counts[r.key]))
  const byCategory: Category[] = data?.byCategory ?? []

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>Tool Inventory</h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Analytics · tool management · availability
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
          label="Utilization"
          value={data?.utilizationPct ?? "—"}
          suffix={data?.utilizationPct != null ? "%" : undefined}
        />
        <Tile label="Available" value={data?.available ?? 0} />
        <Tile label="Lost" value={data?.lost ?? 0} tone="red" />
        <Tile label="Warranty ≤30d" value={data?.warrantyExpiring ?? 0} tone="amber" />
      </div>

      {isLoading && <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Loading…</div>}
      {!isLoading && (data?.total ?? 0) === 0 && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>No tools in the register.</div>
      )}

      {(data?.total ?? 0) > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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
              Status mix
            </h2>
            {STATUS_ROWS.map((r) => (
              <StatusBar
                key={r.key}
                label={r.label}
                kind={r.kind}
                count={counts[r.key]}
                max={maxStatus}
              />
            ))}
          </div>

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
              By category · in use / total
            </h2>
            {byCategory.map((c, i) => (
              <div
                key={c.category}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "9px 0",
                  borderBottom:
                    i < byCategory.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
                  fontSize: 13.5,
                }}
              >
                <div>{c.category}</div>
                <div style={{ color: "var(--prv-text-3)", fontVariantNumeric: "tabular-nums" }}>
                  {c.inUse} / {c.total}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
