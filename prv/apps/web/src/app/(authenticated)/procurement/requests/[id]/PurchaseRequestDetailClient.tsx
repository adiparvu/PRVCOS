"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface PRDetail {
  id: string
  ref: string
  itemDescription: string
  category: string
  quantity: number
  unit: string
  estimatedCost: number
  currency: string
  urgency: "standard" | "urgent" | "emergency"
  department: string | null
  justification: string | null
  status: "draft" | "submitted" | "approved" | "rejected" | "converted"
  requestedByName: string
  requestedById: string
  approvedByName: string | null
  createdAt: string
  submittedAt: string | null
  approvedAt: string | null
  rejectedAt: string | null
  purchaseOrderId: string | null
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

function Skeleton({ w, h, radius = 6 }: { w: number | string; h: number; radius?: number }) {
  return (
    <div
      style={{ width: w, height: h, borderRadius: radius, background: "rgba(255,255,255,0.07)" }}
    />
  )
}

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PRDetail["status"], { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "rgba(255,255,255,.55)", bg: "rgba(255,255,255,.06)" },
  submitted: { label: "Submitted", color: "rgba(255,255,255,.90)", bg: "rgba(255,255,255,.12)" },
  approved: { label: "Approved", color: "#000", bg: "rgba(255,255,255,.95)" },
  rejected: { label: "Rejected", color: "rgba(255,255,255,.30)", bg: "rgba(255,255,255,.04)" },
  converted: { label: "Converted", color: "rgba(255,255,255,.55)", bg: "rgba(255,255,255,.06)" },
}

const URGENCY_LABEL: Record<PRDetail["urgency"], string> = {
  standard: "Standard",
  urgent: "Urgent",
  emergency: "Emergency",
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </p>
  )
}

// ── Glass card ────────────────────────────────────────────────────────────────

