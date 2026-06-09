"use client"

import { useState } from "react"
import Link from "next/link"
import { usePayrollRuns } from "@/lib/api-hooks"
import type { PayrollRun, PayrollRunStatus, PayrollRunType } from "@/app/api/payroll/route"

type FilterType = "All Runs" | "Weekly" | "Monthly" | "Special"

const FILTERS: FilterType[] = ["All Runs", "Weekly", "Monthly", "Special"]

const g1 = "var(--prv-g1)"
const g2 = "var(--prv-g2)"
const bds = "var(--prv-border-subtle)"
const t2 = "var(--prv-text-2)"
const t3 = "var(--prv-text-3)"
const green = "rgba(48,209,88,0.95)"
const red = "rgba(255,69,58,0.95)"
const amber = "rgba(255,159,10,0.95)"
const blue = "rgba(10,132,255,0.9)"

const card: React.CSSProperties = {
  background: g1,
  border: `1px solid ${bds}`,
  borderRadius: 18,
  position: "relative",
  overflow: "hidden",
  marginBottom: 12,
}

// Map API status (lowercase) to display label
const STATUS_DISPLAY: Record<PayrollRunStatus, string> = {
  processing: "Processing",
  done: "Done",
  pending: "Pending",
}

// Map API type (lowercase) to display label
const TYPE_DISPLAY: Record<PayrollRunType, FilterType> = {
  weekly: "Weekly",
  monthly: "Monthly",
  special: "Special",
}

function StatusPill({ status }: { status: PayrollRunStatus }) {
  const styles: Record<PayrollRunStatus, React.CSSProperties> = {
    done: { background: "rgba(48,209,88,0.14)", color: green },
    pending: { background: "rgba(255,159,10,0.14)", color: amber },
    processing: { background: "rgba(10,132,255,0.14)", color: blue },
  }
  return (
    <span
      style={{
        ...styles[status],
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 6,
      }}
    >
      {STATUS_DISPLAY[status]}
    </span>
  )
}

function RunIcon({ status }: { status: PayrollRunStatus }) {
  if (status === "processing")
    return (
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "rgba(10,132,255,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(10,132,255,0.9)"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
    )
  if (status === "done")
    return (
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "rgba(48,209,88,0.10)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(48,209,88,0.85)"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    )
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: "rgba(255,159,10,0.10)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(255,159,10,0.9)"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    </div>
  )
}

function TopEdge() {
  return (
    <div
      style={{
        position: "absolute",
        inset: "0 0 auto",
        height: 1,
        background: "linear-gradient(90deg,transparent,var(--prv-border),transparent)",
      }}
    />
  )
}

function fmtAmount(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `€${Math.round(n / 1_000)}K`
  return `€${n.toLocaleString()}`
}

