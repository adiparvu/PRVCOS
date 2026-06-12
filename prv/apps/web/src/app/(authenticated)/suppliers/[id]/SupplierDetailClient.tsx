"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useSheetStack } from "@prv/ui"
import type {
  SupplierDetail,
  SupplierActivityType,
  OrderStatus,
} from "@/app/api/suppliers/[id]/route"

interface SupplierDetailClientProps {
  id: string
}

function getRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 2) return "Acum"
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

// ── Icons (SF Symbol style) ───────────────────────────────────────────────────

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

function IconPhone() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.5 2 2 0 0 1 3.59 1.3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function IconMail() {
  return (
    <svg
      width="16"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="2,4 12,13 22,4" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function IconPencil() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  )
}

function IconList() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IconTruck() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  )
}

function IconWarning() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  active: {
    label: "Active",
    color: "#5affa0",
    bg: "rgba(90,255,160,0.12)",
    avatarBg: "rgba(255,255,255,0.08)",
    avatarBorder: "rgba(255,255,255,0.14)",
    avatarColor: "rgba(255,255,255,0.75)",
  },
  pending: {
    label: "Pending",
    color: "#ffcc44",
    bg: "rgba(255,204,68,0.13)",
    avatarBg: "rgba(255,204,68,0.10)",
    avatarBorder: "rgba(255,204,68,0.22)",
    avatarColor: "#ffcc44",
  },
  at_risk: {
    label: "Risc",
    color: "#ff6b6b",
    bg: "rgba(255,107,107,0.12)",
    avatarBg: "rgba(255,107,107,0.10)",
    avatarBorder: "rgba(255,107,107,0.25)",
    avatarColor: "#ff6b6b",
  },
  inactive: {
    label: "Inactive",
    color: "rgba(255,255,255,0.35)",
    bg: "rgba(255,255,255,0.07)",
    avatarBg: "rgba(255,255,255,0.06)",
    avatarBorder: "rgba(255,255,255,0.09)",
    avatarColor: "rgba(255,255,255,0.45)",
  },
}

const ORDER_STATUS: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  ordered: { label: "Placed", color: "#7eb8ff", bg: "rgba(126,184,255,0.13)" },
  delivered: { label: "Livrat", color: "#5affa0", bg: "rgba(90,255,160,0.12)" },
  partial: { label: "Partial", color: "#ffcc44", bg: "rgba(255,204,68,0.12)" },
  cancelled: { label: "Cancelled", color: "rgba(255,255,255,0.35)", bg: "rgba(255,255,255,0.07)" },
  pending: { label: "Pending", color: "#ffcc44", bg: "rgba(255,204,68,0.12)" },
}

const ACTIVITY_DOT: Record<SupplierActivityType, string> = {
  order_placed: "#7eb8ff",
  order_delivered: "#5affa0",
  order_partial: "#ffcc44",
  invoice_paid: "#5affa0",
  contract_renewed: "#5affa0",
  late_delivery: "#ff6b6b",
  note: "rgba(255,255,255,0.35)",
  created: "rgba(255,255,255,0.45)",
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number) {
  return "€" + amount.toLocaleString("en-US")
}
function fmtK(amount: number) {
  return `€${Math.round(amount / 1000)}k`
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "rgba(255,255,255,0.35)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        margin: "20px 4px 8px",
      }}
    >
      {children}
    </p>
  )
}

function Skeleton({ w, h, radius = 6 }: { w: number | string; h: number; radius?: number }) {
  return (
    <div
      style={{ width: w, height: h, borderRadius: radius, background: "rgba(255,255,255,0.07)" }}
    />
  )
}

function Stars({ rating }: { rating: number }) {
  const filled = Math.round(rating)
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="10" height="10" viewBox="0 0 12 12">
          <polygon
            points="6 1 7.5 4.5 11 5 8.5 7.5 9 11 6 9 3 11 3.5 7.5 1 5 4.5 4.5"
            fill={i <= filled ? "#ffcc44" : "rgba(255,255,255,0.12)"}
          />
        </svg>
      ))}
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginLeft: 4 }}>
        {rating.toFixed(1)}
      </span>
    </div>
  )
}

