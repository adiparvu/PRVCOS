"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSheetStack } from "@prv/ui"
import type { PayrollRun, PayrollMeta } from "@/app/api/payroll/route"

type FilterType = "Toate" | "Săptămânale" | "Lunare" | "Speciale"

const FILTER_TO_TYPE: Record<FilterType, string | null> = {
  Toate: null,
  Săptămânale: "weekly",
  Lunare: "monthly",
  Speciale: "special",
}

const FILTERS: FilterType[] = ["Toate", "Săptămânale", "Lunare", "Speciale"]

const CHART_MONTHS = [
  { label: "Ian", height: 28 },
  { label: "Feb", height: 30 },
  { label: "Mar", height: 27 },
  { label: "Apr", height: 32 },
  { label: "Mai", height: 35 },
  { label: "Iun", height: 52, isCurrent: true },
]

const g1 = "var(--prv-g1)"
const g2 = "var(--prv-g2)"
const bds = "var(--prv-border-subtle)"
const t2 = "var(--prv-text-2)"
const t3 = "var(--prv-text-3)"
const green = "rgba(48,209,88,0.95)"
const amber = "rgba(255,159,10,0.95)"
const blue = "rgba(10,132,255,0.9)"
const red = "rgba(255,69,58,0.95)"

function fmtAmount(n: number): string {
  if (n >= 1000) return `€${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
  return `€${n.toLocaleString("ro-RO")}`
}

function StatusConfig(status: PayrollRun["status"]): { bg: string; color: string; label: string } {
  if (status === "processing")
    return { bg: "rgba(10,132,255,0.13)", color: blue, label: "Procesare" }
  if (status === "done") return { bg: "rgba(48,209,88,0.13)", color: green, label: "Finalizat" }
  return { bg: "rgba(255,159,10,0.13)", color: amber, label: "Așteptare" }
}

function RunIcon({ status }: { status: PayrollRun["status"] }) {
  if (status === "processing")
    return (
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "rgba(10,132,255,0.10)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(10,132,255,0.85)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
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
          background: "rgba(48,209,88,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(48,209,88,0.80)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
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
        background: "rgba(255,159,10,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(255,159,10,0.85)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    </div>
  )
}

function RunRow({ run }: { run: PayrollRun }) {
  const cfg = StatusConfig(run.status)
  const isProcessing = run.status === "processing"
  const isPending = run.status === "pending"

  const borderStyle: React.CSSProperties = isProcessing
    ? {
        borderLeft: "3px solid transparent",
        borderImage: "linear-gradient(180deg,rgba(10,132,255,.7),rgba(10,132,255,.3)) 1",
        paddingLeft: 13,
      }
    : isPending
      ? {
          borderLeft: "3px solid transparent",
          borderImage: "linear-gradient(180deg,rgba(255,159,10,.7),rgba(255,159,10,.3)) 1",
          paddingLeft: 13,
        }
      : {}

  return (
    <Link
      href={`/payroll/${run.id}`}
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: "13px 14px",
        marginBottom: 8,
        background: g1,
        border: `1px solid ${bds}`,
        borderRadius: 14,
        textDecoration: "none",
        position: "relative",
        ...borderStyle,
      }}
    >
      <RunIcon status={run.status} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--prv-text-1)", margin: 0 }}>
              {run.title}
            </p>
            <p style={{ fontSize: 12, color: t3, margin: "3px 0 0" }}>{run.subtitle}</p>
          </div>
          <span
            style={{
              ...cfg,
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 9px",
              borderRadius: 100,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {cfg.label}
          </span>
        </div>
        <p
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: isProcessing ? blue : isPending ? amber : "var(--prv-text-1)",
            margin: "6px 0 0",
          }}
        >
          €{run.totalGross.toLocaleString("ro-RO")}
        </p>
      </div>
    </Link>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        color: t3,
        padding: "0 2px 8px",
        margin: "6px 0 0",
      }}
    >
      {children}
    </p>
  )
}

export function PayrollListClient() {
  const [filter, setFilter] = useState<FilterType>("Toate")
  const [runs, setRuns] = useState<PayrollRun[]>([])
  const [meta, setMeta] = useState<PayrollMeta | null>(null)
  const { openSheet } = useSheetStack()

  useEffect(() => {
    const typeParam = FILTER_TO_TYPE[filter]
    const url = typeParam ? `/api/payroll?type=${typeParam}` : "/api/payroll"
    fetch(url)
      .then((r) => r.json())
      .then((data: { runs: PayrollRun[]; meta: PayrollMeta }) => {
        setRuns(data.runs)
        if (data.meta) setMeta(data.meta)
      })
  }, [filter])

  const processingRuns = runs.filter((r) => r.status === "processing")
  const doneRuns = runs.filter((r) => r.status === "done")
  const pendingRuns = runs.filter((r) => r.status === "pending")
  const hasPending = (meta?.pendingCount ?? 0) > 0

  function openFab() {
    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: "Acțiuni Salarizare",
      render: (onClose) => (
        <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            {
              label: "Aprobă Rularea",
              sub: "Declanșează plata pentru toți angajații",
              iconBg: "rgba(48,209,88,0.18)",
              rowBg: "rgba(48,209,88,0.10)",
              rowBorder: "rgba(48,209,88,0.2)",
              color: green,
              icon: (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(48,209,88,0.9)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ),
            },
            {
              label: "Corectează Rularea",
              sub: "Modifică salarii, bonusuri sau ore",
              iconBg: "rgba(255,159,10,0.18)",
              rowBg: "rgba(255,159,10,0.10)",
              rowBorder: "rgba(255,159,10,0.2)",
              color: amber,
              icon: (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,159,10,0.9)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              ),
            },
            {
              label: "Fluturași de Salariu",
              sub: "Generează și trimite fluturași angajaților",
              iconBg: "rgba(10,132,255,0.18)",
              rowBg: "rgba(10,132,255,0.10)",
              rowBorder: "rgba(10,132,255,0.2)",
              color: blue,
              icon: (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(10,132,255,0.9)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              ),
            },
            {
              label: "Export",
              sub: "Exportă rulările ca CSV sau PDF",
              iconBg: "rgba(255,255,255,0.10)",
              rowBg: "rgba(255,255,255,0.04)",
              rowBorder: "rgba(255,255,255,0.09)",
              color: "rgba(255,255,255,0.75)",
              icon: (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              ),
            },
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                borderRadius: 14,
                background: btn.rowBg,
                border: `1px solid ${btn.rowBorder}`,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: btn.iconBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {btn.icon}
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: btn.color, margin: 0 }}>
                  {btn.label}
                </p>
                <p style={{ fontSize: 12, color: t3, margin: "2px 0 0" }}>{btn.sub}</p>
              </div>
            </button>
          ))}
        </div>
      ),
    })
  }

  return (
    <div
      style={{
        padding: "16px 16px 120px",
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
          marginBottom: 14,
        }}
      >
        <div>
          <p style={{ fontSize: 13, color: t3, margin: 0 }}>People</p>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--prv-text-1)",
              margin: "2px 0 0",
            }}
          >
            Salarizare
          </h1>
        </div>
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
          {meta?.monthLabel ?? "Iun 2026"}
        </div>
      </div>

      {/* KPI strip */}
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}
      >
        {[
          {
            val: meta ? fmtAmount(meta.currentRunAmount) : "€28.4k",
            label: "Curent",
            color: undefined,
          },
          { val: String(meta?.totalEmployees ?? 142), label: "Angajați", color: green },
          { val: String(meta?.pendingCount ?? 1), label: "Așteptare", color: amber },
          { val: meta ? fmtAmount(meta.ytdCost) : "€327k", label: "YTD", color: undefined },
        ].map((k) => (
          <div
            key={k.label}
            style={{
              padding: "10px 8px 9px",
              borderRadius: 12,
              background: g1,
              border: `1px solid ${bds}`,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 700, color: k.color ?? "var(--prv-text-1)" }}>
              {k.val}
            </div>
            <div style={{ fontSize: 10, fontWeight: 500, color: t3, marginTop: 3 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Monthly bar chart */}
      <div
        style={{
          marginBottom: 12,
          background: "rgba(255,255,255,0.04)",
          border: `1px solid rgba(255,255,255,0.07)`,
          borderRadius: 14,
          padding: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 600, color: t2, margin: 0 }}>
            Cost Lunar Salarizare
          </p>
          {meta && (
            <span style={{ fontSize: 12, color: green, fontWeight: 600 }}>
              +{meta.growthPct}% vs mai
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 52 }}>
          {CHART_MONTHS.map((m) => (
            <div
              key={m.label}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: m.height,
                  borderRadius: 4,
                  background: m.isCurrent ? "rgba(10,132,255,0.6)" : "rgba(255,255,255,0.2)",
                  border: m.isCurrent ? "1px solid rgba(10,132,255,0.3)" : "none",
                }}
              />
              <span style={{ fontSize: 10, color: m.isCurrent ? "rgba(255,255,255,0.7)" : t3 }}>
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Amber alert for pending approval */}
      {hasPending && (
        <div
          style={{
            marginBottom: 12,
            background: "rgba(255,159,10,0.08)",
            border: "1px solid rgba(255,159,10,0.22)",
            borderRadius: 12,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,159,10,0.9)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span style={{ fontSize: 13, color: amber, fontWeight: 500 }}>
            Bonus Q1 — necesită aprobare Director
          </span>
        </div>
      )}

      {/* Filter chips */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 14,
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 14px",
              borderRadius: 100,
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
              flexShrink: 0,
              cursor: "pointer",
              border:
                filter === f
                  ? "1px solid rgba(255,255,255,0.22)"
                  : `1px solid rgba(255,255,255,0.09)`,
              background: filter === f ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
              color: filter === f ? "var(--prv-text-1)" : t3,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Sections */}
      {processingRuns.length > 0 && (
        <>
          <SectionLabel>{`În Curs · ${processingRuns.length}`}</SectionLabel>
          {processingRuns.map((r) => (
            <RunRow key={r.id} run={r} />
          ))}
        </>
      )}

      {doneRuns.length > 0 && (
        <>
          <SectionLabel>Finalizate</SectionLabel>
          {doneRuns.map((r) => (
            <RunRow key={r.id} run={r} />
          ))}
        </>
      )}

      {pendingRuns.length > 0 && (
        <>
          <SectionLabel>{`În Așteptare · ${pendingRuns.length}`}</SectionLabel>
          {pendingRuns.map((r) => (
            <RunRow key={r.id} run={r} />
          ))}
        </>
      )}

      {runs.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 16px", color: t3, fontSize: 14 }}>
          Nicio rulare găsită
        </div>
      )}

      {/* FAB */}
      <button
        onClick={openFab}
        style={{
          position: "fixed",
          bottom: 88,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.14)",
          border: "1px solid rgba(255,255,255,0.22)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.25)",
          backdropFilter: "blur(20px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 50,
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  )
}
