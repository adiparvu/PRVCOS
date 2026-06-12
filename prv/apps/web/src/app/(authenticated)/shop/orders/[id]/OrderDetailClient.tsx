"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import type { Order, OrderStatus } from "@/app/api/shop/orders/route"

// ── Types ─────────────────────────────────────────────────────────────────────

type FullOrder = Order & { updatedAt: string }

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  pending: {
    label: "Nou",
    color: "#ffcc44",
    bg: "rgba(255,200,50,0.12)",
    border: "rgba(255,200,50,0.24)",
  },
  processing: {
    label: "În procesare",
    color: "#ffcc44",
    bg: "rgba(255,200,50,0.12)",
    border: "rgba(255,200,50,0.24)",
  },
  shipped: {
    label: "Expediat",
    color: "#7eb8ff",
    bg: "rgba(100,160,255,0.12)",
    border: "rgba(100,160,255,0.24)",
  },
  delivered: {
    label: "Livrat",
    color: "#5affa0",
    bg: "rgba(80,255,140,0.10)",
    border: "rgba(80,255,140,0.20)",
  },
  confirmed: {
    label: "Confirmat",
    color: "#7eb8ff",
    bg: "rgba(100,160,255,0.12)",
    border: "rgba(100,160,255,0.24)",
  },
  cancelled: {
    label: "Anulat",
    color: "rgba(255,255,255,0.30)",
    bg: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.10)",
  },
  refunded: {
    label: "Rambursat",
    color: "rgba(255,255,255,0.45)",
    bg: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.12)",
  },
}

const NEXT_STATUS: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  pending: { to: "confirmed", label: "Confirmă Comanda" },
  confirmed: { to: "processing", label: "Marchează În Procesare" },
  processing: { to: "shipped", label: "Marchează Expediat" },
  shipped: { to: "delivered", label: "Marchează Livrat" },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return "€" + n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconChevronLeft() {
  return (
    <svg
      width="9"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

function IconMap() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      <div
        style={{
          height: 28,
          width: 160,
          background: "var(--prv-g2)",
          borderRadius: 8,
          marginBottom: 20,
        }}
        className="animate-pulse"
      />
      <div
        style={{
          height: 80,
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 18,
          marginBottom: 10,
        }}
        className="animate-pulse"
      />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            height: 58,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            borderRadius: 14,
            marginBottom: 6,
          }}
          className="animate-pulse"
        />
      ))}
      <div
        style={{
          height: 100,
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 18,
          marginBottom: 10,
          marginTop: 10,
        }}
        className="animate-pulse"
      />
    </div>
  )
}

// ── Progress steps ────────────────────────────────────────────────────────────

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "Plasat" },
  { status: "processing", label: "Procesare" },
  { status: "shipped", label: "Expediat" },
  { status: "delivered", label: "Livrat" },
]