// ── Performance bar ───────────────────────────────────────────────────────────

function PerfBar({ label, value }: { label: string; value: number }) {
  const color = value >= 90 ? "#5affa0" : value >= 75 ? "#ffcc44" : "#ff6b6b"
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 0",
        borderBottom: "1px solid var(--prv-border-subtle)",
      }}
    >
      <p
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.65)",
          margin: 0,
          width: 120,
          flexShrink: 0,
        }}
      >
        {label}
      </p>
      <div
        style={{
          flex: 1,
          height: 4,
          borderRadius: 2,
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        <div style={{ height: "100%", width: `${value}%`, borderRadius: 2, background: color }} />
      </div>
      <p style={{ fontSize: 12, fontWeight: 700, color, margin: 0, width: 36, textAlign: "right" }}>
        {value}%
      </p>
    </div>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        borderRadius: 20,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <Skeleton w={64} h={64} radius={18} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton w="55%" h={16} />
          <Skeleton w="40%" h={12} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Skeleton w={72} h={30} radius={8} />
        <Skeleton w={72} h={30} radius={8} />
        <Skeleton w={90} h={30} radius={8} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} w="100%" h={52} radius={12} />
        ))}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function SupplierDetailClient({ id }: SupplierDetailClientProps) {
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { openSheet } = useSheetStack()

  const fetchSupplier = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/suppliers/${id}`, { cache: "no-store" })
      if (!res.ok) throw new Error("Not found")
      const data = await res.json()
      setSupplier(data.supplier)
    } catch {
      setError("Failed to load supplier.")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchSupplier()
  }, [fetchSupplier])

  function openActions() {
    if (!supplier) return
    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: supplier.name,
      render: (onClose) => (
        <div
          style={{ padding: "8px 20px 32px", display: "flex", flexDirection: "column", gap: 10 }}
        >
          {/* Risk alert in sheet */}
          {supplier.riskReason && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                background: "rgba(255,107,107,0.07)",
                border: "1px solid rgba(255,107,107,0.18)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#ff6b6b",
              }}
            >
              <IconWarning />
              <p style={{ fontSize: 12, color: "#ff6b6b", margin: 0 }}>{supplier.riskReason}</p>
            </div>
          )}
          {/* Contact */}
          <div
            style={{
              background: "var(--prv-g2)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 14,
              padding: "10px",
              display: "flex",
              gap: 8,
            }}
          >
            <a
              href={`tel:${supplier.phone}`}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "10px 0",
                borderRadius: 10,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid var(--prv-border-subtle)",
                color: "rgba(255,255,255,0.80)",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <IconPhone />
              Call
            </a>
            <a
              href={`mailto:${supplier.email}`}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "10px 0",
                borderRadius: 10,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid var(--prv-border-subtle)",
                color: "rgba(255,255,255,0.80)",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <IconMail />
              Email
            </a>
          </div>
          {/* New order */}
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 16px",
              borderRadius: 14,
              background: "rgba(126,184,255,0.12)",
              border: "1px solid rgba(126,184,255,0.22)",
              color: "#7eb8ff",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "rgba(126,184,255,0.14)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconTruck />
            </div>
            New Order
          </button>
          {/* Contract renewal */}
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 16px",
              borderRadius: 14,
              background: "rgba(255,204,68,0.10)",
              border: "1px solid rgba(255,204,68,0.20)",
              color: "#ffcc44",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "rgba(255,204,68,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconCalendar />
            </div>
            Contract Renewal
          </button>
          {/* Edit */}
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 16px",
              borderRadius: 14,
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              color: "rgba(255,255,255,0.75)",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconPencil />
            </div>
            Edit Supplier
          </button>
          {/* All orders */}
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 16px",
              borderRadius: 14,
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              color: "rgba(255,255,255,0.65)",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconList />
            </div>
            Toate Comendays
          </button>
        </div>
      ),
    })
  }

  const backLink = (
    <Link
      href="/suppliers"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        marginBottom: 20,
        color: "rgba(255,255,255,0.45)",
        textDecoration: "none",
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      <IconChevronLeft />
      Furnizori
    </Link>
  )

  if (loading) {
    return (
      <div style={{ padding: "56px 16px 112px", maxWidth: 640, margin: "0 auto" }}>
        {backLink}
        <LoadingSkeleton />
      </div>
    )
  }

  if (error || !supplier) {
    return (
      <div style={{ padding: "56px 16px 112px", maxWidth: 640, margin: "0 auto" }}>
        {backLink}
        <div
          style={{
            textAlign: "center",
            color: "rgba(255,255,255,0.35)",
            fontSize: 14,
            paddingTop: 60,
          }}
        >
          {error ?? "Supplier not found."}
        </div>
      </div>
    )
  }

  const s = STATUS_CONFIG[supplier.status]
  const isRisk = supplier.status === "at_risk"

  return (
    <div style={{ padding: "56px 16px 112px", maxWidth: 640, margin: "0 auto" }}>
      {backLink}

      {/* Hero */}
      <div
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 20,
          padding: 16,
          marginBottom: 12,
          ...(isRisk
            ? {
                borderLeft: "3px solid transparent",
                borderImage: "linear-gradient(180deg,#ff4444,#ff6b6b) 1",
                paddingLeft: 13,
              }
            : {}),
        }}
      >
        {/* Avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: s.avatarBg,
              border: `1.5px solid ${s.avatarBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 800,
              color: s.avatarColor,
              flexShrink: 0,
            }}
          >
            {supplier.initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: 19,
                fontWeight: 700,
                color: "rgba(255,255,255,0.92)",
                margin: "0 0 5px",
                lineHeight: 1.2,
              }}
            >
              {supplier.name}
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "4px 9px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.50)",
                }}
              >
                {supplier.category}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 20,
                  background: s.bg,
                  color: s.color,
                }}
              >
                {s.label}
              </span>
            </div>
          </div>
        </div>

        {/* Contact + meta pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <a
            href={`tel:${supplier.phone}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              padding: "5px 11px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid var(--prv-border-subtle)",
              color: "rgba(255,255,255,0.70)",
              textDecoration: "none",
            }}
          >
            <IconPhone />
            Call
          </a>
          <a
            href={`mailto:${supplier.email}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              padding: "5px 11px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid var(--prv-border-subtle)",
              color: "rgba(255,255,255,0.70)",
              textDecoration: "none",
            }}
          >
            <IconMail />
            Email
          </a>
          {supplier.paymentTerms && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                padding: "5px 10px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.30)",
              }}
            >
              {supplier.paymentTerms}
            </span>
          )}
          {supplier.contractExpiry && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                padding: "5px 10px",
                borderRadius: 8,
                background: isRisk ? "rgba(255,107,107,0.08)" : "rgba(255,255,255,0.04)",
                color: isRisk ? "#ff6b6b" : "rgba(255,255,255,0.30)",
              }}
            >
              Exp.{" "}
              {new Date(supplier.contractExpiry).toLocaleDateString("ro-RO", {
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
        </div>

        {/* Risk alert */}
        {supplier.riskReason && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              borderRadius: 12,
              background: "rgba(255,107,107,0.07)",
              border: "1px solid rgba(255,107,107,0.18)",
              marginBottom: 14,
            }}
          >
            <span style={{ color: "#ff6b6b" }}>
              <IconWarning />
            </span>
            <p style={{ fontSize: 12, color: "#ff6b6b", margin: 0 }}>{supplier.riskReason}</p>
          </div>
        )}

        {/* KPI row */}
        {supplier.status !== "pending" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
            {[
              {
                v: String(supplier.trustScore),
                l: "Trust",
                c:
                  supplier.trustScore >= 80
                    ? "#5affa0"
                    : supplier.trustScore >= 60
                      ? "#ffcc44"
                      : "#ff6b6b",
              },
              { v: String(supplier.orders), l: "Comenzi", c: "rgba(255,255,255,0.85)" },
              { v: fmtK(supplier.annualSpend), l: "Anual", c: "#5affa0" },
              { v: supplier.rating.toFixed(1), l: "Rating", c: "#ffcc44" },
            ].map(({ v, l, c }) => (
              <div
                key={l}
                style={{
                  padding: "10px 0",
                  borderRadius: 12,
                  textAlign: "center",
                  background: "var(--prv-g2)",
                }}
              >
                <p style={{ fontSize: 15, fontWeight: 700, color: c, margin: 0 }}>{v}</p>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.35)",
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    margin: "3px 0 0",
                  }}
                >
                  {l}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Rating stars for non-pending */}
        {supplier.rating > 0 && (
          <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}>
            <Stars rating={supplier.rating} />
          </div>
        )}
      </div>

      {/* Recent Orders */}
      {supplier.recentOrders.length > 0 && (
        <>
          <SectionLabel>Comenzi recente</SectionLabel>
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 18,
              overflow: "hidden",
              marginBottom: 4,
            }}
          >
            {supplier.recentOrders.map((o, idx) => {
              const os = ORDER_STATUS[o.status] ?? {
                label: o.status,
                color: "rgba(255,255,255,0.35)",
                bg: "rgba(255,255,255,0.07)",
              }
              return (
                <div
                  key={o.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "13px 16px",
                    borderBottom:
                      idx < supplier.recentOrders.length - 1
                        ? "1px solid var(--prv-border-subtle)"
                        : "none",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.85)",
                        margin: "0 0 3px",
                      }}
                    >
                      {o.ref}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.35)",
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {o.projectName}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "rgba(255,255,255,0.80)",
                        margin: 0,
                      }}
                    >
                      {fmt(o.amount)}
                    </p>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: 6,
                        background: os.bg,
                        color: os.color,
                      }}
                    >
                      {os.label}
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.20)" }}>
                      <IconChevronRight />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ textAlign: "right", marginBottom: 4 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#7eb8ff",
                padding: "4px 4px",
                cursor: "pointer",
              }}
            >
              Toate comendays →
            </span>
          </div>
        </>
      )}

      {/* Delivery Performance */}
      {supplier.status !== "pending" && (
        <>
          <SectionLabel>Delivery Performance</SectionLabel>
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 18,
              padding: "0 16px",
            }}
          >
            <PerfBar label="La timp" value={supplier.onTimeDelivery} />
            <PerfBar label="Calitate" value={supplier.qualityScore} />
            <PerfBar label="Documentation" value={supplier.documentationScore} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0" }}>
              <p
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.65)",
                  margin: 0,
                  width: 120,
                  flexShrink: 0,
                }}
              >
                Trust Score
              </p>
              <div
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  background: "rgba(255,255,255,0.08)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${supplier.trustScore}%`,
                    borderRadius: 2,
                    background:
                      supplier.trustScore >= 80
                        ? "#5affa0"
                        : supplier.trustScore >= 60
                          ? "#ffcc44"
                          : "#ff6b6b",
                  }}
                />
              </div>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color:
                    supplier.trustScore >= 80
                      ? "#5affa0"
                      : supplier.trustScore >= 60
                        ? "#ffcc44"
                        : "#ff6b6b",
                  margin: 0,
                  width: 36,
                  textAlign: "right",
                }}
              >
                {supplier.trustScore}
              </p>
            </div>
          </div>
        </>
      )}

      {/* Activity */}
      {supplier.activities.length > 0 && (
        <>
          <SectionLabel>Activitate</SectionLabel>
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 18,
              overflow: "hidden",
            }}
          >
            {supplier.activities.map((act, idx) => (
              <div
                key={act.id}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "12px 16px",
                  borderBottom:
                    idx < supplier.activities.length - 1
                      ? "1px solid var(--prv-border-subtle)"
                      : "none",
                }}
              >
                <div style={{ paddingTop: 4, flexShrink: 0 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: ACTIVITY_DOT[act.type] ?? "rgba(255,255,255,0.25)",
                    }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,0.75)",
                      margin: "0 0 3px",
                      lineHeight: 1.4,
                    }}
                  >
                    {act.text}
                  </p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", margin: 0 }}>
                    {getRelativeTime(act.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* FAB */}
      <button
        onClick={openActions}
        style={{
          position: "fixed",
          bottom: 96,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.15)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          border: "1px solid rgba(255,255,255,0.28)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.22)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.90)",
          cursor: "pointer",
          zIndex: 40,
        }}
      >
        <IconPlus />
      </button>
    </div>
  )
}
