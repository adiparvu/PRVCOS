"use client"

import { useState } from "react"
import Link from "next/link"
import { useLeaveBalances, useUpsertLeaveBalance, type LeaveBalanceSummary } from "@/lib/api-hooks"

const TYPES = ["annual", "medical", "unpaid", "other"] as const
const TYPE_LABEL: Record<string, string> = {
  annual: "Annual",
  medical: "Medical",
  unpaid: "Unpaid",
  other: "Other",
}

function BalanceCard({ b }: { b: LeaveBalanceSummary }) {
  const pot = b.entitlementTotal
  const usedPct = pot > 0 ? Math.min(100, (b.usedDays / pot) * 100) : 0
  const pendingPct = pot > 0 ? Math.min(100 - usedPct, (b.pendingDays / pot) * 100) : 0
  return (
    <div
      style={{
        borderRadius: 20,
        padding: 18,
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--prv-text-3)",
          }}
        >
          {TYPE_LABEL[b.type]}
        </span>
        <span style={{ fontSize: 10.5, color: "var(--prv-text-4)" }}>
          {b.accrualDaysPerMonth ? `+${b.accrualDaysPerMonth}/mo accrual` : "no accrual"}
        </span>
      </div>
      <div style={{ fontSize: 34, fontWeight: 720, letterSpacing: "-0.03em" }}>
        {b.available}
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--prv-text-3)", marginLeft: 4 }}>
          days left
        </span>
      </div>
      {pot > 0 && (
        <div
          style={{
            height: 8,
            borderRadius: 100,
            background: "rgba(255,255,255,0.08)",
            marginTop: 12,
            overflow: "hidden",
            display: "flex",
          }}
        >
          <div
            style={{ height: "100%", width: `${usedPct}%`, background: "rgba(255,255,255,0.85)" }}
          />
          <div
            style={{ height: "100%", width: `${pendingPct}%`, background: "rgba(255,159,10,0.7)" }}
          />
        </div>
      )}
      <div
        style={{
          display: "flex",
          gap: 14,
          marginTop: 12,
          fontSize: 11.5,
          color: "var(--prv-text-3)",
        }}
      >
        <span>
          Entitlement <b style={{ color: "var(--prv-text-2)" }}>{b.entitlementDays}</b>
        </span>
        <span>
          Carried <b style={{ color: "var(--prv-text-2)" }}>{b.carriedOverDays}</b>
        </span>
        <span>
          Used <b style={{ color: "var(--prv-text-2)" }}>{b.usedDays}</b>
        </span>
        {b.pendingDays > 0 && (
          <span>
            Pending <b style={{ color: "rgba(255,159,10,0.95)" }}>{b.pendingDays}</b>
          </span>
        )}
      </div>
    </div>
  )
}

export function LeaveBalancesClient({ userId }: { userId: string }) {
  const { data, isLoading } = useLeaveBalances(userId)
  const upsert = useUpsertLeaveBalance()

  const balances = data?.balances ?? []
  const year = data?.year ?? new Date().getFullYear()

  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState<(typeof TYPES)[number]>("annual")
  const [entitlement, setEntitlement] = useState("21")
  const [carried, setCarried] = useState("0")
  const [accrual, setAccrual] = useState("")

  function submit() {
    const ent = Number(entitlement)
    if (!Number.isFinite(ent) || ent < 0) return
    upsert.mutate(
      {
        userId,
        type,
        year,
        entitlementDays: ent,
        carriedOverDays: Number(carried) || 0,
        accrualDaysPerMonth: accrual.trim() ? Number(accrual) : null,
      },
      { onSuccess: () => setShowForm(false) }
    )
  }

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "8px 4px 60px" }}>
      <Link
        href={`/people/${userId}`}
        style={{
          fontSize: 12.5,
          color: "var(--prv-text-3)",
          textDecoration: "none",
          display: "inline-flex",
          gap: 5,
          marginBottom: 12,
        }}
      >
        ‹ Back to profile
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
            People · Leave
          </div>
          <h1
            style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-0.02em", margin: "3px 0 0" }}
          >
            Leave Balances
          </h1>
          <div style={{ fontSize: 13, color: "var(--prv-text-2)", marginTop: 3 }}>{year}</div>
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
          {showForm ? "Cancel" : "＋ Set entitlement"}
        </button>
      </div>

      {showForm && (
        <div
          style={{
            borderRadius: 20,
            padding: 16,
            margin: "18px 0 4px",
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <Field label="Type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as (typeof TYPES)[number])}
              style={inp}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Entitlement">
            <input
              value={entitlement}
              onChange={(e) => setEntitlement(e.target.value)}
              inputMode="decimal"
              style={{ ...inp, width: 76 }}
            />
          </Field>
          <Field label="Carried over">
            <input
              value={carried}
              onChange={(e) => setCarried(e.target.value)}
              inputMode="decimal"
              style={{ ...inp, width: 76 }}
            />
          </Field>
          <Field label="Accrual /mo">
            <input
              value={accrual}
              onChange={(e) => setAccrual(e.target.value)}
              inputMode="decimal"
              placeholder="—"
              style={{ ...inp, width: 76 }}
            />
          </Field>
          <button
            onClick={submit}
            disabled={upsert.isPending}
            style={{
              padding: "9px 18px",
              borderRadius: 100,
              background: "rgba(255,255,255,0.92)",
              color: "#000",
              border: "none",
              fontSize: 13,
              fontWeight: 640,
              cursor: "pointer",
              opacity: upsert.isPending ? 0.5 : 1,
            }}
          >
            Save
          </button>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        {isLoading ? (
          <p style={{ padding: "40px 20px", color: "var(--prv-text-4)" }}>Loading balances…</p>
        ) : balances.length === 0 ? (
          <p
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--prv-text-4)",
              fontSize: 14,
            }}
          >
            No balances set for {year}. Use “Set entitlement” to configure this employee’s
            allowance.
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {balances.map((b) => (
              <BalanceCard key={b.id} b={b} />
            ))}
          </div>
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
