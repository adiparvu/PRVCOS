"use client"

import Link from "next/link"
import { useModuleStatus, type ModuleStatusResponse } from "@/lib/api-hooks"

type Tile = ModuleStatusResponse["modules"][number]

function relTime(iso: string | null): string {
  if (!iso) return "No activity"
  const ms = Date.now() - Date.parse(iso)
  if (!Number.isFinite(ms) || ms < 0) return "just now"
  const min = Math.floor(ms / 60000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

function Tile({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  tone?: "red"
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
      <div
        style={{
          fontSize: 24,
          fontWeight: 680,
          marginTop: 8,
          letterSpacing: "-0.02em",
          color: tone === "red" ? "rgba(255,105,97,0.95)" : undefined,
        }}
      >
        {value}
        {sub}
      </div>
    </div>
  )
}

function ModuleCard({ m }: { m: Tile }) {
  const dot =
    m.state === "alert"
      ? { background: "rgba(255,105,97,0.95)", boxShadow: "0 0 10px rgba(255,105,97,0.95)" }
      : m.state === "active"
        ? { background: "rgba(255,255,255,0.85)", boxShadow: "0 0 9px rgba(255,255,255,0.4)" }
        : { background: "rgba(255,255,255,0.32)", boxShadow: "none" }
  const stateLabel = m.state.charAt(0).toUpperCase() + m.state.slice(1)
  return (
    <Link
      href={m.href}
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border)",
        borderRadius: 18,
        padding: "16px 17px",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
        textDecoration: "none",
        color: "inherit",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minHeight: 104,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", flexShrink: 0, ...dot }} />
        <span style={{ fontSize: 14.5, fontWeight: 600 }}>{m.label}</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 9.5,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: m.state === "alert" ? "rgba(255,105,97,0.95)" : "var(--prv-text-3)",
          }}
        >
          {stateLabel}
        </span>
      </div>
      <div
        style={{
          color: "var(--prv-text-3)",
          fontSize: 12,
          marginTop: "auto",
          display: "flex",
          gap: 12,
        }}
      >
        {m.state === "idle" ? (
          <span>No activity</span>
        ) : (
          <>
            <span>
              <b style={{ color: "var(--prv-text-2)", fontWeight: 560 }}>{m.events}</b> events
            </span>
            {m.failures > 0 ? (
              <span style={{ color: "rgba(255,105,97,0.95)" }}>
                <b style={{ fontWeight: 560 }}>{m.failures}</b> failures
              </span>
            ) : (
              <span>{relTime(m.lastActivity)}</span>
            )}
          </>
        )}
      </div>
    </Link>
  )
}

export function ModuleStatusClient() {
  const { data, isLoading } = useModuleStatus()
  const modules = data?.modules ?? []
  const total = modules.length

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>Module Status</h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Command Center · operational health · last {data?.windowHours ?? 24} hours
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
          margin: "24px 0",
        }}
      >
        <Tile
          label="Active modules"
          value={data?.summary.activeModules ?? 0}
          sub={<span style={{ fontSize: 13, color: "var(--prv-text-3)" }}>/{total}</span>}
        />
        <Tile
          label="Events (24h)"
          value={(data?.summary.totalEvents ?? 0).toLocaleString("en-US")}
        />
        <Tile
          label="Access failures"
          value={data?.summary.totalFailures ?? 0}
          tone={(data?.summary.totalFailures ?? 0) > 0 ? "red" : undefined}
        />
      </div>

      {isLoading ? (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Loading…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {modules.map((m) => (
            <ModuleCard key={m.key} m={m} />
          ))}
        </div>
      )}
    </div>
  )
}
