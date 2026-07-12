"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSheetStack, useToast } from "@prv/ui"
import type { PayrollRunDetail } from "@/app/api/payroll/[id]/route"

const g1 = "var(--prv-g1)"
const bds = "var(--prv-border-subtle)"
const t2 = "var(--prv-text-2)"
const t3 = "var(--prv-text-3)"
const green = "rgba(48,209,88,0.95)"
const amber = "rgba(255,159,10,0.95)"
const blue = "rgba(10,132,255,0.9)"
const red = "rgba(255,69,58,0.95)"

function StatusConfig(status: PayrollRunDetail["status"]): {
  bg: string
  color: string
  label: string
} {
  if (status === "processing")
    return { bg: "rgba(10,132,255,0.13)", color: blue, label: "Processing" }
  if (status === "done") return { bg: "rgba(48,209,88,0.13)", color: green, label: "Completed" }
  return { bg: "rgba(255,159,10,0.13)", color: amber, label: "Pending" }
}

function SectionCard({
  title,
  children,
  badge,
}: {
  title: string
  children: React.ReactNode
  badge?: React.ReactNode
}) {
  return (
    <div
      style={{
        margin: "12px 0 0",
        background: g1,
        border: `1px solid ${bds}`,
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "0 0 auto",
          height: 1,
          background: "linear-gradient(90deg,transparent,var(--prv-border),transparent)",
        }}
      />
      <div
        style={{
          padding: "12px 16px 10px",
          fontSize: 13,
          fontWeight: 700,
          color: "rgba(255,255,255,0.75)",
          borderBottom: `1px solid rgba(255,255,255,0.06)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>{title}</span>
        {badge}
      </div>
      {children}
    </div>
  )
}

function InfoRow({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "11px 16px",
        borderBottom: `1px solid rgba(255,255,255,0.05)`,
      }}
    >
      <span style={{ fontSize: 13, color: t3 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: valueColor ?? "var(--prv-text-1)" }}>
        {value}
      </span>
    </div>
  )
}

export function PayrollRunDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const { openSheet } = useSheetStack()
  const { toast } = useToast()
  const [run, setRun] = useState<PayrollRunDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const loadRun = useCallback(() => {
    return fetch(`/api/payroll/${id}`)
      .then((r) => r.json())
      .then((data: PayrollRunDetail) => setRun(data))
  }, [id])

  useEffect(() => {
    loadRun().finally(() => setLoading(false))
  }, [loadRun])

  const runAction = useCallback(
    (action: "start_processing" | "mark_done") => {
      setSubmitting(true)
      fetch(`/api/payroll/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      })
        .then(async (r) => {
          if (!r.ok) throw new Error("Action failed")
          await loadRun()
        })
        .catch(() => toast.error("Couldn't update run", "Please try again."))
        .finally(() => setSubmitting(false))
    },
    [id, loadRun, toast]
  )

  function openFab() {
    if (!run) return
    const isActionable = run.status === "processing" || run.status === "pending"
    const isPending = run.status === "pending"
    const primaryAction: "start_processing" | "mark_done" = isPending
      ? "start_processing"
      : "mark_done"
    const primaryLabel = isPending ? "Start Processing" : "Approve Run"
    const primarySub = isPending
      ? "Begin processing this payroll run"
      : "Trigger payment for all employees"
    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: "Payroll Run Actions",
      render: (onClose) => (
        <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
          {isActionable && (
            <button
              disabled={submitting}
              onClick={() => {
                runAction(primaryAction)
                onClose()
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                borderRadius: 14,
                background: "rgba(48,209,88,0.10)",
                border: "1px solid rgba(48,209,88,0.2)",
                cursor: submitting ? "default" : "pointer",
                opacity: submitting ? 0.6 : 1,
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "rgba(48,209,88,0.18)",
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
                  stroke="rgba(48,209,88,0.9)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: green, margin: 0 }}>
                  {primaryLabel}
                </p>
                <p style={{ fontSize: 12, color: t3, margin: "2px 0 0" }}>{primarySub}</p>
              </div>
            </button>
          )}
          {isActionable && (
            <button
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                borderRadius: 14,
                background: "rgba(255,159,10,0.10)",
                border: "1px solid rgba(255,159,10,0.2)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "rgba(255,159,10,0.18)",
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
                  strokeLinejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: amber, margin: 0 }}>
                  Correct Runa
                </p>
                <p style={{ fontSize: 12, color: t3, margin: "2px 0 0" }}>
                  Modify salaries, bonuses, or hours
                </p>
              </div>
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 16px",
              borderRadius: 14,
              background: "rgba(10,132,255,0.10)",
              border: "1px solid rgba(10,132,255,0.2)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(10,132,255,0.18)",
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
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: blue, margin: 0 }}>Pay Slips</p>
              <p style={{ fontSize: 12, color: t3, margin: "2px 0 0" }}>
                Generate and send pay slips to employees
              </p>
            </div>
          </button>
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 16px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(255,255,255,0.10)",
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
                stroke="rgba(255,255,255,0.7)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <div>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.75)",
                  margin: 0,
                }}
              >
                Export
              </p>
              <p style={{ fontSize: 12, color: t3, margin: "2px 0 0" }}>Export run as CSV or PDF</p>
            </div>
          </button>
          {isActionable && (
            <button
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                borderRadius: 14,
                background: "rgba(255,69,58,0.08)",
                border: "1px solid rgba(255,69,58,0.15)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "rgba(255,69,58,0.14)",
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
                  stroke="rgba(255,69,58,0.9)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: red, margin: 0 }}>Cancel Run</p>
                <p style={{ fontSize: 12, color: t3, margin: "2px 0 0" }}>
                  Cancel and return to editing
                </p>
              </div>
            </button>
          )}
        </div>
      ),
    })
  }

  if (loading || !run) {
    return (
      <div style={{ padding: "16px 16px 120px" }}>
        {[
          { w: "60%", h: 14 },
          { w: "100%", h: 22 },
          { w: "80%", h: 14 },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              height: s.h,
              width: s.w,
              background: "rgba(255,255,255,0.07)",
              borderRadius: 6,
              marginBottom: 10,
            }}
          />
        ))}
        <div
          style={{
            height: 80,
            background: "rgba(255,255,255,0.05)",
            borderRadius: 12,
            marginTop: 12,
          }}
        />
      </div>
    )
  }

  const cfg = StatusConfig(run.status)
  const isActionable = run.status === "processing" || run.status === "pending"

  return (
    <div
      style={{
        padding: "0 0 120px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Back nav */}
      <div style={{ padding: "12px 16px 10px", display: "flex", alignItems: "center" }}>
        <button
          onClick={() => router.back()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "none",
            border: "none",
            color: blue,
            fontSize: 15,
            fontWeight: 500,
            cursor: "pointer",
            padding: 0,
          }}
        >
          <svg
            width="9"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(10,132,255,0.9)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Salarizare
        </button>
      </div>

      {/* Hero */}
      <div style={{ padding: "8px 16px 16px", borderBottom: `1px solid rgba(255,255,255,0.07)` }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "rgba(10,132,255,0.10)",
              border: `1px solid rgba(255,255,255,0.08)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(10,132,255,0.85)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: t3,
                margin: "0 0 4px",
              }}
            >
              Run Salarizare
            </p>
            <p
              style={{
                fontSize: 22,
                fontWeight: 700,
                lineHeight: 1.15,
                margin: 0,
                color: "var(--prv-text-1)",
              }}
            >
              {run.title}
            </p>
            <p style={{ fontSize: 14, color: t2, margin: "4px 0 0" }}>
              {run.period} · {run.employeeCount} employees
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              <span
                style={{
                  ...cfg,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 9px",
                  borderRadius: 100,
                }}
              >
                {cfg.label}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 9px",
                  borderRadius: 100,
                  background: "rgba(10,132,255,0.10)",
                  color: blue,
                }}
              >
                {run.ref}
              </span>
            </div>
          </div>
        </div>
        {/* Stat tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {[
            {
              val: `€${run.totalGross.toLocaleString("en-US")}`,
              label: "Total Brut",
              color: undefined,
            },
            { val: `€${run.netPaid.toLocaleString("en-US")}`, label: "Net Plătit", color: green },
            { val: String(run.employeeCount), label: "Employees", color: amber },
          ].map((t) => (
            <div
              key={t.label}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: `1px solid rgba(255,255,255,0.08)`,
                borderRadius: 12,
                padding: "10px 12px",
              }}
            >
              <p
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: t.color ?? "var(--prv-text-1)",
                  margin: 0,
                }}
              >
                {t.val}
              </p>
              <p style={{ fontSize: 11, color: t3, margin: "2px 0 0" }}>{t.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Inline CTAs */}
      {isActionable && (
        <div style={{ display: "flex", gap: 10, margin: "14px 16px 0" }}>
          <button
            style={{
              flex: 1,
              padding: "14px 0",
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 700,
              textAlign: "center",
              cursor: "pointer",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.70)",
              border: `1px solid rgba(255,255,255,0.09)`,
            }}
          >
            Correct
          </button>
          <button
            style={{
              flex: 2,
              padding: "14px 0",
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 700,
              textAlign: "center",
              cursor: "pointer",
              background: "rgba(48,209,88,0.15)",
              color: green,
              border: "1px solid rgba(48,209,88,0.25)",
            }}
          >
            Approve Run
          </button>
        </div>
      )}

      {/* Cost breakdown */}
      <div style={{ padding: "0 16px" }}>
        <SectionCard title="Defalcare Costuri">
          {run.breakdown.map((entry, i) => (
            <div
              key={entry.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "11px 16px",
                borderBottom:
                  i < run.breakdown.length - 1 ? `1px solid rgba(255,255,255,0.05)` : "none",
                background: entry.isTotal ? "rgba(255,255,255,0.03)" : "transparent",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: entry.isTotal ? "rgba(255,255,255,0.85)" : t3,
                  fontWeight: entry.isTotal ? 700 : 400,
                }}
              >
                {entry.label}
              </span>
              <span
                style={{
                  fontSize: entry.isTotal ? 15 : 13,
                  fontWeight: 700,
                  color: entry.color ?? "var(--prv-text-1)",
                }}
              >
                {entry.amount < 0
                  ? `-€${Math.abs(entry.amount).toLocaleString("en-US")}`
                  : `€${entry.amount.toLocaleString("en-US")}`}
              </span>
            </div>
          ))}
        </SectionCard>

        {/* Top employees */}
        <SectionCard
          title="Top Employees · Net Salary"
          badge={
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 9px",
                borderRadius: 100,
                background: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.45)",
              }}
            >
              {run.employeeCount} total
            </span>
          }
        >
          {run.topEmployees.map((emp, i) => (
            <div
              key={emp.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderBottom:
                  i < run.topEmployees.length - 1 ? `1px solid rgba(255,255,255,0.05)` : "none",
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: emp.avatarBg,
                  color: emp.avatarColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {emp.initials}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--prv-text-1)", margin: 0 }}>
                  {emp.name}
                </p>
                <p style={{ fontSize: 12, color: t3, margin: "1px 0 0" }}>{emp.role}</p>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: emp.hasOT ? amber : green }}>
                €{emp.net.toLocaleString("en-US")}
              </span>
            </div>
          ))}
        </SectionCard>

        {/* Run info */}
        <SectionCard title="Run Information">
          <InfoRow label="Period" value={run.period} />
          <InfoRow label="Initiated by" value={run.initiatedBy} />
          <InfoRow label="Processing date" value={run.processingDate} />
          <InfoRow label="Estimated payment" value={run.estimatedPayDate} valueColor={green} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "11px 16px",
            }}
          >
            <span style={{ fontSize: 13, color: t3 }}>Payment method</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--prv-text-1)" }}>
              {run.paymentMethod}
            </span>
          </div>
        </SectionCard>
      </div>

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
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
        </svg>
      </button>
    </div>
  )
}
