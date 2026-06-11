"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderSummary {
  totalOrders: number
  pendingOrders: number
  processingOrders: number
  shippedOrders: number
  deliveredOrders: number
  cancelledOrders: number
  totalRevenue: string
  periodKey: string
}

interface TopProduct {
  productId: string
  productName: string
  totalSold: number
  totalRevenue: string
}

interface LowStockProduct {
  id: string
  name: string
  sku: string | null
  stockQuantity: number
  stockMinimum: number
}

interface AnalyticsData {
  orderSummary: OrderSummary
  topProducts: TopProduct[]
  lowStock: { count: number; products: LowStockProduct[] }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRevenue(v: string | number) {
  return (
    "€" + Number(v).toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  )
}

function prevMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number)
  const d = new Date(y!, m! - 1, 1)
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}
function nextMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number)
  const d = new Date(y!, m! - 1, 1)
  d.setMonth(d.getMonth() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}
function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number)
  return new Date(y!, m! - 1, 1).toLocaleDateString("ro-RO", { month: "long", year: "numeric" })
}
function thisMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
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
function IconChevronRight() {
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
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}
function IconWarning() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      <div
        style={{
          height: 32,
          width: 180,
          background: "var(--prv-g2)",
          borderRadius: 8,
          marginBottom: 20,
        }}
        className="animate-pulse"
      />
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              height: 68,
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 16,
            }}
            className="animate-pulse"
          />
        ))}
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            height: 52,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            borderRadius: 12,
            marginBottom: 6,
          }}
          className="animate-pulse"
        />
      ))}
    </div>
  )
}

// ── KPI Tile ──────────────────────────────────────────────────────────────────

function KpiTile({
  label,
  value,
  color,
  sub,
}: {
  label: string
  value: string
  color: string
  sub?: string
}) {
  return (
    <div
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        borderRadius: 16,
        padding: "11px 12px 9px",
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
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent)",
        }}
      />
      <p style={{ fontSize: 16, fontWeight: 700, color, letterSpacing: "-0.4px", lineHeight: 1.2 }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>{sub}</p>}
      <p
        style={{
          fontSize: 9,
          fontWeight: 500,
          color: "rgba(255,255,255,0.35)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginTop: 3,
        }}
      >
        {label}
      </p>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ShopAnalyticsClient() {
  const [month, setMonth] = useState(thisMonth())
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (m: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/shop/analytics?month=${m}-01&limit=10`)
      if (!res.ok) return
      const json = await res.json()
      setData(json)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(month)
  }, [load, month])

  if (loading) return <Skeleton />

  const s = data?.orderSummary
  const tops = data?.topProducts ?? []
  const maxSold = tops[0]?.totalSold ?? 1

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
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
            flex: 1,
          }}
        >
          Analize Shop
        </h1>
      </div>

      {/* Month picker */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 14,
          padding: "9px 14px",
          marginBottom: 14,
        }}
      >
        <button
          onClick={() => setMonth(prevMonth(month))}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.40)",
            cursor: "pointer",
            padding: 4,
            display: "flex",
          }}
        >
          <IconChevronLeft />
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
          {monthLabel(month)}
        </span>
        <button
          onClick={() => setMonth(nextMonth(month))}
          disabled={month >= thisMonth()}
          style={{
            background: "none",
            border: "none",
            color: month >= thisMonth() ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.40)",
            cursor: month >= thisMonth() ? "default" : "pointer",
            padding: 4,
            display: "flex",
          }}
        >
          <IconChevronRight />
        </button>
      </div>

      {/* KPI grid */}
      {s && (
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}
        >
          <KpiTile
            label="Total comenzi"
            value={String(s.totalOrders)}
            color="rgba(255,255,255,0.95)"
          />
          <KpiTile label="Venit" value={fmtRevenue(s.totalRevenue)} color="#5affa0" />
          <KpiTile label="Livrate" value={String(s.deliveredOrders)} color="#5affa0" />
          <KpiTile label="Pending" value={String(s.pendingOrders)} color="#ffcc44" />
          <KpiTile label="În procesare" value={String(s.processingOrders)} color="#ffcc44" />
          <KpiTile
            label="Anulate"
            value={String(s.cancelledOrders)}
            color="rgba(255,255,255,0.40)"
          />
        </div>
      )}

      {/* Low stock alert */}
      {(data?.lowStock.count ?? 0) > 0 && (
        <div
          style={{
            background: "rgba(255,159,10,0.08)",
            border: "1px solid rgba(255,159,10,0.22)",
            borderRadius: 14,
            padding: "10px 14px",
            marginBottom: 18,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <span style={{ color: "rgba(255,159,10,0.9)", marginTop: 1 }}>
            <IconWarning />
          </span>
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "rgba(255,159,10,0.9)",
                marginBottom: 4,
              }}
            >
              {data!.lowStock.count}{" "}
              {data!.lowStock.count === 1 ? "produs cu stoc scăzut" : "produse cu stoc scăzut"}
            </p>
            {data!.lowStock.products.slice(0, 3).map((p) => (
              <p
                key={p.id}
                style={{ fontSize: 11, color: "rgba(255,255,255,0.50)", marginBottom: 1 }}
              >
                {p.name} — {p.stockQuantity}/{p.stockMinimum} unități
              </p>
            ))}
            {data!.lowStock.count > 3 && (
              <p style={{ fontSize: 11, color: "rgba(255,159,10,0.6)", marginTop: 3 }}>
                +{data!.lowStock.count - 3} altele
              </p>
            )}
          </div>
          <Link
            href="/shop/manage"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,159,10,0.9)",
              textDecoration: "none",
              flexShrink: 0,
              alignSelf: "center",
            }}
          >
            Gestionează
          </Link>
        </div>
      )}

      {/* Top products */}
      <div style={{ marginBottom: 8 }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "rgba(255,255,255,0.35)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 10,
          }}
        >
          Top produse vândute
        </p>
        {tops.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "32px 0",
              color: "rgba(255,255,255,0.25)",
              fontSize: 13,
            }}
          >
            Nicio comandă înregistrată în această perioadă
          </div>
        ) : (
          tops.map((p, i) => {
            const barW = Math.max(4, Math.round((p.totalSold / maxSold) * 100))
            return (
              <div
                key={p.productId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  background: "var(--prv-g1)",
                  border: "1px solid var(--prv-border-subtle)",
                  borderRadius: 12,
                  marginBottom: 6,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Progress bar background */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${barW}%`,
                    background: "rgba(255,255,255,0.03)",
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.25)",
                    width: 16,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.90)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {p.productName}
                  </p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
                    {fmtRevenue(p.totalRevenue)}
                  </p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
                    {p.totalSold} vândute
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
