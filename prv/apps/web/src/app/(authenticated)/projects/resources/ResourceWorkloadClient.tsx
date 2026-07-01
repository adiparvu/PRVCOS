"use client"

import { useWorkload, type WorkloadRow } from "@/lib/api-hooks"

// ── Utilization band styling ────────────────────────────────────────────────
const BAND_FILL: Record<WorkloadRow["band"], string> = {
  under: "rgba(255,255,255,0.32)",
  optimal: "rgba(255,255,255,0.6)",
  full: "rgba(255,255,255,0.85)",
  over: "rgba(255,69,58,0.9)",
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?"
}

function Stat({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: "14px 16px",
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--prv-text-3)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          marginTop: 6,
          color: warn ? "rgba(255,69,58,0.9)" : "var(--prv-text-1)",
        }}
      >
        {value}
      </div>
    </div>
  )
}

function PersonRow({ person, scale }: { person: WorkloadRow; scale: number }) {
  const widthPct = Math.min(100, (person.totalPercentage / scale) * 100)
  return (
    <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--prv-border-subtle)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "var(--prv-g2)",
            display: "grid",
            placeItems: "center",
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          {initials(person.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 640, letterSpacing: "-0.01em" }}>
            {person.name}
          </div>
          {person.jobTitle && (
            <div style={{ fontSize: 11.5, color: "var(--prv-text-3)", marginTop: 2 }}>
              {person.jobTitle}
            </div>
          )}
        </div>
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            color: person.band === "over" ? "rgba(255,69,58,0.9)" : "var(--prv-text-1)",
          }}
        >
          {person.totalPercentage}%
        </span>
        {person.band === "over" && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              borderRadius: 100,
              padding: "3px 8px",
              marginLeft: 8,
              color: "rgba(255,69,58,0.9)",
              background: "rgba(255,69,58,0.16)",
              border: "1px solid rgba(255,69,58,0.3)",
            }}
          >
            Over
          </span>
        )}
        {person.band === "under" && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              borderRadius: 100,
              padding: "3px 8px",
              marginLeft: 8,
              color: "var(--prv-text-3)",
              border: "1px solid var(--prv-border)",
            }}
          >
            Available
          </span>
        )}
      </div>

      <div
        style={{
          height: 8,
          borderRadius: 100,
          background: "rgba(255,255,255,0.08)",
          marginTop: 11,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${widthPct}%`,
            borderRadius: 100,
            background: BAND_FILL[person.band],
            transition: "width 0.4s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        />
      </div>

      {person.projects.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 7 }}>
          {person.projects.map((p) => (
            <div
              key={p.projectId}
              style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--prv-text-3)",
                  flexShrink: 0,
                }}
              />
              <span style={{ color: "var(--prv-text-2)", flex: 1 }}>
                {p.projectName}
                {p.roleLabel ? ` · ${p.roleLabel}` : ""}
              </span>
              <span style={{ color: "var(--prv-text-3)", fontVariantNumeric: "tabular-nums" }}>
                {p.allocationPercentage}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ResourceWorkloadClient() {
  const { data, isLoading } = useWorkload()
  const people = data?.people ?? []
  const summary = data?.summary
  // Bars over 100% scale against the busiest person so overflow stays visible.
  const scale = Math.max(100, ...people.map((p) => p.totalPercentage))

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "8px 4px 60px" }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--prv-text-3)",
        }}
      >
        Projects · Resources
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 680, letterSpacing: "-0.02em", margin: "3px 0 22px" }}>
        Resource Workload
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          marginBottom: 22,
        }}
      >
        <Stat label="People" value={summary?.people ?? 0} />
        <Stat
          label="Over-allocated"
          value={summary?.overAllocated ?? 0}
          warn={!!summary?.overAllocated}
        />
        <Stat label="Under-utilized" value={summary?.underUtilized ?? 0} />
        <Stat label="Avg utilization" value={`${summary?.averageUtilization ?? 0}%`} />
      </div>

      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--prv-text-3)",
          margin: "0 4px 12px",
        }}
      >
        Team · by utilization
      </div>

      <div
        style={{
          borderRadius: 22,
          overflow: "hidden",
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
        }}
      >
        {isLoading ? (
          <p
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--prv-text-4)",
              fontSize: 14,
            }}
          >
            Loading workload…
          </p>
        ) : people.length === 0 ? (
          <p
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--prv-text-4)",
              fontSize: 14,
            }}
          >
            No active allocations yet. Assign team members to projects to see utilization here.
          </p>
        ) : (
          people.map((p) => <PersonRow key={p.userId} person={p} scale={scale} />)
        )}
      </div>
    </div>
  )
}