export function PayrollWorkspace() {
  const [filter, setFilter] = useState<FilterType>("All Runs")
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null)

  const { data, isLoading } = usePayrollRuns()
  const runs = data?.runs ?? []
  const meta = data?.meta ?? null

  const now = new Date()
  const monthLabel =
    meta?.monthLabel ??
    now.toLocaleDateString("en-US", { month: "long", year: "numeric" })

  const filteredRuns = runs.filter(
    (r) => filter === "All Runs" || TYPE_DISPLAY[r.type] === filter
  )

  // Compute monthly chart bars from runs data: group by month, compute normalized heights
  const monthTotals: Record<string, number> = {}
  for (const run of runs) {
    // Use period string first word as month label approximation, or derive from title
    const monthKey = run.period.slice(0, 3) // e.g. "Ian", "Feb", etc.
    monthTotals[monthKey] = (monthTotals[monthKey] ?? 0) + run.totalGross
  }
  const monthEntries = Object.entries(monthTotals).slice(-6)
  const maxTotal = Math.max(...monthEntries.map(([, v]) => v), 1)
  const chartMonths =
    monthEntries.length > 0
      ? monthEntries.map(([label, total]) => ({
          label,
          height: Math.round((total / maxTotal) * 100),
          isMax: total === maxTotal,
        }))
      : [
          { label: "—", height: 50, isMax: false },
          { label: "—", height: 55, isMax: false },
          { label: "—", height: 50, isMax: false },
          { label: "—", height: 58, isMax: false },
          { label: "—", height: 60, isMax: false },
          { label: "—", height: 100, isMax: true },
        ]

  if (selectedRun) {
    return (
      <div
        style={{
          padding: "32px 16px 120px",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        {/* Back + header */}
        <button
          onClick={() => setSelectedRun(null)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            color: t2,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            marginBottom: 20,
            padding: 0,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Payroll Runs
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div>
            <p style={{ fontSize: 13, color: t3, marginBottom: 2 }}>Run Detail</p>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--prv-text-1)",
              }}
            >
              {selectedRun.title}
            </h1>
            <p style={{ fontSize: 13, color: t2, marginTop: 4 }}>{selectedRun.subtitle}</p>
          </div>
          <StatusPill status={selectedRun.status} />
        </div>

        {/* Financial summary */}
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: t3,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            margin: "0 2px 10px",
          }}
        >
          Summary
        </p>
        <div style={card}>
          <TopEdge />
          {[
            { label: "Gross Payroll", val: `€${selectedRun.totalGross.toLocaleString()}`, valColor: undefined },
            { label: "Net Paid to Employees", val: `€${selectedRun.netPaid.toLocaleString()}`, valColor: green },
            { label: "Period", val: selectedRun.period, valColor: undefined },
            { label: "Employees", val: String(selectedRun.employeeCount), valColor: undefined },
            { label: "Ref", val: selectedRun.ref, valColor: undefined },
          ].map((row, i, arr) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                borderBottom: i < arr.length - 1 ? `1px solid ${bds}` : "none",
              }}
            >
              <span style={{ fontSize: 13, color: t2 }}>{row.label}</span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: row.valColor ?? "var(--prv-text-1)",
                }}
              >
                {row.val}
              </span>
            </div>
          ))}
        </div>

        {/*
          NOTE: Individual employee payslips are not yet available via the API.
          The /api/payroll endpoint returns run-level aggregates only.
          Employee payslip detail will be available in a future release.
        */}
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: t3,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            margin: "18px 2px 10px",
          }}
        >
          Employee Payslips ({selectedRun.employeeCount})
        </p>
        <div style={card}>
          <TopEdge />
          <div
            style={{
              padding: "24px 16px",
              textAlign: "center",
              color: t3,
              fontSize: 13,
            }}
          >
            Employee payslips available in next release
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        padding: "32px 16px 120px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <p style={{ fontSize: 13, color: t3, marginBottom: 2 }}>People</p>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--prv-text-1)",
            }}
          >
            Payroll
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              padding: "6px 12px",
              borderRadius: 10,
              background: g1,
              border: `1px solid ${bds}`,
              fontSize: 12,
              fontWeight: 500,
              color: t2,
            }}
          >
            {monthLabel}
          </div>
          <Link
            href="/payroll/new"
            style={{
              width: 32,
              height: 32,
              borderRadius: 100,
              background: "rgba(255,255,255,0.92)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#000",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Link>
        </div>
      </div>

      {/* KPI strip */}
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}
      >
        {[
          {
            val: meta ? fmtAmount(meta.currentRunAmount) : isLoading ? "…" : "—",
            label: "This Run",
            color: undefined,
          },
          {
            val: meta ? String(meta.totalEmployees) : isLoading ? "…" : "—",
            label: "Employees",
            color: green,
          },
          {
            val: meta ? String(meta.pendingCount) : isLoading ? "…" : "—",
            label: "Pending",
            color: amber,
          },
          {
            val: meta ? fmtAmount(meta.ytdCost) : isLoading ? "…" : "—",
            label: "YTD Cost",
            color: undefined,
          },
        ].map((k) => (
          <div
            key={k.label}
            style={{
              padding: "12px 8px",
              borderRadius: 14,
              background: g1,
              border: `1px solid ${bds}`,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 700, color: k.color ?? "var(--prv-text-1)" }}>
              {k.val}
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: t3,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginTop: 3,
              }}
            >
              {k.label}
            </div>
          </div>
        ))}
      </div>

      {/* Monthly cost mini-chart */}
      <div style={{ ...card, padding: "14px 14px 10px" }}>
        <TopEdge />
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: t3,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            marginBottom: 12,
          }}
        >
          Monthly Payroll Cost
        </p>
        <div
          style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 60, marginBottom: 8 }}
        >
          {chartMonths.map((m, idx) => (
            <div
              key={idx}
              style={{
                flex: 1,
                borderRadius: "3px 3px 0 0",
                height: `${m.height}%`,
                background: m.isMax ? "var(--prv-text-2)" : "var(--prv-text-3)",
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          {chartMonths.map((m, idx) => (
            <div key={idx} style={{ flex: 1, fontSize: 9, color: t3, textAlign: "center" }}>
              {m.label}
            </div>
          ))}
        </div>
      </div>

      {/* Segmented filter */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: 4,
          background: g1,
          border: `1px solid ${bds}`,
          borderRadius: 12,
          marginBottom: 14,
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              flex: 1,
              padding: "6px 0",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              color: filter === f ? "var(--prv-text-1)" : t3,
              background: filter === f ? g2 : "transparent",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Run list */}
      <div style={card}>
        <TopEdge />
        {isLoading ? (
          <div style={{ padding: "24px 16px", textAlign: "center", color: t3, fontSize: 13 }}>
            Loading payroll runs…
          </div>
        ) : filteredRuns.length === 0 ? (
          <div style={{ padding: "24px 16px", textAlign: "center", color: t3, fontSize: 13 }}>
            No runs found
          </div>
        ) : (
          filteredRuns.map((run, i) => (
            <button
              key={run.id}
              onClick={() => setSelectedRun(run)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 16px",
                borderBottom: i < filteredRuns.length - 1 ? `1px solid ${bds}` : "none",
                width: "100%",
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                borderRadius:
                  i === 0 ? "18px 18px 0 0" : i === filteredRuns.length - 1 ? "0 0 18px 18px" : 0,
              }}
            >
              <RunIcon status={run.status} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--prv-text-1)" }}>
                  {run.title}
                </div>
                <div style={{ fontSize: 12, color: t3, marginTop: 2 }}>{run.subtitle}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--prv-text-1)",
                    marginBottom: 4,
                  }}
                >
                  €{run.totalGross.toLocaleString()}
                </div>
                <StatusPill status={run.status} />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
