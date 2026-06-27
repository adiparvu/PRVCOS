"use client"

import { useApprovalDetail } from "@/lib/api-hooks"
import Link from "next/link"
import { useSheetStack } from "@prv/ui"
import type { ApprovalDetail, ChainStepStatus } from "@/app/api/approvals/[id]/route"
import type { ApprovalType } from "@/app/api/approvals/route"

interface ApprovalDetailClientProps {
  id: string
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

const TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; iconBg: string; iconStroke: string }
> = {
  purchase: {
    label: "Purchase Order",
    color: "rgba(10,132,255,.9)",
    bg: "rgba(10,132,255,.13)",
    iconBg: "rgba(10,132,255,.10)",
    iconStroke: "rgba(10,132,255,.85)",
  },
  leave: {
    label: "Leave Request",
    color: "rgba(255,159,10,.95)",
    bg: "rgba(255,159,10,.13)",
    iconBg: "rgba(255,159,10,.10)",
    iconStroke: "rgba(255,159,10,.85)",
  },
  expense: {
    label: "Expense Request",
    color: "rgba(255,69,58,.95)",
    bg: "rgba(255,69,58,.12)",
    iconBg: "rgba(255,69,58,.10)",
    iconStroke: "rgba(255,69,58,.85)",
  },
  contract: {
    label: "Contract",
    color: "rgba(191,90,242,.9)",
    bg: "rgba(191,90,242,.12)",
    iconBg: "rgba(191,90,242,.10)",
    iconStroke: "rgba(191,90,242,.85)",
  },
  overtime: {
    label: "Overtime",
    color: "rgba(255,159,10,.95)",
    bg: "rgba(255,159,10,.13)",
    iconBg: "rgba(255,159,10,.10)",
    iconStroke: "rgba(255,159,10,.85)",
  },
}

const CHAIN_CONFIG: Record<
  ChainStepStatus,
  { dotBg: string; dotColor: string; pillBg: string; pillColor: string; label: string }
> = {
  done: {
    dotBg: "rgba(48,209,88,.15)",
    dotColor: "rgba(48,209,88,.9)",
    pillBg: "rgba(48,209,88,.13)",
    pillColor: "rgba(48,209,88,.95)",
    label: "Approved",
  },
  current: {
    dotBg: "rgba(255,159,10,.15)",
    dotColor: "rgba(255,159,10,.9)",
    pillBg: "rgba(255,159,10,.13)",
    pillColor: "rgba(255,159,10,.95)",
    label: "Required",
  },
  pending: {
    dotBg: "rgba(255,255,255,.06)",
    dotColor: "rgba(255,255,255,.35)",
    pillBg: "rgba(255,255,255,.07)",
    pillColor: "rgba(255,255,255,.35)",
    label: "Upcoming",
  },
}

// ── Sheet button helper ───────────────────────────────────────────────────────

