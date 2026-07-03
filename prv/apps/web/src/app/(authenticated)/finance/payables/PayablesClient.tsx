"use client"

import { useState } from "react"
import {
  usePayables,
  useSupplierOptions,
  useCreatePayable,
  useUpdatePayable,
  type PayableRow,
} from "@/lib/api-hooks"

function eur(n: number): string {
  if (Math.abs(n) >= 1000)
    return `€${(n / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k`
  return `€${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
}
function shortDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })
}
const AGING_LABEL: Record<string, string> = {
  current: "Not yet due",
  "1-30": "1–30 days",
  "31-60": "31–60 days",
  "61-90": "61–90 days",
  "90+": "90+ days",
}

const card = {
  background: "var(--prv-g1)",
  border: "1px solid var(--prv-border)",
  borderRadius: 22,
  padding: 20,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 24px 64px rgba(0,0,0,0.5)",
} as const
const inputStyle = {
  width: "100%",
  background: "var(--prv-g2)",
  border: "1px solid var(--prv-border)",
  borderRadius: 12,
  color: "var(--prv-text-1)",
  font: "inherit",
  fontSize: 13,
  padding: "10px 12px",
} as const
const labelStyle = {
  display: "block",
  color: "var(--prv-text-3)",
  fontSize: 11,
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  marginBottom: 6,
}
const miniBtn = {
  border: "1px solid var(--prv-border)",
  background: "var(--prv-g2)",
  color: "var(--prv-text-1)",
  borderRadius: 9,
  font: "inherit",
  fontSize: 11.5,
  padding: "6px 10px",
  cursor: "pointer",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
} as const

function Tile({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
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
          color: warn ? "rgba(255,190,90,0.92)" : undefined,
        }}
      >
        {value}
      </div>
    </div>
  )
}

function Row({
  p,
  onSchedule,
  onPay,
  onCancel,
}: {
  p: PayableRow
  onSchedule: () => void
  onPay: () => void
  onCancel: () => void
}) {
  const terminal = p.status === "paid" || p.status === "cancelled"
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto auto auto",
        gap: 14,
        alignItems: "center",
        padding: "13px 16px",
        border: `1px solid ${p.overdue ? "rgba(255,176,64,0.32)" : "var(--prv-border)"}`,
        background: p.overdue ? "rgba(255,176,64,0.12)" : "var(--prv-g1)",
        borderRadius: 14,
        marginBottom: 9,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
        opacity: terminal ? 0.62 : 1,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 560 }}>{p.supplierName ?? "Unlinked supplier"}</div>
        <div style={{ color: "var(--prv-text-3)", fontSize: 12, marginTop: 3 }}>
          {p.invoiceNumber} · {p.status}
          {p.paidAmount > 0 && p.status !== "paid" ? ` · ${eur(p.paidAmount)} paid` : ""}
        </div>
      </div>
      <div
        style={{
          fontSize: 12,
          textAlign: "right",
          whiteSpace: "nowrap",
          color: p.overdue ? "rgba(255,190,90,0.92)" : "var(--prv-text-2)",
          fontWeight: p.overdue ? 560 : 400,
        }}
      >
        Due {shortDate(p.dueDate)}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 660,
          textAlign: "right",
          minWidth: 90,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {eur(p.outstanding)}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {!terminal && (
          <>
            <button style={miniBtn} onClick={onSchedule}>
              Schedule
            </button>
            <button style={miniBtn} onClick={onPay}>
              Pay
            </button>
            <button style={{ ...miniBtn, color: "var(--prv-text-3)" }} onClick={onCancel}>
              Cancel
            </button>
          </>
        )}
        {terminal && (
          <span style={{ color: "var(--prv-text-3)", fontSize: 12 }}>
            {p.status === "paid" ? "✓ Paid" : "Cancelled"}
          </span>
        )}
      </div>
    </div>
  )
}

export function PayablesClient() {
  const { data, isLoading } = usePayables()
  const supplierOptions = useSupplierOptions()
  const create = useCreatePayable()
  const update = useUpdatePayable()

  const [supplierId, setSupplierId] = useState("")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [amount, setAmount] = useState("")
  const [taxAmount, setTaxAmount] = useState("")

  const suppliers = supplierOptions.data?.suppliers ?? []
  const payables = data?.payables ?? []
  const aging = data?.aging
  const outflow = data?.outflow ?? []
  const meta = data?.meta

  const maxBucket = Math.max(1, ...(aging?.buckets.map((b) => b.total) ?? [1]))
  const canSubmit =
    invoiceNumber.trim() !== "" && dueDate !== "" && Number(amount) > 0 && !create.isPending

  function submit() {
    if (!canSubmit) return
    create.mutate(
      {
        supplierId: supplierId || null,
        invoiceNumber: invoiceNumber.trim(),
        dueDate,
        amount: Number(amount),
        taxAmount: taxAmount ? Number(taxAmount) : 0,
      },
      {
        onSuccess: () => {
          setInvoiceNumber("")
          setDueDate("")
          setAmount("")
          setTaxAmount("")
        },
      }
    )
  }

  function schedule(p: PayableRow) {
    const d = window.prompt("Schedule payment for date (YYYY-MM-DD):", p.dueDate)
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d))
      update.mutate({ id: p.id, action: "schedule", scheduledDate: d })
  }
  function pay(p: PayableRow) {
    const raw = window.prompt(
      `Payment amount (outstanding ${p.outstanding}):`,
      String(p.outstanding)
    )
    const val = Number(raw)
    if (raw && Number.isFinite(val) && val > 0)
      update.mutate({ id: p.id, action: "pay", amount: val })
  }
  function cancel(p: PayableRow) {
    if (window.confirm(`Cancel payable ${p.invoiceNumber}?`))
      update.mutate({ id: p.id, action: "cancel" })
  }

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>Accounts Payable</h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Finance · supplier invoices, aging &amp; upcoming cash outflow
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          margin: "24px 0",
        }}
      >
        <Tile label="Outstanding" value={eur(aging?.totalOutstanding ?? 0)} />
        <Tile
          label="Overdue"
          value={eur(aging?.overdueTotal ?? 0)}
          warn={(aging?.overdueTotal ?? 0) > 0}
        />
        <Tile label="Open" value={meta?.open ?? 0} />
        <Tile label="Scheduled" value={meta?.scheduled ?? 0} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>Aging</h2>
            <span style={{ color: "var(--prv-text-3)", fontSize: 12 }}>by days overdue</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(aging?.buckets ?? []).map((b) => {
              const od = b.key !== "current"
              return (
                <div
                  key={b.key}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "92px 1fr auto",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{ color: "var(--prv-text-2)", fontSize: 12.5 }}>
                    {AGING_LABEL[b.key]}
                  </div>
                  <div
                    style={{
                      height: 26,
                      borderRadius: 8,
                      background: "var(--prv-g2)",
                      border: "1px solid var(--prv-border-subtle)",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <i
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: `${(b.total / maxBucket) * 100}%`,
                        background: od
                          ? "linear-gradient(90deg,rgba(255,176,64,.34),rgba(255,176,64,.14))"
                          : "linear-gradient(90deg,rgba(255,255,255,.24),rgba(255,255,255,.1))",
                        borderRight: `1px solid ${od ? "rgba(255,176,64,0.32)" : "rgba(255,255,255,.28)"}`,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      fontVariantNumeric: "tabular-nums",
                      minWidth: 78,
                      textAlign: "right",
                    }}
                  >
                    {eur(b.total)} · {b.count}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>Cash outflow · 30d</h2>
            <span style={{ color: "var(--prv-text-3)", fontSize: 12 }}>by pay date</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {outflow.length === 0 && (
              <div style={{ color: "var(--prv-text-3)", fontSize: 13 }}>
                Nothing due in the next 30 days.
              </div>
            )}
            {outflow.map((d) => (
              <div
                key={d.date}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 10px",
                  borderRadius: 10,
                  background: "var(--prv-g2)",
                  border: "1px solid var(--prv-border-subtle)",
                }}
              >
                <span style={{ color: "var(--prv-text-2)", fontSize: 12 }}>
                  {shortDate(d.date)} · {d.count}
                </span>
                <span
                  style={{ fontSize: 12.5, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
                >
                  {eur(d.total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Record supplier invoice</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Supplier</label>
            <select
              style={inputStyle}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">Unlinked</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Invoice #</label>
            <input
              style={inputStyle}
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Due date</label>
            <input
              type="date"
              style={inputStyle}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Amount</label>
            <input
              type="number"
              style={inputStyle}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>VAT</label>
            <input
              type="number"
              style={inputStyle}
              value={taxAmount}
              onChange={(e) => setTaxAmount(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              onClick={submit}
              disabled={!canSubmit}
              style={{
                background: "#fff",
                color: "#000",
                border: 0,
                borderRadius: 12,
                font: "inherit",
                fontWeight: 600,
                fontSize: 13,
                padding: "10px 20px",
                cursor: canSubmit ? "pointer" : "not-allowed",
                opacity: canSubmit ? 1 : 0.4,
                width: "100%",
              }}
            >
              {create.isPending ? "Recording…" : "Record"}
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          color: "var(--prv-text-3)",
          fontSize: 11.5,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          margin: "0 4px 10px",
          fontWeight: 600,
        }}
      >
        Register
      </div>
      {isLoading && <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Loading…</div>}
      {!isLoading && payables.length === 0 && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>No supplier invoices yet.</div>
      )}
      {payables.map((p) => (
        <Row
          key={p.id}
          p={p}
          onSchedule={() => schedule(p)}
          onPay={() => pay(p)}
          onCancel={() => cancel(p)}
        />
      ))}
    </div>
  )
}
