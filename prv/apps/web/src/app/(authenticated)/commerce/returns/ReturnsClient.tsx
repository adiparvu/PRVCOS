"use client"

import { useState } from "react"
import {
  useReturns,
  useOrderOptions,
  useCreateReturn,
  useUpdateReturn,
  type ReturnSummary,
} from "@/lib/api-hooks"

const REASONS = ["damaged", "wrong_item", "defective", "not_needed", "other"] as const
const REASON_LABEL: Record<string, string> = {
  damaged: "Damaged",
  wrong_item: "Wrong item",
  defective: "Defective",
  not_needed: "Not needed",
  other: "Other",
}
const STEP: Record<string, number> = {
  requested: 1,
  approved: 2,
  received: 3,
  refunded: 4,
  rejected: 0,
}
const NEXT: Record<string, { status: string; label: string } | null> = {
  requested: { status: "approved", label: "Approve" },
  approved: { status: "received", label: "Receive" },
  received: { status: "refunded", label: "Refund" },
  refunded: null,
  rejected: null,
}

function Stat({ label, value }: { label: string; value: string | number }) {
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
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 6 }}>
        {value}
      </div>
    </div>
  )
}

function Row({ r, onAdvance }: { r: ReturnSummary; onAdvance: (status: string) => void }) {
  const step = STEP[r.status] ?? 0
  const next = NEXT[r.status]
  const terminal = r.status === "refunded" || r.status === "rejected"
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 13,
        padding: "14px 16px",
        borderBottom: "1px solid var(--prv-border-subtle)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 640, letterSpacing: "-0.01em" }}>
          {REASON_LABEL[r.reason]}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: "var(--prv-text-3)",
            marginTop: 3,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontFamily: "'SF Mono', monospace",
              fontWeight: 700,
              color: "var(--prv-text-2)",
            }}
          >
            {r.returnNumber}
          </span>
          {r.orderNumber && <span>Order {r.orderNumber}</span>}
          {r.restock && <span>· restock</span>}
        </div>
        {!terminal && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
            {[1, 2, 3, 4].map((n) => (
              <span
                key={n}
                style={{
                  width: 26,
                  height: 5,
                  borderRadius: 100,
                  background: n <= step ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.10)",
                }}
              />
            ))}
          </div>
        )}
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          €{r.refundAmount}
        </div>
        {terminal ? (
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              borderRadius: 100,
              padding: "3px 9px",
              marginTop: 6,
              display: "inline-block",
              color: r.status === "refunded" ? "rgba(48,209,88,0.9)" : "rgba(255,69,58,0.9)",
              background: r.status === "refunded" ? "rgba(48,209,88,0.12)" : "rgba(255,69,58,0.14)",
              border: `1px solid ${r.status === "refunded" ? "rgba(48,209,88,0.26)" : "rgba(255,69,58,0.3)"}`,
            }}
          >
            {r.status}
          </span>
        ) : (
          <div style={{ display: "flex", gap: 6, marginTop: 6, justifyContent: "flex-end" }}>
            {next && (
              <button onClick={() => onAdvance(next.status)} style={btn}>
                {next.label} ›
              </button>
            )}
            <button
              onClick={() => onAdvance("rejected")}
              style={{ ...btn, color: "rgba(255,69,58,0.85)" }}
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
const btn: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--prv-text-2)",
  background: "var(--prv-g1)",
  border: "1px solid var(--prv-border)",
  borderRadius: 100,
  padding: "4px 11px",
  cursor: "pointer",
}

interface Line {
  name: string
  quantity: string
  unitPrice: string
}

