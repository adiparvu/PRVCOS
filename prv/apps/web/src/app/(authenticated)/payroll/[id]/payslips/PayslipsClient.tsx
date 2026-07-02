"use client"

import { useState } from "react"
import Link from "next/link"
import {
  usePayrollItems,
  useUpsertPayrollItem,
  useDeletePayrollItem,
  usePeople,
  type PayrollItem,
} from "@/lib/api-hooks"

function initials(name: string | null): string {
  if (!name) return "?"
  const p = name.trim().split(/\s+/)
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "?"
}
function eur(n: number): string {
  return `€${Math.round(n).toLocaleString("en-US")}`
}

function Total({ k, v }: { k: string; v: string }) {
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
        {k}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          marginTop: 6,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {v}
      </div>
    </div>
  )
}

const COLS = "1.7fr 0.8fr 0.8fr 0.8fr 0.9fr 28px"

function LineRow({ item, onDelete }: { item: PayrollItem; onDelete: () => void }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: COLS,
        gap: 8,
        alignItems: "center",
        padding: "12px 16px 12px 0",
        borderBottom: "1px solid var(--prv-border-subtle)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11, paddingLeft: 16, minWidth: 0 }}>
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: "var(--prv-g2)",
            display: "grid",
            placeItems: "center",
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          {initials(item.userName)}
        </span>
        <span style={{ minWidth: 0 }}>
          <span
            style={{
              fontSize: 13.5,
              fontWeight: 640,
              display: "block",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item.userName ?? "—"}
            {item.overtimeAmount > 0 && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "var(--prv-text-4)",
                  border: "1px solid var(--prv-border-subtle)",
                  borderRadius: 100,
                  padding: "1px 6px",
                  marginLeft: 6,
                }}
              >
                OT
              </span>
            )}
          </span>
          {item.jobTitle && (
            <span style={{ fontSize: 11, color: "var(--prv-text-3)" }}>{item.jobTitle}</span>
          )}
        </span>
      </div>
      <span style={amt()}>{eur(item.baseAmount)}</span>
      <span style={amt()}>{item.overtimeAmount ? eur(item.overtimeAmount) : "—"}</span>
      <span style={amt("ded")}>{item.deductionAmount ? `−${eur(item.deductionAmount)}` : "—"}</span>
      <span style={amt("net")}>{eur(item.netAmount)}</span>
      <button
        onClick={onDelete}
        aria-label="Remove line"
        style={{
          width: 24,
          height: 24,
          borderRadius: 7,
          border: "1px solid var(--prv-border-subtle)",
          background: "transparent",
          color: "var(--prv-text-3)",
          cursor: "pointer",
          fontSize: 14,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  )
}
function amt(kind?: "ded" | "net"): React.CSSProperties {
  return {
    fontSize: 13,
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    paddingRight: 2,
    color:
      kind === "net"
        ? "var(--prv-text-1)"
        : kind === "ded"
          ? "var(--prv-text-3)"
          : "var(--prv-text-2)",
    fontWeight: kind === "net" ? 700 : 400,
  }
}

