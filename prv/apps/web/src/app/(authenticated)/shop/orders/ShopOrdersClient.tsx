"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import type { Order, OrderStatus } from "@/app/api/shop/orders/route"

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

function IconChevronRight() {
  return (
    <svg
      width="7"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg
      width="10"
      height="10"
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return "€" + n.toLocaleString("en-US")
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

type FilterId = "all" | OrderStatus

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Toate" },
  { id: "pending", label: "Nou" },
  { id: "confirmed", label: "Confirmed" },
  { id: "processing", label: "Processing" },
  { id: "shipped", label: "Expediat" },
  { id: "delivered", label: "Livrat" },
  { id: "cancelled", label: "Cancelled" },
]

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
    label: "Processing",
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
    label: "Confirmed",
    color: "#7eb8ff",
    bg: "rgba(100,160,255,0.12)",
    border: "rgba(100,160,255,0.24)",
  },
  cancelled: {
    label: "Cancelled",
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

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div
          style={{ width: 120, height: 28, background: "var(--prv-g2)", borderRadius: 8 }}
          className="animate-pulse"
        />
      </div>
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: 62,
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 16,
            }}
            className="animate-pulse"
          />
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            height: 90,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            borderRadius: 16,
            marginBottom: 8,
          }}
          className="animate-pulse"
        />
      ))}
    </div>
  )
}

// ── Order card ────────────────────────────────────────────────────────────────

function OrderCard({ order }: { order: Order }) {
  const cfg = STATUS_CONFIG[order.status]
  const isActive =
    order.status === "processing" || order.status === "pending" || order.status === "shipped"
  const itemsSummary = order.items.map((i) => i.productName).join(", ")

  return (
    <Link
      href={`/shop/orders/${order.id}`}
      style={{
        display: "block",
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        borderRadius: 16,
        padding: "12px 14px",
        position: "relative",
        overflow: "hidden",
        marginBottom: 8,
        textDecoration: "none",
      }}
    >
      {isActive && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            background: "linear-gradient(180deg,#ffaa00,#ffcc44)",
            borderRadius: "16px 0 0 16px",
          }}
        />
      )}
      <div
        style={{
          paddingLeft: isActive ? 4 : 0,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div style={{ flex: 1, marginRight: 10 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,255,255,0.35)",
              letterSpacing: ".03em",
              marginBottom: 2,
            }}
          >
            {order.ref} · {order.items.length} {order.items.length === 1 ? "produs" : "produse"}
          </p>
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "rgba(255,255,255,0.92)",
              lineHeight: 1.3,
            }}
          >
            {itemsSummary.length > 48 ? itemsSummary.slice(0, 48) + "…" : itemsSummary}
          </p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", marginTop: 2 }}>
            Placed: {fmtDate(order.placedAt)}
          </p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p
            style={{
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: "-0.3px",
              color: order.status === "delivered" ? "#5affa0" : "rgba(255,255,255,0.92)",
            }}
          >
            {fmt(order.totalGross)}
          </p>
          <div style={{ marginTop: 5 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: ".04em",
                textTransform: "uppercase",
                padding: "3px 8px",
                borderRadius: 100,
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                color: cfg.color,
              }}
            >
              {cfg.label}
            </span>
          </div>
        </div>
      </div>
      <div
        style={{
          paddingLeft: isActive ? 4 : 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: isActive ? "#ffcc44" : "rgba(255,255,255,0.30)",
            display: "flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          {isActive && <IconClock />}
          {isActive
            ? `Livrare est. ${fmtDate(order.estimatedDelivery)}`
            : `Livrat: ${fmtDate(order.estimatedDelivery)}`}
        </span>
        <span style={{ color: "rgba(255,255,255,0.20)" }}>
          <IconChevronRight />
        </span>
      </div>
    </Link>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ShopOrdersClient() {
  const [orders, setOrders] = useState<Order[]>([])
  const [meta, setMeta] = useState<{
    total: number
    processing: number
    delivered: number
    totalValue: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterId>("all")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/shop/orders")
      const data = await res.json()
      setOrders(data.orders ?? [])
      setMeta(data.meta ?? null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <Skeleton />

  const visible =
    filter === "all"
      ? orders
      : orders.filter(
          (o) => o.status === filter || (filter === "processing" && o.status === "pending")
        )

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            href="/shop"
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
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "-0.5px",
              color: "rgba(255,255,255,0.95)",
            }}
          >
            Comendays mele
          </h1>
        </div>
      </div>

      {/* KPI strip */}
      {meta && (
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}
        >
          {[
            { label: "Total", value: String(meta.total), color: "rgba(255,255,255,0.95)" },
            { label: "Processing", value: String(meta.processing), color: "#ffcc44" },
            { label: "Valoare", value: fmt(meta.totalValue), color: "#5affa0" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                background: "var(--prv-g1)",
                border: "1px solid var(--prv-border-subtle)",
                borderRadius: 16,
                padding: "10px 10px 8px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 1,
                  background:
                    "linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent)",
                }}
              />
              <p style={{ fontSize: 15, fontWeight: 700, color, letterSpacing: "-0.3px" }}>
                {value}
              </p>
              <p
                style={{
                  fontSize: 9,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.35)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginTop: 2,
                }}
              >
                {label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filter chips */}
      <div
        style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}
      >
        {FILTERS.map(({ id, label }) => {
          const count =
            id === "all"
              ? null
              : orders.filter(
                  (o) => o.status === id || (id === "processing" && o.status === "pending")
                ).length
          return (
            <button
              key={id}
              onClick={() => setFilter(id)}
              style={{
                flexShrink: 0,
                padding: "5px 12px",
                borderRadius: 100,
                fontSize: 11,
                fontWeight: 500,
                border:
                  filter === id
                    ? "1px solid rgba(255,255,255,0.28)"
                    : "1px solid rgba(255,255,255,0.10)",
                background: filter === id ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.07)",
                color: filter === id ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.55)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {label}
              {count !== null && count > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: id === "processing" ? "#ffcc44" : "rgba(255,255,255,0.65)",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* List */}
      <div>
        {visible.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
              color: "rgba(255,255,255,0.30)",
              fontSize: 14,
            }}
          >
            No orders found
          </div>
        ) : (
          visible.map((o) => <OrderCard key={o.id} order={o} />)
        )}
      </div>
    </div>
  )
}