type SheetColor = "amber" | "blue" | "green" | "red" | "white"

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
    amber: { background: "rgba(255,159,10,.10)", border: "1px solid rgba(255,159,10,.2)" },
    blue: { background: "rgba(10,132,255,.15)", border: "1px solid rgba(10,132,255,.25)" },
    green: { background: "rgba(48,209,88,.10)", border: "1px solid rgba(48,209,88,.2)" },
    red: { background: "rgba(255,69,58,.10)", border: "1px solid rgba(255,69,58,.2)" },
    white: { background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.09)" },
  }
  const labelColor: Record<SheetColor, string> = {
    amber: "rgba(255,159,10,.95)",
    blue: "rgba(10,132,255,.9)",
    green: "rgba(48,209,88,.95)",
    red: "rgba(255,69,58,.95)",
    white: "var(--prv-text-1)",
  }
  const iconBg: Record<SheetColor, string> = {
    amber: "rgba(255,159,10,.18)",
    blue: "rgba(10,132,255,.2)",
    green: "rgba(48,209,88,.18)",
    red: "rgba(255,69,58,.15)",
    white: "rgba(255,255,255,.08)",
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

// ── Type icon ─────────────────────────────────────────────────────────────────

function TypeIcon({ type }: { type: ApprovalType }) {
  const tc = TYPE_CONFIG[type] ?? {
    iconBg: "rgba(255,255,255,.06)",
    iconStroke: "rgba(255,255,255,.45)",
  }
  const path =
    type === "purchase" ? (
      <>
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </>
    ) : type === "leave" ? (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>
    ) : type === "expense" ? (
      <>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </>
    ) : type === "contract" ? (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </>
    ) : (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    )

  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 11,
        background: tc.iconBg,
        border: "1px solid var(--prv-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke={tc.iconStroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {path}
      </svg>
    </div>
  )
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
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

// ── Main component ────────────────────────────────────────────────────────────

export function ApprovalDetailClient({ id }: ApprovalDetailClientProps) {
  const { data: approvalData, isError } = useApprovalDetail(id)
  const approval = approvalData?.approval ?? null
  const error = isError
  const { openSheet } = useSheetStack()

  const handleFAB = () => {
    if (!approval) return
    const isPending =
      approval.status === "Pending" || approval.status === "Urgent" || approval.status === "Expired"

    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: "Approval Actions",
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
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              }
              label="Approve"
              sub="Send to next level"
              onClick={onClose}
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
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              }
              label="Reject"
              sub="Return with reason"
              onClick={onClose}
            />
          )}
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
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
            label="Delegate"
            sub="Transfer to another approver"
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
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            }
            label="Request Info"
            sub="Send question to requester"
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
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
            label="Postpone"
            sub="Reschedule deadline"
            onClick={onClose}
          />
        </div>
      ),
    })
  }

  if (error)
    return (
      <div style={{ padding: "80px 16px", textAlign: "center" }}>
        <p style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Request not found.</p>
        <Link
          href="/approvals"
          style={{ fontSize: 14, color: "#7eb8ff", marginTop: 12, display: "block" }}
        >
          ← Back to Approvals
        </Link>
      </div>
    )

  if (!approval)
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
          Approvals
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
              <Skeleton w={100} h={11} radius={3} />
              <Skeleton w="70%" h={20} />
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <Skeleton w={70} h={24} radius={8} />
                <Skeleton w={60} h={24} radius={8} />
                <Skeleton w={80} h={24} radius={8} />
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  background: "var(--prv-g1)",
                  border: "1px solid var(--prv-border-subtle)",
                  borderRadius: 14,
                  padding: "11px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <Skeleton w="60%" h={14} />
                <Skeleton w="80%" h={10} radius={3} />
              </div>
            ))}
          </div>
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 18,
              height: 120,
            }}
          />
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 18,
              height: 100,
            }}
          />
        </div>
      </div>
    )

  const tc = TYPE_CONFIG[approval.type] ?? {
    label: approval.type,
    color: "var(--prv-text-3)",
    bg: "var(--prv-border-subtle)",
    iconBg: "rgba(255,255,255,.06)",
    iconStroke: "rgba(255,255,255,.45)",
  }
  const isExpired = approval.status === "Expired"
  const isUrgent = approval.status === "Urgent"
  const isPending = approval.status === "Pending" || isExpired || isUrgent
  const statusColor = isExpired
    ? "rgba(255,69,58,.95)"
    : isUrgent
      ? "rgba(255,159,10,.95)"
      : "rgba(10,132,255,.9)"
  const statusBg = isExpired
    ? "rgba(255,69,58,.12)"
    : isUrgent
      ? "rgba(255,159,10,.13)"
      : "rgba(10,132,255,.13)"
  const statusLabel = isExpired ? "Expirat" : isUrgent ? "Urgent" : "Pending"

  // Build info rows based on type
  const infoRows: { key: string; val: string; valColor?: string }[] = [
    { key: "Solicitat de", val: approval.requestedBy },
  ]
  if (approval.project) infoRows.push({ key: "Proiect", val: approval.project })
  if (approval.supplier) infoRows.push({ key: "Furnizor", val: approval.supplier })
  if (approval.neededBy)
    infoRows.push({
      key: approval.type === "leave" ? "Start date" : "Needed by",
      val: approval.neededBy,
      valColor: isUrgent || isExpired ? "rgba(255,159,10,.9)" : undefined,
    })
  if (approval.delivery) infoRows.push({ key: "Livrare", val: approval.delivery })
  if (approval.paymentTerms) infoRows.push({ key: "Payment", val: approval.paymentTerms })

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
        href="/approvals"
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
        Approvals
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
              gap: 12,
              marginBottom: 11,
            }}
          >
            <TypeIcon type={approval.type} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "var(--prv-text-3)",
                  margin: "0 0 3px",
                }}
              >
                {tc.label} · {approval.ref}
              </p>
              <p
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--prv-text-1)",
                  margin: "0 0 2px",
                }}
              >
                {approval.title}
              </p>
              <p style={{ fontSize: 12, color: "var(--prv-text-2)", margin: 0 }}>
                {approval.description}
              </p>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: 6,
                background: statusBg,
                color: statusColor,
                flexShrink: 0,
              }}
            >
              {statusLabel}
            </span>
          </div>

          {/* Meta pills */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              approval.requestedBy,
              approval.deadline,
              approval.value !== null ? `€${approval.value.toLocaleString()}` : null,
              approval.supplier ?? approval.project,
            ]
              .filter(Boolean)
              .map((tag) => (
                <div
                  key={tag}
                  style={{
                    padding: "4px 9px",
                    borderRadius: 8,
                    background: "var(--prv-g2)",
                    border: "1px solid var(--prv-border-subtle)",
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--prv-text-2)",
                  }}
                >
                  {tag}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        {[
          {
            val: approval.value !== null ? `€${approval.value.toLocaleString()}` : "—",
            label: "Valoare",
          },
          {
            val:
              approval.daysUntilDeadline === null
                ? "—"
                : approval.daysUntilDeadline < 0
                  ? `${Math.abs(approval.daysUntilDeadline)}z exp.`
                  : approval.daysUntilDeadline === 0
                    ? "Azi"
                    : `${approval.daysUntilDeadline} days`,
            label: "La Termen",
            color:
              approval.daysUntilDeadline !== null && approval.daysUntilDeadline <= 0
                ? "rgba(255,69,58,.9)"
                : approval.daysUntilDeadline !== null && approval.daysUntilDeadline <= 2
                  ? "rgba(255,159,10,.9)"
                  : undefined,
          },
          {
            val:
              approval.itemCount !== null ? String(approval.itemCount) : `${approval.chain.length}`,
            label: approval.itemCount !== null ? "Items" : "Approvers",
          },
        ].map((tile) => (
          <div
            key={tile.label}
            style={{
              flex: 1,
              padding: "11px 12px",
              borderRadius: 14,
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
            }}
          >
            <p
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: tile.color ?? "var(--prv-text-1)",
                margin: 0,
              }}
            >
              {tile.val}
            </p>
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--prv-text-3)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: "3px 0 0",
              }}
            >
              {tile.label}
            </p>
          </div>
        ))}
      </div>

      {/* Details */}
      <SectionLabel>Details</SectionLabel>
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
        {infoRows.map((row, i) => (
          <div
            key={row.key}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "11px 16px",
              borderBottom: i < infoRows.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
            }}
          >
            <p style={{ fontSize: 13, color: "var(--prv-text-3)", margin: 0 }}>{row.key}</p>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: row.valColor ?? "var(--prv-text-1)",
                margin: 0,
              }}
            >
              {row.val}
            </p>
          </div>
        ))}
      </div>

      {/* Approval chain */}
      <SectionLabel>Approval Chain</SectionLabel>
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
        {approval.chain.map((step, i) => {
          const cc = CHAIN_CONFIG[step.status] ?? {
            dotBg: "rgba(255,255,255,.06)",
            dotColor: "rgba(255,255,255,.35)",
            pillBg: "rgba(255,255,255,.07)",
            pillColor: "rgba(255,255,255,.35)",
            label: step.status,
          }
          return (
            <div
              key={step.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 16px",
                borderBottom:
                  i < approval.chain.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  background: cc.dotBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {step.status === "done" ? (
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={cc.dotColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : step.status === "current" ? (
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={cc.dotColor}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                ) : (
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={cc.dotColor}
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--prv-text-1)", margin: 0 }}>
                  {step.name}
                </p>
                <p style={{ fontSize: 11, color: "var(--prv-text-3)", margin: "2px 0 0" }}>
                  {step.role}
                </p>
              </div>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  padding: "3px 7px",
                  borderRadius: 5,
                  background: cc.pillBg,
                  color: cc.pillColor,
                  flexShrink: 0,
                }}
              >
                {cc.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Inline CTAs — only for pending/urgent/expired */}
      {isPending && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button
            style={{
              flex: 1,
              padding: "13px",
              borderRadius: 14,
              background: "rgba(255,69,58,.10)",
              border: "1px solid rgba(255,69,58,.2)",
              color: "rgba(255,69,58,.95)",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reject
          </button>
          <button
            style={{
              flex: 2,
              padding: "13px",
              borderRadius: 14,
              background: "rgba(48,209,88,.15)",
              border: "1px solid rgba(48,209,88,.25)",
              color: "rgba(48,209,88,.95)",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Approve
          </button>
        </div>
      )}

      {/* Activity */}
      <SectionLabel>Activitate</SectionLabel>
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
        {approval.activity.map((entry, i) => (
          <div
            key={entry.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "10px 16px",
              borderBottom:
                i < approval.activity.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: entry.isSystem ? "rgba(10,132,255,.10)" : "rgba(255,255,255,.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                fontWeight: 800,
                color: entry.isSystem ? "rgba(10,132,255,.7)" : "var(--prv-text-2)",
                flexShrink: 0,
                letterSpacing: "0.02em",
              }}
            >
              {entry.authorInitials}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--prv-text-1)", margin: 0 }}>
                {entry.authorName}
              </p>
              <p style={{ fontSize: 12, color: "var(--prv-text-2)", margin: "3px 0 2px" }}>
                {entry.text}
              </p>
              <p style={{ fontSize: 10, color: "var(--prv-text-3)", margin: 0 }}>
                {entry.timestamp}
              </p>
            </div>
          </div>
        ))}
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