export function PayslipsClient({ runId }: { runId: string }) {
  const { data, isLoading } = usePayrollItems(runId)
  const { data: peopleData } = usePeople()
  const upsert = useUpsertPayrollItem(runId)
  const del = useDeletePayrollItem(runId)

  const items = data?.items ?? []
  const totals = data?.totals
  const people = peopleData?.members ?? []

  const [showForm, setShowForm] = useState(false)
  const [userId, setUserId] = useState("")
  const [base, setBase] = useState("")
  const [ot, setOt] = useState("")
  const [bonus, setBonus] = useState("")
  const [deduction, setDeduction] = useState("")

  function submit() {
    if (!userId) return
    upsert.mutate(
      {
        userId,
        baseAmount: Number(base) || 0,
        overtimeAmount: Number(ot) || 0,
        bonusAmount: Number(bonus) || 0,
        deductionAmount: Number(deduction) || 0,
      },
      {
        onSuccess: () => {
          setBase("")
          setOt("")
          setBonus("")
          setDeduction("")
          setShowForm(false)
        },
      }
    )
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "8px 4px 60px" }}>
      <Link
        href={`/payroll/${runId}`}
        style={{
          fontSize: 12.5,
          color: "var(--prv-text-3)",
          textDecoration: "none",
          display: "inline-flex",
          gap: 5,
          marginBottom: 12,
        }}
      >
        ‹ Back to run
      </Link>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--prv-text-3)",
            }}
          >
            Payroll · Payslips
          </div>
          <h1
            style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-0.02em", margin: "3px 0 0" }}
          >
            Payslip lines
          </h1>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            padding: "9px 16px",
            borderRadius: 100,
            background: showForm ? "var(--prv-g2)" : "rgba(255,255,255,0.92)",
            color: showForm ? "var(--prv-text-1)" : "#000",
            border: showForm ? "1px solid var(--prv-border)" : "none",
            fontSize: 13,
            fontWeight: 640,
            cursor: "pointer",
          }}
        >
          {showForm ? "Cancel" : "＋ Add line"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          margin: "20px 0 22px",
        }}
      >
        <Total k="Gross" v={eur(totals?.totalGross ?? 0)} />
        <Total k="Overtime" v={eur(totals?.totalOvertime ?? 0)} />
        <Total k="Deductions" v={eur(totals?.totalDeduction ?? 0)} />
        <Total k="Net pay" v={eur(totals?.totalNet ?? 0)} />
      </div>

      {showForm && (
        <div
          style={{
            borderRadius: 20,
            padding: 16,
            marginBottom: 22,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <Field label="Employee">
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              style={{ ...inp, minWidth: 150 }}
            >
              <option value="">Select…</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Base">
            <input
              value={base}
              onChange={(e) => setBase(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              style={{ ...inp, width: 90 }}
            />
          </Field>
          <Field label="Overtime">
            <input
              value={ot}
              onChange={(e) => setOt(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              style={{ ...inp, width: 90 }}
            />
          </Field>
          <Field label="Bonus">
            <input
              value={bonus}
              onChange={(e) => setBonus(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              style={{ ...inp, width: 90 }}
            />
          </Field>
          <Field label="Deduction">
            <input
              value={deduction}
              onChange={(e) => setDeduction(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              style={{ ...inp, width: 90 }}
            />
          </Field>
          <button
            onClick={submit}
            disabled={!userId || upsert.isPending}
            style={{
              padding: "9px 18px",
              borderRadius: 100,
              background: "rgba(255,255,255,0.92)",
              color: "#000",
              border: "none",
              fontSize: 13,
              fontWeight: 640,
              cursor: "pointer",
              opacity: userId && !upsert.isPending ? 1 : 0.5,
            }}
          >
            Save
          </button>
        </div>
      )}

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
        Lines · by net
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: COLS,
            gap: 8,
            alignItems: "center",
            borderBottom: "1px solid var(--prv-border-subtle)",
          }}
        >
          {["Employee", "Base", "OT", "Deduct", "Net", ""].map((h, i) => (
            <div
              key={h + i}
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "var(--prv-text-3)",
                padding: "11px 8px",
                paddingLeft: i === 0 ? 16 : 8,
                textAlign: i === 0 || i === 5 ? "left" : "right",
              }}
            >
              {h}
            </div>
          ))}
        </div>
        {isLoading ? (
          <p style={{ padding: "40px 20px", textAlign: "center", color: "var(--prv-text-4)" }}>
            Loading payslips…
          </p>
        ) : items.length === 0 ? (
          <p
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--prv-text-4)",
              fontSize: 14,
            }}
          >
            No payslip lines yet. Use “Add line” to build this run.
          </p>
        ) : (
          items.map((it) => <LineRow key={it.id} item={it} onDelete={() => del.mutate(it.id)} />)
        )}
      </div>
    </div>
  )
}

const inp: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  background: "var(--prv-g1)",
  border: "1px solid var(--prv-border)",
  color: "var(--prv-text-1)",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--prv-text-3)",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}