export function ReturnsClient() {
  const { data, isLoading } = useReturns()
  const { data: orderData } = useOrderOptions()
  const update = useUpdateReturn()

  const returns = data?.returns ?? []
  const meta = data?.meta
  const orders = orderData?.orders ?? []

  const [showForm, setShowForm] = useState(false)
  const [orderId, setOrderId] = useState("")
  const [reason, setReason] = useState<(typeof REASONS)[number]>("damaged")
  const [lines, setLines] = useState<Line[]>([{ name: "", quantity: "1", unitPrice: "" }])
  const create = useCreateReturn(orderId || "")

  function submit() {
    const items = lines
      .filter((l) => l.name.trim() && Number(l.quantity) > 0)
      .map((l) => ({
        name: l.name.trim(),
        quantity: Number(l.quantity) || 1,
        unitPrice: Number(l.unitPrice) || 0,
      }))
    if (!orderId || items.length === 0) return
    create.mutate(
      { reason, items },
      {
        onSuccess: () => {
          setOrderId("")
          setReason("damaged")
          setLines([{ name: "", quantity: "1", unitPrice: "" }])
          setShowForm(false)
        },
      }
    )
  }

  const draftRefund = lines.reduce(
    (s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
    0
  )

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "8px 4px 60px" }}>
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
            Commerce · Returns
          </div>
          <h1
            style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-0.02em", margin: "3px 0 0" }}
          >
            Returns & Refunds
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
          {showForm ? "Cancel" : "＋ New return"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
          margin: "20px 0 22px",
        }}
      >
        <Stat label="Open" value={meta?.open ?? 0} />
        <Stat label="Refunded" value={meta?.refunded ?? 0} />
        <Stat label="Refunded €" value={meta?.totalRefunded ?? 0} />
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
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "flex-end",
              marginBottom: 12,
            }}
          >
            <Field label="Order">
              <select
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                style={{ ...inp, minWidth: 150 }}
              >
                <option value="">Select…</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.ref}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Reason">
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])}
                style={inp}
              >
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {REASON_LABEL[r]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {lines.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
              <input
                value={l.name}
                onChange={(e) =>
                  setLines((ls) => ls.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                }
                placeholder="Item name"
                style={{ ...inp, flex: 1 }}
              />
              <input
                value={l.quantity}
                onChange={(e) =>
                  setLines((ls) =>
                    ls.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x))
                  )
                }
                inputMode="numeric"
                placeholder="qty"
                style={{ ...inp, width: 60 }}
              />
              <input
                value={l.unitPrice}
                onChange={(e) =>
                  setLines((ls) =>
                    ls.map((x, j) => (j === i ? { ...x, unitPrice: e.target.value } : x))
                  )
                }
                inputMode="decimal"
                placeholder="unit €"
                style={{ ...inp, width: 80 }}
              />
              {lines.length > 1 && (
                <button
                  onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                  style={{ ...btn, padding: "6px 9px" }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
            <button
              onClick={() => setLines((ls) => [...ls, { name: "", quantity: "1", unitPrice: "" }])}
              style={btn}
            >
              ＋ Line
            </button>
            <span style={{ fontSize: 12, color: "var(--prv-text-3)" }}>
              Refund €{Math.round(draftRefund * 100) / 100}
            </span>
            <button
              onClick={submit}
              disabled={!orderId || create.isPending}
              style={{
                marginLeft: "auto",
                padding: "9px 18px",
                borderRadius: 100,
                background: "rgba(255,255,255,0.92)",
                color: "#000",
                border: "none",
                fontSize: 13,
                fontWeight: 640,
                cursor: "pointer",
                opacity: orderId && !create.isPending ? 1 : 0.5,
              }}
            >
              Open return
            </button>
          </div>
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
        Returns · newest first
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
          <p style={{ padding: "40px 20px", textAlign: "center", color: "var(--prv-text-4)" }}>
            Loading returns…
          </p>
        ) : returns.length === 0 ? (
          <p
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--prv-text-4)",
              fontSize: 14,
            }}
          >
            No returns yet. Use “New return” to open one against an order.
          </p>
        ) : (
          returns.map((r) => (
            <Row key={r.id} r={r} onAdvance={(status) => update.mutate({ id: r.id, status })} />
          ))
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
