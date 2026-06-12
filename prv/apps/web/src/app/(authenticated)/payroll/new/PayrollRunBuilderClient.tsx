"use client"

import { useState } from "react"
import Link from "next/link"
import { GlassInput } from "@prv/ui"

// ── Types ─────────────────────────────────────────────────────────────────────

interface PayrollEmployee {
  id: string
  initials: string
  name: string
  role: string
  location: string
  weeklyGross: number
}

type RunType = "weekly" | "monthly" | "special"

// ── Static data ───────────────────────────────────────────────────────────────

const EMPLOYEES: PayrollEmployee[] = [
  {
    id: "e1",
    initials: "AP",
    name: "Andrei Popescu",
    role: "Project Manager",
    location: "Cluj",
    weeklyGross: 1120,
  },
  {
    id: "e2",
    initials: "EM",
    name: "Elena Marin",
    role: "Project Manager",
    location: "Timișoara",
    weeklyGross: 1120,
  },
  {
    id: "e3",
    initials: "MI",
    name: "Maria Ionescu",
    role: "HR Manager",
    location: "Cluj",
    weeklyGross: 980,
  },
  {
    id: "e4",
    initials: "LT",
    name: "Liviu Toma",
    role: "Tile Specialist",
    location: "Cluj",
    weeklyGross: 686,
  },
  {
    id: "e5",
    initials: "GS",
    name: "George Stoica",
    role: "Electrician",
    location: "București",
    weeklyGross: 630,
  },
  {
    id: "e6",
    initials: "RC",
    name: "Radu Ciobanu",
    role: "Plumber",
    location: "Cluj",
    weeklyGross: 595,
  },
]

const RUN_TYPES: { value: RunType; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "special", label: "Special" },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcNet(gross: number): number {
  const cas = Math.round(gross * 0.25)
  const cass = Math.round(gross * 0.1)
  const tax = Math.round((gross - cas - cass) * 0.1)
  return gross - cas - cass - tax
}

function fmt(n: number): string {
  return `€${n.toLocaleString("en-US")}`
}

// ── CSS tokens ────────────────────────────────────────────────────────────────

const g1 = "var(--prv-g1)"
const g2 = "var(--prv-g2)"
const bds = "var(--prv-border-subtle)"
const t2 = "var(--prv-text-2)"
const t3 = "var(--prv-text-3)"
const green = "rgba(48,209,88,0.95)"
const red = "rgba(255,69,58,0.85)"

// ── Main component ────────────────────────────────────────────────────────────