function StatusStepper({ current }: { current: OrderStatus }) {
  const isCancelled = current === "cancelled"
  const currentIdx = STEPS.findIndex((s) => s.status === current)

  return (
    <div
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        borderRadius: 18,
        padding: "16px 18px",
        marginBottom: 14,
      }}
    >
      {isCancelled ? (
        <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
          Comandă anulată
        </p>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {STEPS.map((step, i) => {
            const done = i < currentIdx
            const active = i === currentIdx
            return (
              <div
                key={step.status}
                style={{
                  display: "flex",
                  alignItems: "center",
                  flex: i < STEPS.length - 1 ? 1 : "none",
                }}
              >
                <div
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 100,
                      background: done
                        ? "#5affa0"
                        : active
                          ? "rgba(255,255,255,0.92)"
                          : "rgba(255,255,255,0.10)",
                      border: `2px solid ${done ? "#5affa0" : active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.14)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {done && (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#000"
                        strokeWidth="3"
                        strokeLinecap="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    {active && (
                      <div style={{ width: 8, height: 8, borderRadius: 100, background: "#000" }} />
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: done || active ? "rgba(255,255,255,0.70)" : "rgba(255,255,255,0.25)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {step.label}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      background: done ? "#5affa0" : "rgba(255,255,255,0.09)",
                      margin: "0 4px",
                      marginBottom: 16,
                      borderRadius: 1,
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OrderDetailClient({ id }: { id: string }) {
  const [order, setOrder] = useState<FullOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/shop/orders/${id}`)
      if (!res.ok) return
      const data = await res.json()
      setOrder(data.order)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const advanceStatus = useCallback(
    async (toStatus: OrderStatus) => {
      if (!order) return
      setAdvancing(true)
      try {
        const res = await fetch(`/api/shop/orders/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: toStatus }),
        })
        if (res.ok) {
          setOrder((o) => o && { ...o, status: toStatus })
        }
      } finally {
        setAdvancing(false)
      }
    },
    [id, order]
  )

  if (loading) return <Skeleton />
  if (!order)
    return (
      <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
        <p
          style={{
            textAlign: "center",
            padding: "48px 0",
            color: "rgba(255,255,255,0.30)",
            fontSize: 14,
          }}
        >
          Comanda nu a fost găsită.
        </p>
        <div style={{ textAlign: "center" }}>
          <Link
            href="/shop/orders"
            style={{ color: "rgba(255,255,255,0.50)", fontSize: 13, textDecoration: "none" }}
          >
            ← Înapoi la comenzi
          </Link>
        </div>
      </div>
    )

  const cfg = STATUS_CONFIG[order.status]
  const next = NEXT_STATUS[order.status]

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <Link
          href="/shop/orders"
          style={{
            display: "flex",
            alignItems: "center",
            color: "rgba(255,255,255,0.40)",
            textDecoration: "none",
            marginRight: 2,
          }}
        >
          <IconChevronLeft />
        </Link>
        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-0.4px",
              color: "rgba(255,255,255,0.95)",
              lineHeight: 1.2,
            }}
          >
            {order.ref}
          </h1>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", marginTop: 2 }}>
            Plasată {fmtDate(order.placedAt)}
          </p>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            padding: "5px 10px",
            borderRadius: 100,
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            color: cfg.color,
          }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Status stepper */}
      <StatusStepper current={order.status} />

      {/* Delivery info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        <div
          style={{
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            borderRadius: 14,
            padding: "12px 14px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 4,
              color: "rgba(255,159,10,0.8)",
            }}
          >
            <IconClock />
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "rgba(255,255,255,0.30)",
              }}
            >
              Livrare est.
            </p>
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.90)" }}>
            {fmtDate(order.estimatedDelivery)}
          </p>
        </div>
        <div
          style={{
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            borderRadius: 14,
            padding: "12px 14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ color: "rgba(255,255,255,0.30)" }}>
              <IconMap />
            </span>
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "rgba(255,255,255,0.30)",
              }}
            >
              Adresă
            </p>
          </div>
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "rgba(255,255,255,0.75)",
              lineHeight: 1.4,
            }}
          >
            {order.deliveryAddress || "—"}
          </p>
        </div>
      </div>

      {/* Line items */}
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "rgba(255,255,255,0.35)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 8,
        }}
      >
        Produse ({order.items.length})
      </p>
      <div
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 16,
          overflow: "hidden",
          marginBottom: 14,
        }}
      >
        {order.items.map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              borderBottom:
                i < order.items.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
            }}
          >
            <div style={{ flex: 1, marginRight: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.90)" }}>
                {item.productName}
              </p>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", marginTop: 2 }}>
                {item.qty} × {fmt(item.unitPrice)}
              </p>
            </div>
            <p
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "rgba(255,255,255,0.85)",
                flexShrink: 0,
              }}
            >
              {fmt(item.qty * item.unitPrice)}
            </p>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 16,
          overflow: "hidden",
          marginBottom: 14,
        }}
      >
        {[
          { label: "Subtotal (fără TVA)", value: fmt(order.totalNet) },
          { label: "TVA (19%)", value: fmt(order.totalVat) },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.40)" }}>{label}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>
              {value}
            </span>
          </div>
        ))}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 14px",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.90)" }}>
            Total
          </span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: order.status === "delivered" ? "#5affa0" : "rgba(255,255,255,0.95)",
              letterSpacing: "-0.3px",
            }}
          >
            {fmt(order.totalGross)}
          </span>
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            padding: "12px 14px",
            marginBottom: 14,
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "rgba(255,255,255,0.30)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 5,
            }}
          >
            Note
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.60)", lineHeight: 1.5 }}>
            {order.notes}
          </p>
        </div>
      )}

      {/* Advance status action */}
      {next && (
        <button
          onClick={() => advanceStatus(next.to)}
          disabled={advancing}
          style={{
            width: "100%",
            height: 50,
            borderRadius: 16,
            background: "rgba(255,255,255,0.92)",
            color: "#000",
            fontSize: 15,
            fontWeight: 700,
            border: "none",
            cursor: advancing ? "default" : "pointer",
            opacity: advancing ? 0.7 : 1,
            marginTop: 4,
          }}
        >
          {advancing ? "Se actualizează..." : next.label}
        </button>
      )}
    </div>
  )
}
