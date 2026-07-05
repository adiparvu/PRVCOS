"use client"

import { useEmployeeRoi, type EmployeeRoiResponse } from "@/lib/api-hooks"

type Row = EmployeeRoiResponse["employees"][number]

function eur(n: number): string {
  if (Math.abs(n) >= 1000)
    return `€${(n / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k`
  return `€${Math.round(n)}`
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? "—").toUpperCase()
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase()
}

const BAND: Record<string, { label: string; cls: "high" | "low" | "none" | "steady" }> = {
  high: { label: "High", cls: "high" },
  steady: { label: "Steady", cls: "steady" },
  low: { label: "Low", cls: "low" },
  no_output: { label: "No output", cls: "none" },
}

function Tile({ label, value, tone }: { label: string; value: string | number; tone?: "amber" }) {
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
          color: tone === "amber" && Number(value) > 0 ? "rgba(255,190,90,0.92)" : undefined,
        }}
      >
        {value}
      </div>
    </div>
  )
}

const numCell = {
  fontSize: 13,
  fontVariantNumeric: "tabular-nums" as const,
  textAlign: "right" as const,
}

function EmpRow({ e, last }: { e: Row; last: boolean }) {
  const b = BAND[e.band] ?? BAND.steady!
  const badgeStyle =
    b.cls === "high"
      ? {
          color: "var(--prv-text-1)",
          border: "1px solid rgba(255,255,255,0.28)",
          background: "var(--prv-g3)",
        }
      : b.cls === "low"
        ? {
            color: "rgba(255,190,90,0.92)",
            border: "1px solid rgba(255,176,64,0.32)",
            background: "rgba(255,176,64,0.1)",
          }
        : b.cls === "none"
          ? {
              color: "rgba(255,190,90,0.92)",
              border: "1px solid rgba(255,176,64,0.32)",
              background: "rgba(255,176,64,0.06)",
            }
          : {
              color: "var(--prv-text-3)",
              border: "1px solid var(--prv-border)",
              background: "transparent",
            }
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1.4fr 1fr 1fr 1fr auto",
        gap: 10,
        alignItems: "center",
        padding: "12px 14px",
        borderBottom: last ? "0" : "1px solid var(--prv-border-subtle)",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "var(--prv-g3)",
          border: "1px solid var(--prv-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 600,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
        }}
      >
        {initials(e.name)}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 560, minWidth: 0 }}>{e.name}</div>
      <div style={numCell}>{eur(e.payrollCost)}</div>
      <div style={numCell}>{e.tasksCompleted}</div>
      <div style={numCell}>{e.costPerTask === null ? "—" : eur(e.costPerTask)}</div>
      <span
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          borderRadius: 6,
          padding: "3px 8px",
          whiteSpace: "nowrap",
          textAlign: "center",
          ...badgeStyle,
        }}
      >
        {b.label}
      </span>
    </div>
  )
}

export function EmployeeRoiClient() {
  const { data, isLoading } = useEmployeeRoi()
  const employees = data?.employees ?? []

  return (
    <div style={{ maxWidth: 840, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>Employee ROI</h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Analytics · cross-module BI · payroll cost vs completed tasks
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          margin: "24px 0",
        }}
      >
        <Tile label="Payroll cost" value={eur(data?.totalCost ?? 0)} />
        <Tile label="Tasks done" value={data?.totalTasks ?? 0} />
        <Tile
          label="Avg cost/task"
          value={
            data?.avgCostPerTask === null || data?.avgCostPerTask === undefined
              ? "—"
              : eur(data.avgCostPerTask)
          }
        />
        <Tile label="No output" value={data?.noOutputCount ?? 0} tone="amber" />
      </div>

      {isLoading && <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Loading…</div>}
      {!isLoading && employees.length === 0 && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>No payroll data yet.</div>
      )}

      {employees.length > 0 && (
        <div
          style={{
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border)",
            borderRadius: 22,
            padding: "8px 8px 4px",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 24px 64px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1.4fr 1fr 1fr 1fr auto",
              gap: 10,
              padding: "12px 14px",
              color: "var(--prv-text-3)",
              fontSize: 10.5,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 560,
              borderBottom: "1px solid var(--prv-border-subtle)",
            }}
          >
            <div />
            <div>Employee</div>
            <div style={{ textAlign: "right" }}>Cost</div>
            <div style={{ textAlign: "right" }}>Tasks</div>
            <div style={{ textAlign: "right" }}>Cost/task</div>
            <div>Output</div>
          </div>
          {employees.map((e, i) => (
            <EmpRow key={e.userId} e={e} last={i === employees.length - 1} />
          ))}
        </div>
      )}
    </div>
  )
}
