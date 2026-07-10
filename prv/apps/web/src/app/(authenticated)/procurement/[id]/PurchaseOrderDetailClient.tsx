"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { usePurchaseOrderDetail } from "@/lib/api-hooks"
import Link from "next/link"
import { useSheetStack } from "@prv/ui"
import type { PODetail, POActivityType } from "@/app/api/procurement/[id]/route"

interface PurchaseOrderDetailClientProps {
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

function formatNeededBy(iso: string) {
  return new Date(iso).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
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

function Skeleton({ w, h, radius = 6 }: { w: number | string; h: number; radius?: number }) {
  return (
    <div
      style={{ width: w, height: h, borderRadius: radius, background: "rgba(255,255,255,0.07)" }}
    />
  )
}

const ACTIVITY_DOT: Record<string, string> = {
  created: "rgba(255,255,255,.35)",
  submitted: "rgba(10,132,255,.8)",
  approved: "rgba(48,209,88,.85)",
  rejected: "rgba(255,69,58,.85)",
  in_transit: "rgba(10,132,255,.8)",
  delivered: "rgba(48,209,88,.85)",
  note: "rgba(255,255,255,.35)",
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Pending: { label: "Pending", color: "rgba(255,159,10,.95)", bg: "rgba(255,159,10,.13)" },
  Approved: { label: "Approved", color: "rgba(48,209,88,.95)", bg: "rgba(48,209,88,.13)" },
  Draft: { label: "Draft", color: "rgba(255,255,255,.55)", bg: "rgba(255,255,255,.08)" },
  Rejected: { label: "Rejected", color: "rgba(255,69,58,.95)", bg: "rgba(255,69,58,.12)" },
  "In Transit": { label: "In Transit", color: "rgba(10,132,255,.9)", bg: "rgba(10,132,255,.12)" },
}

// ── Sheet button helper ───────────────────────────────────────────────────────

type SheetColor = "blue" | "green" | "red" | "white" | "amber"

function SheetBtn({
  color,
  icon,
  label,
  sub,
  onClick,
}: {
  color: SheetColor
  icon: React.ReactNode
  label: string
  sub: string
  onClick: () => void
}) {
  const styles: Record<SheetColor, React.CSSProperties> = {
    blue: { background: "rgba(10,132,255,.15)", border: "1px solid rgba(10,132,255,.25)" },
    green: { background: "rgba(48,209,88,.12)", border: "1px solid rgba(48,209,88,.2)" },
    red: { background: "rgba(255,69,58,.10)", border: "1px solid rgba(255,69,58,.2)" },
    white: { background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.09)" },
    amber: { background: "rgba(255,159,10,.12)", border: "1px solid rgba(255,159,10,.22)" },
  }
  const labelColor: Record<SheetColor, string> = {
    blue: "rgba(10,132,255,.9)",
    green: "rgba(48,209,88,.95)",
    red: "rgba(255,69,58,.95)",
    white: "var(--prv-text-1)",
    amber: "rgba(255,159,10,.95)",
  }
  const iconBg: Record<SheetColor, string> = {
    blue: "rgba(10,132,255,.2)",
    green: "rgba(48,209,88,.15)",
    red: "rgba(255,69,58,.15)",
    white: "rgba(255,255,255,.08)",
    amber: "rgba(255,159,10,.18)",
  }
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        borderRadius: 14,
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
        ...styles[color],
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: iconBg[color],
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 15, fontWeight: 600, color: labelColor[color], margin: 0 }}>
          {label}
        </p>
        <p style={{ fontSize: 12, color: "var(--prv-text-3)", margin: "2px 0 0" }}>{sub}</p>
      </div>
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

function RejectReasonSheet({
  onSubmit,
  onCancel,
  pending,
}: {
  onSubmit: (reason: string) => void
  onCancel: () => void
  pending: boolean
}) {
  const [reason, setReason] = useState("")
  return (
    <div style={{ padding: "8px 16px 40px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12, color: "var(--prv-text-3)", lineHeight: 1.5, padding: "0 2px" }}>
        Add a reason. It is recorded on the PO and in the audit log.
      </div>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason for rejection…"
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          padding: 12,
          color: "rgba(255,255,255,0.92)",
          fontSize: 13.5,
          fontFamily: "inherit",
          lineHeight: 1.5,
          resize: "vertical",
          minHeight: 80,
        }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          disabled={pending}
          onClick={() => onSubmit(reason.trim())}
          style={{
            padding: "10px 18px",
            background: "rgba(255,69,58,0.92)",
            border: 0,
            borderRadius: 10,
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: pending ? "default" : "pointer",
          }}
        >
          Confirm rejection
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "10px 18px",
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            color: "rgba(255,255,255,0.75)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export function PurchaseOrderDetailClient({ id }: PurchaseOrderDetailClientProps) {
  const { data: orderData, isError } = usePurchaseOrderDetail(id)
  const order = orderData?.order ?? null
  const error = isError
  const [now] = useState(() => Date.now())
  const { openSheet } = useSheetStack()
  const queryClient = useQueryClient()

  const poMutation = useMutation({
    mutationFn: (payload: { action: string; notes?: string }) =>
      fetch(`/api/procurement/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Action failed")
        return r.json()
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["purchase-order-detail", id] })
      void queryClient.invalidateQueries({ queryKey: ["procurement"] })
    },
  })

  const openReject = () => {
    openSheet({
      snapPoints: ["mid"],
      defaultSnap: "mid",
      title: "Reject Purchase Order",
      render: (onClose) => (
        <RejectReasonSheet
          pending={poMutation.isPending}
          onCancel={onClose}
          onSubmit={(reason) => {
            poMutation.mutate({ action: "reject", notes: reason || undefined })
            onClose()
          }}
        />
      ),
    })
  }

  const handleFAB = () => {
    if (!order) return
    const isPending = order.status === "Pending"
    const isDraft = order.status === "Draft"
    const canReceive = order.status === "Approved" || order.status === "In Transit"
    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: "Order Actions",
      render: (onClose) => (
        <div
          style={{ padding: "8px 16px 40px", display: "flex", flexDirection: "column", gap: 10 }}
        >
          {isPending && (
            <SheetBtn
              color="green"
              icon={
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(48,209,88,.9)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              }
              label="Approve Comanda"
              sub="Trimite spre procesare"
              onClick={() => {
                poMutation.mutate({ action: "approve" })
                onClose()
              }}
            />
          )}
          {isPending && (
            <SheetBtn
              color="red"
              icon={
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,69,58,.9)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              }
              label="Reject"
              sub="Request changes or cancel"
              onClick={() => {
                onClose()
                openReject()
              }}
            />
          )}
          {isDraft && (
            <SheetBtn
              color="white"
              icon={
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,255,255,.9)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              }
              label="Submit for approval"
              sub="Trimite comanda spre aprobare"
              onClick={() => {
                poMutation.mutate({ action: "submit" })
                onClose()
              }}
            />
          )}
          {canReceive && (
            <SheetBtn
              color="amber"
              icon={
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,159,10,.9)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              }
              label="Mark received"
              sub="Confirmă recepția mărfii"
              onClick={() => {
                poMutation.mutate({ action: "mark_received" })
                onClose()
              }}
            />
          )}
          <SheetBtn
            color="blue"
            icon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(10,132,255,.9)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            }
            label="New Order"
            sub="Create a new purchase order"
            onClick={onClose}
          />
          <SheetBtn
            color="white"
            icon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,.7)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            }
            label="Duplicate PO"
            sub="Reuse items and supplier"
            onClick={onClose}
          />
          <SheetBtn
            color="white"
            icon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,.7)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            }
            label="Edit"
            sub="Edit items or details"
            onClick={onClose}
          />
        </div>
      ),
    })
  }

  if (error)
    return (
      <div style={{ padding: "80px 16px", textAlign: "center" }}>
        <p style={{ color: "var(--prv-text-3)", fontSize: 14 }}>PO not found.</p>
        <Link
          href="/procurement"
          style={{ fontSize: 14, color: "#7eb8ff", marginTop: 12, display: "block" }}
        >
          ← Back la Procurement
        </Link>
      </div>
    )

  if (!order)
    return (
      <div
        style={{
          padding: "32px 16px 120px",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 24,
            color: "var(--prv-text-2)",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          <IconChevronLeft />
          Procurement
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 18,
              padding: 16,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Skeleton w="50%" h={24} />
              <Skeleton w="35%" h={16} />
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <Skeleton w={100} h={26} radius={8} />
                <Skeleton w={100} h={26} radius={8} />
              </div>
            </div>
          </div>
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 18,
              height: 80,
            }}
          />
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 18,
              height: 180,
            }}
          />
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 18,
              height: 200,
            }}
          />
        </div>
      </div>
    )

  const sc = STATUS_CONFIG[order.status] ?? {
    label: order.status,
    color: "var(--prv-text-3)",
    bg: "var(--prv-border-subtle)",
  }
  const isPending = order.status === "Pending"
  const isDraft = order.status === "Draft"
  const canReceive = order.status === "Approved" || order.status === "In Transit"
  const itemsTotal = order.items.reduce((s, item) => s + item.price, 0)
  const neededByDate = order.neededBy ? new Date(order.neededBy) : null
  const isUrgent =
    isPending && neededByDate !== null && neededByDate.getTime() - now < 3 * 86_400_000

  return (
    <div
      style={{
        padding: "32px 16px 140px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Back */}
      <Link
        href="/procurement"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "var(--prv-text-2)",
          fontSize: 14,
          fontWeight: 500,
          textDecoration: "none",
          marginBottom: 20,
        }}
      >
        <IconChevronLeft />
        Procurement
      </Link>

      {/* Hero card */}
      <div
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 20,
          position: "relative",
          overflow: "hidden",
          marginBottom: 14,
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
        <div style={{ padding: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--prv-text-1)",
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {order.ref}
              </h1>
              <p style={{ fontSize: 14, color: "var(--prv-text-2)", margin: "3px 0 0" }}>
                {order.description}
              </p>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: 6,
                background: sc.bg,
                color: sc.color,
                flexShrink: 0,
              }}
            >
              {sc.label}
            </span>
          </div>

          {/* Meta pills */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {order.neededBy && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 10px",
                  borderRadius: 8,
                  background: isUrgent ? "rgba(255,159,10,.08)" : "var(--prv-g1)",
                  border: `1px solid ${isUrgent ? "rgba(255,159,10,.2)" : "var(--prv-border-subtle)"}`,
                  fontSize: 12,
                  fontWeight: 500,
                  color: isUrgent ? "rgba(255,159,10,.9)" : "var(--prv-text-2)",
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {formatNeededBy(order.neededBy)}
              </div>
            )}
            {order.delivery && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 10px",
                  borderRadius: 8,
                  background: "var(--prv-g1)",
                  border: "1px solid var(--prv-border-subtle)",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--prv-text-2)",
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {order.delivery}
              </div>
            )}
            {order.paymentTerms && (
              <div
                style={{
                  padding: "5px 10px",
                  borderRadius: 8,
                  background: "var(--prv-g1)",
                  border: "1px solid var(--prv-border-subtle)",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--prv-text-2)",
                }}
              >
                {order.paymentTerms}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Supplier card */}
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--prv-text-3)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          margin: "0 2px 10px",
        }}
      >
        Furnizor
      </p>
      <div
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 18,
          position: "relative",
          overflow: "hidden",
          marginBottom: 14,
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
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "var(--prv-g2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--prv-text-2)",
              flexShrink: 0,
            }}
          >
            {order.supplier.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--prv-text-1)", margin: 0 }}>
              {order.supplier}
            </p>
            <p style={{ fontSize: 12, color: "var(--prv-text-3)", margin: "2px 0 0" }}>
              Furnizor · comenzi active
            </p>
            {order.supplierId && (
              <Link
                href={`/suppliers/${order.supplierId}`}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#7eb8ff",
                  textDecoration: "none",
                  display: "block",
                  marginTop: 6,
                }}
              >
                → Profil furnizor
              </Link>
            )}
          </div>
          <div style={{ color: "var(--prv-text-3)", flexShrink: 0 }}>
            <IconChevronRight />
          </div>
        </div>
      </div>

      {/* Details */}
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--prv-text-3)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          margin: "0 2px 10px",
        }}
      >
        Detalii
      </p>
      <div
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 18,
          position: "relative",
          overflow: "hidden",
          marginBottom: 14,
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
        {[
          { label: "Solicitat de", val: order.requestedBy ?? "—" },
          { label: "Proiect", val: order.project ?? "—" },
          { label: "Livrare la", val: order.delivery ?? "—" },
          {
            label: "Needed by",
            val: order.neededBy ? formatNeededBy(order.neededBy) : "—",
            urgent: isUrgent,
          },
          { label: "Payment terms", val: order.paymentTerms ?? "—" },
        ].map((row, i, arr) => (
          <div
            key={row.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "11px 16px",
              borderBottom: i < arr.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
            }}
          >
            <span style={{ fontSize: 13, color: "var(--prv-text-2)" }}>{row.label}</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: row.urgent ? "rgba(255,159,10,.9)" : "var(--prv-text-1)",
              }}
            >
              {row.val}
            </span>
          </div>
        ))}
      </div>

      {/* Line items */}
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--prv-text-3)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          margin: "0 2px 10px",
        }}
      >
        Articole ({order.items.length})
      </p>
      <div
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 18,
          position: "relative",
          overflow: "hidden",
          marginBottom: isPending ? 8 : 14,
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
        {order.items.map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "11px 16px",
              borderBottom: "1px solid var(--prv-border-subtle)",
            }}
          >
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--prv-text-1)", margin: 0 }}>
                {item.name}
              </p>
              <p style={{ fontSize: 11, color: "var(--prv-text-3)", margin: "2px 0 0" }}>
                {item.ref}
              </p>
            </div>
            <p
              style={{
                fontSize: 12,
                color: "var(--prv-text-3)",
                width: 52,
                textAlign: "center",
                margin: 0,
              }}
            >
              {item.qty}
            </p>
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--prv-text-1)",
                width: 64,
                textAlign: "right",
                margin: 0,
              }}
            >
              €{item.price.toLocaleString()}
            </p>
          </div>
        ))}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            background: "rgba(255,255,255,.04)",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--prv-text-1)" }}>Total</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--prv-text-1)" }}>
            €{itemsTotal.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Lifecycle CTAs — status-appropriate */}
      {isPending && (
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <button
            onClick={openReject}
            disabled={poMutation.isPending}
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 14,
              background: "rgba(255,69,58,.15)",
              border: "1px solid rgba(255,69,58,.25)",
              color: "rgba(255,69,58,.95)",
              fontSize: 14,
              fontWeight: 700,
              cursor: poMutation.isPending ? "default" : "pointer",
            }}
          >
            Reject
          </button>
          <button
            onClick={() => poMutation.mutate({ action: "approve" })}
            disabled={poMutation.isPending}
            style={{
              flex: 2,
              padding: 14,
              borderRadius: 14,
              background: "rgba(48,209,88,.85)",
              border: "none",
              color: "#000",
              fontSize: 14,
              fontWeight: 700,
              cursor: poMutation.isPending ? "default" : "pointer",
            }}
          >
            {poMutation.isPending ? "Se procesează…" : "Approve Comanda"}
          </button>
        </div>
      )}
      {isDraft && (
        <button
          onClick={() => poMutation.mutate({ action: "submit" })}
          disabled={poMutation.isPending}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 14,
            background: "#fff",
            border: "none",
            color: "#000",
            fontSize: 14,
            fontWeight: 700,
            cursor: poMutation.isPending ? "default" : "pointer",
            marginBottom: 14,
          }}
        >
          {poMutation.isPending ? "Se procesează…" : "Submit for approval"}
        </button>
      )}
      {canReceive && (
        <button
          onClick={() => poMutation.mutate({ action: "mark_received" })}
          disabled={poMutation.isPending}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 14,
            background: "rgba(255,159,10,.9)",
            border: "none",
            color: "#000",
            fontSize: 14,
            fontWeight: 700,
            cursor: poMutation.isPending ? "default" : "pointer",
            marginBottom: 14,
          }}
        >
          {poMutation.isPending ? "Se procesează…" : "Mark received"}
        </button>
      )}

      {/* Activity */}
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--prv-text-3)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          margin: "0 2px 10px",
        }}
      >
        Activitate
      </p>
      <div
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 18,
          position: "relative",
          overflow: "hidden",
          marginBottom: 14,
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
        {order.activities.map((act, i) => {
          const dot = ACTIVITY_DOT[act.type as POActivityType] ?? "rgba(255,255,255,.35)"
          return (
            <div
              key={act.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "12px 16px",
                borderBottom:
                  i < order.activities.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: dot,
                  marginTop: 4,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, color: "var(--prv-text-1)", margin: 0 }}>{act.text}</p>
                <p style={{ fontSize: 11, color: "var(--prv-text-3)", margin: "3px 0 0" }}>
                  {getRelativeTime(act.timestamp)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* FAB */}
      <button
        onClick={handleFAB}
        style={{
          position: "fixed",
          bottom: 100,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: 26,
          background: "rgba(255,255,255,.12)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(0,0,0,.5)",
          color: "rgba(255,255,255,.9)",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
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