export function PayrollRunBuilderClient() {
  const [runType, setRunType] = useState<RunType>("weekly")
  const [startDate, setStartDate] = useState("2026-06-09")
  const [endDate, setEndDate] = useState("2026-06-15")
  const [notes, setNotes] = useState("")
  const [saved, setSaved] = useState<null | "draft" | "launched">(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Full-run financials (142 employees)
  const totalGross = 28400
  const totalCAS = Math.round(totalGross * 0.25)
  const totalCASS = Math.round(totalGross * 0.1)
  const totalTax = Math.round((totalGross - totalCAS - totalCASS) * 0.1)
  const totalNet = totalGross - totalCAS - totalCASS - totalTax
  const totalCAM = Math.round(totalGross * 0.0225)
  const totalEmployerCost = totalGross + totalCAM

  async function handleSubmit(type: "draft" | "launched") {
    setIsSubmitting(true)
    try {
      await fetch("/api/payroll/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runType,
          startDate,
          endDate,
          notes,
          status: type === "draft" ? "pending" : "processing",
        }),
      })
    } finally {
      setIsSubmitting(false)
    }
    setSaved(type)
  }

  if (saved) {
    return (
      <div
        className="px-4 pt-14 pb-28 max-w-2xl mx-auto flex flex-col items-center justify-center"
        style={{ minHeight: "50vh" }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: "rgba(48,209,88,0.15)", border: "1px solid rgba(48,209,88,0.3)" }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(48,209,88,0.95)"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <p className="text-[20px] font-bold text-white/90 mb-1">
          {saved === "draft" ? "Payroll run saved as draft" : "Payroll run launched"}
        </p>
        <p className="text-[13px] text-white/40 mb-6">
          {saved === "draft"
            ? "You can launch it anytime from payroll runs."
            : "142 employees will be processed."}
        </p>
        <div className="flex gap-3">
          <Link
            href="/payroll"
            className="px-5 py-2.5 rounded-[12px] text-[13px] font-semibold"
            style={{
              background: g2,
              border: `1px solid ${bds}`,
              color: "var(--prv-text-1)",
              textDecoration: "none",
            }}
          >
            View payroll
          </Link>
          <button
            onClick={() => setSaved(null)}
            className="px-5 py-2.5 rounded-[12px] text-[13px] font-semibold"
            style={{
              background: "rgba(48,209,88,0.15)",
              border: "1px solid rgba(48,209,88,0.3)",
              color: green,
            }}
          >
            + New run
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <Link
            href="/payroll"
            className="text-white/35 text-[13px] font-medium mb-0.5 flex items-center gap-1"
            style={{ textDecoration: "none" }}
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
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Payroll
          </Link>
          <h1 className="text-white/90 text-[26px] font-semibold tracking-tight leading-tight">
            New Payroll Run
          </h1>
        </div>
        <div
          className="px-3 py-1.5 rounded-[10px] text-[12px] font-semibold text-white/45"
          style={{ background: g1, border: `1px solid ${bds}` }}
        >
          142 employees
        </div>
      </div>

      {/* Run type segmented control */}
      <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mx-1 mb-2.5">
        Run Type
      </p>
      <div
        className="flex gap-1 p-1 rounded-[14px] mb-4"
        style={{ background: g1, border: `1px solid ${bds}` }}
      >
        {RUN_TYPES.map((rt) => (
          <button
            key={rt.value}
            onClick={() => setRunType(rt.value)}
            className="flex-1 py-2 rounded-[10px] text-[13px] font-semibold transition-all"
            style={{
              background: runType === rt.value ? g2 : "transparent",
              color: runType === rt.value ? "var(--prv-text-1)" : t3,
              border: runType === rt.value ? `1px solid ${bds}` : "1px solid transparent",
            }}
          >
            {rt.label}
          </button>
        ))}
      </div>

      {/* Period */}
      <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mx-1 mb-2.5">
        Period
      </p>
      <div
        className="rounded-[18px] p-4 mb-4 grid grid-cols-2 gap-3"
        style={{ background: g1, border: `1px solid ${bds}` }}
      >
        <div>
          <p className="text-[11px] text-white/35 font-semibold uppercase tracking-wider mb-1.5">
            From
          </p>
          <GlassInput
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <p className="text-[11px] text-white/35 font-semibold uppercase tracking-wider mb-1.5">
            Until
          </p>
          <GlassInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      {/* Employee preview */}
      <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mx-1 mb-2.5">
        Employees (142)
      </p>
      <div
        className="rounded-[18px] overflow-hidden mb-4"
        style={{ background: g1, border: `1px solid ${bds}` }}
      >
        {EMPLOYEES.map((emp) => {
          const net = calcNet(emp.weeklyGross)
          return (
            <div
              key={emp.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: `1px solid ${bds}` }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                style={{ background: g2, color: t2 }}
              >
                {emp.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white/85 truncate">{emp.name}</p>
                <p className="text-[11px] text-white/35">
                  {emp.role} · {emp.location}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[13px] font-bold" style={{ color: green }}>
                  {fmt(net)}
                </p>
                <p className="text-[11px] text-white/35">Gross {fmt(emp.weeklyGross)}</p>
              </div>
            </div>
          )
        })}
        <div className="px-4 py-3 text-center">
          <span className="text-[12px] text-white/30">+136 employees</span>
        </div>
      </div>

      {/* Financial summary */}
      <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mx-1 mb-2.5">
        Financial Summary
      </p>
      <div
        className="rounded-[18px] overflow-hidden mb-4"
        style={{ background: g1, border: `1px solid ${bds}` }}
      >
        {[
          {
            label: "Total gross salary",
            value: fmt(totalGross),
            sub: "142 employees",
            color: "var(--prv-text-1)",
          },
          {
            label: "Employee pension (25%)",
            value: `−${fmt(totalCAS)}`,
            sub: "Pension",
            color: red,
          },
          {
            label: "Employee health (10%)",
            value: `−${fmt(totalCASS)}`,
            sub: "Health",
            color: red,
          },
          {
            label: "Income tax (10%)",
            value: `−${fmt(totalTax)}`,
            sub: "Withheld at source",
            color: red,
          },
        ].map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: `1px solid ${bds}` }}
          >
            <div>
              <p className="text-[13px] text-white/65">{row.label}</p>
              <p className="text-[11px] text-white/30">{row.sub}</p>
            </div>
            <span className="text-[14px] font-bold" style={{ color: row.color }}>
              {row.value}
            </span>
          </div>
        ))}

        {/* Net to employees highlight */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: `1px solid ${bds}`, background: "rgba(48,209,88,0.04)" }}
        >
          <div>
            <p className="text-[14px] font-bold text-white/90">Net to employees</p>
            <p className="text-[11px] text-white/35">Total net pay</p>
          </div>
          <span className="text-[17px] font-bold" style={{ color: green }}>
            {fmt(totalNet)}
          </span>
        </div>

        {/* Employer CAM */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: `1px solid ${bds}` }}
        >
          <div>
            <p className="text-[13px] text-white/65">Employer contribution (CAM 2.25%)</p>
            <p className="text-[11px] text-white/30">Work accident insurance</p>
          </div>
          <span className="text-[14px] font-bold" style={{ color: red }}>
            +{fmt(totalCAM)}
          </span>
        </div>

        {/* Total employer cost */}
        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <p className="text-[14px] font-bold text-white/90">Total employer cost</p>
            <p className="text-[11px] text-white/35">Including contributions</p>
          </div>
          <span className="text-[18px] font-bold text-white/90">{fmt(totalEmployerCost)}</span>
        </div>
      </div>

      {/* Notes */}
      <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mx-1 mb-2.5">
        Notes
      </p>
      <div className="mb-5">
        <GlassInput
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal note for this run (optional)..."
          className="w-full"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => handleSubmit("draft")}
          disabled={isSubmitting}
          className="flex-1 py-3.5 rounded-[14px] text-[14px] font-semibold"
          style={{ background: g2, border: `1px solid ${bds}`, color: t2 }}
        >
          Save draft
        </button>
        <button
          onClick={() => handleSubmit("launched")}
          disabled={isSubmitting}
          className="flex-1 py-3.5 rounded-[14px] text-[14px] font-bold"
          style={{ background: "rgba(255,255,255,0.92)", color: "#000" }}
        >
          {isSubmitting ? "Processing..." : "Launch run"}
        </button>
      </div>
    </div>
  )
}