function GlassCard({ children, mb = 14 }: { children: React.ReactNode; mb?: number }) {
  return (
    <div
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        borderRadius: 18,
        position: "relative",
        overflow: "hidden",
        marginBottom: mb,
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
      {children}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function PurchaseRequestDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const [pr, setPr] = useState<PRDetail | null>(null)
  const [error, setError] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchPR = useCallback(async () => {
    setError(false)
    try {
      const res = await fetch(`/api/procurement/requests/${id}`)
      if (!res.ok) throw new Error()
      const data = (await res.json()) as { request: PRDetail }
      setPr(data.request)
    } catch {
      setError(true)
    }
  }, [id])

  useEffect(() => {
    void fetchPR()
  }, [fetchPR])

  async function doAction(action: string) {
    setActionLoading(action)
    try {
      await fetch(`/api/procurement/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      await fetchPR()
    } finally {
      setActionLoading(null)
    }
  }

  if (error) {
    return (
      <div style={{ padding: "80px 16px", textAlign: "center" }}>
        <p style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Purchase request not found.</p>
        <Link
          href="/procurement/requests"
          style={{ fontSize: 14, color: "var(--prv-text-2)", marginTop: 12, display: "block" }}
        >
          ← Back to Requests
        </Link>
      </div>
    )
  }

  if (!pr) {
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
          Purchase Requests
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[180, 80, 200, 160].map((h, i) => (
            <div
              key={i}
              style={{
                background: "var(--prv-g1)",
                border: "1px solid var(--prv-border-subtle)",
                borderRadius: 18,
                height: h,
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  const sc = STATUS_CONFIG[pr.status]

  // Timeline steps
  const steps = [
    { label: "Created", ts: pr.createdAt, done: true },
    { label: "Submitted", ts: pr.submittedAt, done: !!pr.submittedAt },
    {
      label: "Approved",
      ts: pr.approvedAt ?? pr.rejectedAt,
      done: !!(pr.approvedAt || pr.rejectedAt),
      failed: !!pr.rejectedAt,
    },
  ]

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
        href="/procurement/requests"
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
        Purchase Requests
      </Link>

      {/* Hero */}
      <GlassCard mb={14}>
        <div style={{ padding: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 11,
                  color: "var(--prv-text-3)",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  margin: "0 0 4px",
                }}
              >
                {pr.ref}
              </p>
              <h1
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--prv-text-1)",
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {pr.itemDescription}
              </h1>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 8,
                background: sc.bg,
                color: sc.color,
                flexShrink: 0,
                marginLeft: 10,
              }}
            >
              {sc.label}
            </span>
          </div>
          <p style={{ fontSize: 22, fontWeight: 700, color: "var(--prv-text-1)", margin: 0 }}>
            {pr.estimatedCost.toLocaleString("ro-RO")} {pr.currency}
          </p>
        </div>
      </GlassCard>

      {/* Details */}
      <SectionLabel>Details</SectionLabel>
      <GlassCard mb={14}>
        {[
          { label: "Category", val: pr.category },
          { label: "Quantity", val: `${pr.quantity} ${pr.unit}` },
          { label: "Urgency", val: URGENCY_LABEL[pr.urgency] },
          { label: "Department", val: pr.department ?? "—" },
          { label: "Requested by", val: pr.requestedByName },
          {
            label: "Created",
            val: new Date(pr.createdAt).toLocaleDateString("ro-RO", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          },
          ...(pr.approvedByName ? [{ label: "Approved by", val: pr.approvedByName }] : []),
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
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--prv-text-1)" }}>
              {row.val}
            </span>
          </div>
        ))}
      </GlassCard>

      {/* Justification */}
      {pr.justification && (
        <>
          <SectionLabel>Justification</SectionLabel>
          <GlassCard mb={14}>
            <p
              style={{
                padding: "14px 16px",
                fontSize: 14,
                color: "var(--prv-text-2)",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {pr.justification}
            </p>
          </GlassCard>
        </>
      )}

      {/* Action buttons */}
      {pr.status === "draft" && (
        <>
          <SectionLabel>Actions</SectionLabel>
          <button
            onClick={() => void doAction("submit")}
            disabled={actionLoading === "submit"}
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 100,
              background: "rgba(255,255,255,.95)",
              border: "none",
              color: "#000",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 14,
              opacity: actionLoading === "submit" ? 0.6 : 1,
            }}
          >
            {actionLoading === "submit" ? "Submitting..." : "Submit for Approval"}
          </button>
        </>
      )}

      {pr.status === "submitted" && (
        <>
          <SectionLabel>Actions</SectionLabel>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <button
              onClick={() => void doAction("reject")}
              disabled={!!actionLoading}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 14,
                background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.15)",
                color: "var(--prv-text-2)",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                opacity: actionLoading ? 0.6 : 1,
              }}
            >
              {actionLoading === "reject" ? "..." : "Reject"}
            </button>
            <button
              onClick={() => void doAction("approve")}
              disabled={!!actionLoading}
              style={{
                flex: 2,
                padding: 14,
                borderRadius: 14,
                background: "rgba(255,255,255,.95)",
                border: "none",
                color: "#000",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                opacity: actionLoading ? 0.6 : 1,
              }}
            >
              {actionLoading === "approve" ? "Approving..." : "Approve"}
            </button>
          </div>
        </>
      )}

      {pr.status === "approved" && (
        <>
          <SectionLabel>Actions</SectionLabel>
          <button
            onClick={() => void doAction("convert")}
            disabled={actionLoading === "convert"}
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 100,
              background: "rgba(255,255,255,.95)",
              border: "none",
              color: "#000",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 14,
              opacity: actionLoading === "convert" ? 0.6 : 1,
            }}
          >
            {actionLoading === "convert" ? "Converting..." : "Convert to PO"}
          </button>
        </>
      )}

      {pr.status === "converted" && pr.purchaseOrderId && (
        <>
          <SectionLabel>Purchase Order</SectionLabel>
          <GlassCard mb={14}>
            <Link
              href={`/procurement/${pr.purchaseOrderId}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                textDecoration: "none",
              }}
            >
              <div>
                <p style={{ fontSize: 13, color: "var(--prv-text-2)", margin: 0 }}>
                  View Purchase Order
                </p>
                <p style={{ fontSize: 11, color: "var(--prv-text-3)", margin: "2px 0 0" }}>
                  {pr.purchaseOrderId}
                </p>
              </div>
              <span style={{ fontSize: 13, color: "var(--prv-text-2)" }}>→</span>
            </Link>
          </GlassCard>
        </>
      )}

      {/* Timeline */}
      <SectionLabel>Timeline</SectionLabel>
      <GlassCard mb={0}>
        {steps.map((step, i) => (
          <div
            key={step.label}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "12px 16px",
              borderBottom: i < steps.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
              opacity: step.done ? 1 : 0.35,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: step.failed
                  ? "rgba(255,69,58,.85)"
                  : step.done
                    ? "rgba(255,255,255,.75)"
                    : "rgba(255,255,255,.20)",
                marginTop: 4,
                flexShrink: 0,
              }}
            />
            <div>
              <p style={{ fontSize: 13, color: "var(--prv-text-1)", margin: 0, fontWeight: 600 }}>
                {step.label}
              </p>
              {step.ts && (
                <p style={{ fontSize: 11, color: "var(--prv-text-3)", margin: "2px 0 0" }}>
                  {new Date(step.ts).toLocaleDateString("ro-RO", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>
        ))}
      </GlassCard>
    </div>
  )
}
