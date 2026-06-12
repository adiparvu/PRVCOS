"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import type { ExpenseDetail, ApprovalStep } from "@/app/api/finance/expenses/[id]/route"

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

function IconCheck() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function IconLock() {
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
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function IconThreeDots() {
  return (
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
      <circle cx="12" cy="5" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="19" r="1" fill="currentColor" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function IconBuilding() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function IconReceipt() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

function IconX() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function IconForward() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="15 17 20 12 15 7" />
      <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
    </svg>
  )
}

function IconArchive() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  )
}

function CategoryIcon({ category }: { category: string }) {
  switch (category) {
    case "materiale":
      return (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      )
    case "personal":
      return (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case "logistica":
      return (
        <svg
          width="22"
          height="22"
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
    case "marketing":
      return (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      )
    case "utilitati":
      return (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      )
    default:
      return (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )
  }
}

// ── Approval Step ─────────────────────────────────────────────────────────────

function ApprovalStepRow({
  step,
  isLast,
  onApprove,
  onReject,
}: {
  step: ApprovalStep & { localStatus?: "approved" | "pending" | "locked" | "rejected" }
  isLast: boolean
  onApprove?: () => void
  onReject?: () => void
}) {
  const status = step.localStatus ?? step.status

  const dotColor =
    status === "approved"
      ? "rgba(48,209,88,.95)"
      : status === "rejected"
        ? "rgba(255,69,58,.95)"
        : status === "pending"
          ? "rgba(255,159,10,.95)"
          : "rgba(255,255,255,.2)"

  const dotIcon =
    status === "approved" ? (
      <IconCheck />
    ) : status === "rejected" ? (
      <IconX />
    ) : status === "pending" ? (
      <IconClock />
    ) : (
      <IconLock />
    )

  return (
    <div style={{ display: "flex", gap: 14 }}>
      {/* Timeline */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flexShrink: 0,
          width: 32,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: status === "locked" ? "rgba(255,255,255,.06)" : `${dotColor}18`,
            border: `1.5px solid ${dotColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: dotColor,
          }}
        >
          {dotIcon}
        </div>
        {!isLast && (
          <div
            style={{
              width: 1,
              flex: 1,
              minHeight: 28,
              marginTop: 4,
              marginBottom: 4,
              background: "rgba(255,255,255,.1)",
            }}
          />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "rgba(255,255,255,.1)",
              border: "1px solid rgba(255,255,255,.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              fontWeight: 700,
              color: "rgba(255,255,255,.6)",
              letterSpacing: "0.03em",
            }}
          >
            {step.avatar}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,.88)" }}>
              {step.name}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>{step.role}</div>
          </div>
          {status === "approved" && step.approvedAt && (
            <div style={{ marginLeft: "auto", fontSize: 11, color: "rgba(48,209,88,.7)" }}>
              {step.approvedAt}
            </div>
          )}
          {status === "rejected" && (
            <div style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,69,58,.7)" }}>
              Respins
            </div>
          )}
        </div>

        {/* Approved note */}
        {status === "approved" && step.note && (
          <div
            style={{
              marginTop: 6,
              padding: "8px 10px",
              background: "rgba(48,209,88,.07)",
              border: "1px solid rgba(48,209,88,.15)",
              borderRadius: 10,
              fontSize: 12,
              color: "rgba(255,255,255,.55)",
              fontStyle: "italic",
            }}
          >
            "{step.note}"
          </div>
        )}

        {/* Pending action buttons */}
        {status === "pending" && onApprove && onReject && (
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              onClick={onApprove}
              style={{
                flex: 1,
                padding: "10px",
                background: "rgba(48,209,88,.15)",
                border: "1px solid rgba(48,209,88,.3)",
                borderRadius: 12,
                color: "rgba(48,209,88,.95)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <IconCheck />
              Approve
            </button>
            <button
              onClick={onReject}
              style={{
                flex: 1,
                padding: "10px",
                background: "rgba(255,69,58,.12)",
                border: "1px solid rgba(255,69,58,.25)",
                borderRadius: 12,
                color: "rgba(255,69,58,.9)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <IconX />
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── FAB Sheet Item ────────────────────────────────────────────────────────────

function SheetAction({
  label,
  icon,
  color,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  color: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        width: "100%",
        padding: "14px 16px",
        background: "none",
        border: "none",
        cursor: "pointer",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `${color}20`,
          border: `1px solid ${color}40`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <span style={{ fontSize: 15, color: "rgba(255,255,255,.9)", fontWeight: 500 }}>{label}</span>
    </button>
  )
}

// ── Section Card ──────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "rgba(255,255,255,.55)",
          marginBottom: 10,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </div>
      <div
        style={{
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)",
          }}
        />
        {children}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ExpenseDetailClient({ id }: { id: string }) {
  const [detail, setDetail] = useState<ExpenseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [fabOpen, setFabOpen] = useState(false)
  const [stepStatuses, setStepStatuses] = useState<
    Record<string, "approved" | "pending" | "locked" | "rejected">
  >({})

  useEffect(() => {
    fetch(`/api/finance/expenses/${id}`)
      .then((r) => r.json())
      .then((data: ExpenseDetail) => {
        setDetail(data)
        const initial: Record<string, "approved" | "pending" | "locked" | "rejected"> = {}
        data.approvalSteps.forEach((s) => {
          initial[s.id] = s.status
        })
        setStepStatuses(initial)
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleApprove = (stepId: string) => {
    setStepStatuses((prev) => {
      const next = { ...prev, [stepId]: "approved" as const }
      if (detail) {
        const stepIndex = detail.approvalSteps.findIndex((s) => s.id === stepId)
        const nextStep = detail.approvalSteps[stepIndex + 1]
        if (nextStep && next[nextStep.id] === "locked") {
          next[nextStep.id] = "pending"
        }
      }
      return next
    })
  }

  const handleReject = (stepId: string) => {
    setStepStatuses((prev) => ({ ...prev, [stepId]: "rejected" as const }))
  }

  const amberColor = "rgba(255,159,10,.95)"

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "2px solid rgba(255,255,255,.1)",
            borderTopColor: amberColor,
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!detail) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontSize: 15, color: "rgba(255,255,255,.4)" }}>Expense not found.</div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif',
        paddingBottom: 120,
      }}
    >
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>

      {/* Back nav */}
      <div
        style={{
          padding: "56px 20px 0",
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 24,
        }}
      >
        <Link
          href="/finance"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: amberColor,
            textDecoration: "none",
            fontSize: 15,
            fontWeight: 500,
          }}
        >
          <IconChevronLeft />
          Finance
        </Link>
      </div>

      {/* Header */}
      <div style={{ padding: "0 20px", marginBottom: 28, textAlign: "center" }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 22,
            background: `${amberColor}18`,
            border: `1.5px solid ${amberColor}40`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: amberColor,
            margin: "0 auto 14px",
          }}
        >
          <CategoryIcon category={detail.category} />
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "rgba(255,255,255,.95)",
            marginBottom: 4,
          }}
        >
          {detail.title}
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>
          {detail.vendorName} · {detail.date}
        </div>
      </div>

      <div style={{ padding: "0 20px" }}>
        {/* Amount Card */}
        <SectionCard title="Expense Value">
          <div
            style={{
              padding: "20px",
              background: "rgba(255,69,58,.06)",
            }}
          >
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: "-0.04em",
                color: "rgba(255,69,58,.95)",
                marginBottom: 16,
              }}
            >
              −{detail.amountLabel}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: 12,
                borderTop: "1px solid rgba(255,255,255,.07)",
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginBottom: 2 }}>
                  Tax base
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,.8)" }}>
                  {detail.baseAmountLabel}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginBottom: 2 }}>
                  TVA {detail.vatPct}%
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,159,10,.8)" }}>
                  {detail.vatLabel}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginBottom: 2 }}>
                  Scadent
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,.7)" }}>
                  {detail.dueDate}
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Vendor Card */}
        <SectionCard title="Furnizor">
          <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "rgba(255,255,255,.07)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,.5)",
                flexShrink: 0,
              }}
            >
              <IconBuilding />
            </div>
            <div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "rgba(255,255,255,.9)",
                  marginBottom: 3,
                }}
              >
                {detail.vendorName}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 1 }}>
                {detail.vendorCui}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>
                {detail.vendorAddress}
              </div>
            </div>
          </div>
          {detail.description && (
            <div
              style={{
                padding: "12px 18px",
                borderTop: "1px solid rgba(255,255,255,.06)",
                fontSize: 13,
                color: "rgba(255,255,255,.45)",
                lineHeight: 1.5,
              }}
            >
              {detail.description}
            </div>
          )}
        </SectionCard>

        {/* Line Items */}
        {detail.lineItems.length > 0 && (
          <SectionCard title="Order Details">
            {detail.lineItems.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  padding: "12px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  borderBottom:
                    idx < detail.lineItems.length - 1 ? "1px solid rgba(255,255,255,.05)" : "none",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,.8)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.description}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 2 }}>
                    {item.quantity} × {item.unitPriceLabel}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "rgba(255,255,255,.7)",
                    flexShrink: 0,
                  }}
                >
                  {item.totalLabel}
                </div>
              </div>
            ))}
          </SectionCard>
        )}

        {/* Approval Workflow */}
        <SectionCard title="Flux Approval">
          <div style={{ padding: "18px 18px 10px" }}>
            {detail.approvalSteps.map((step, idx) => (
              <ApprovalStepRow
                key={step.id}
                step={{ ...step, localStatus: stepStatuses[step.id] }}
                isLast={idx === detail.approvalSteps.length - 1}
                onApprove={
                  stepStatuses[step.id] === "pending" ? () => handleApprove(step.id) : undefined
                }
                onReject={
                  stepStatuses[step.id] === "pending" ? () => handleReject(step.id) : undefined
                }
              />
            ))}
          </div>
        </SectionCard>
      </div>

      {/* FAB */}
      <button
        onClick={() => setFabOpen(true)}
        style={{
          position: "fixed",
          bottom: 90,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: 100,
          background: "rgba(255,159,10,0.18)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          border: "1px solid rgba(255,159,10,0.35)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: amberColor,
          cursor: "pointer",
          zIndex: 40,
        }}
      >
        <IconThreeDots />
      </button>

      {/* FAB Sheet */}
      {fabOpen && (
        <>
          <div
            onClick={() => setFabOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              zIndex: 50,
              animation: "fadeIn 0.2s ease",
            }}
          />
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: "rgba(28,28,30,0.95)",
              backdropFilter: "blur(48px)",
              WebkitBackdropFilter: "blur(48px)",
              borderRadius: "28px 28px 0 0",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 -24px 64px rgba(0,0,0,0.7)",
              zIndex: 51,
              paddingBottom: 34,
              animation: "slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                background: "rgba(255,255,255,.2)",
                borderRadius: 100,
                margin: "12px auto 16px",
              }}
            />
            <div
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,.35)",
                textAlign: "center",
                marginBottom: 12,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Expense Actions
            </div>
            <SheetAction
              label="Approve Cheltuiala"
              icon={<IconCheck />}
              color="rgba(48,209,88,.9)"
              onClick={() => setFabOpen(false)}
            />
            <SheetAction
              label="Reject"
              icon={<IconX />}
              color="rgba(255,69,58,.9)"
              onClick={() => setFabOpen(false)}
            />
            <SheetAction
              label="Redirect"
              icon={<IconForward />}
              color="rgba(10,132,255,.9)"
              onClick={() => setFabOpen(false)}
            />
            <SheetAction
              label="Archive"
              icon={<IconArchive />}
              color="rgba(255,255,255,.55)"
              onClick={() => setFabOpen(false)}
            />
            <button
              onClick={() => setFabOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "calc(100% - 32px)",
                margin: "12px 16px 0",
                padding: "14px",
                background: "rgba(255,255,255,.07)",
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: 14,
                color: "rgba(255,255,255,.6)",
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              <IconClose />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
