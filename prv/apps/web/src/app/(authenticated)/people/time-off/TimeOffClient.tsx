"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSheetStack } from "@prv/ui"
import type { TimeOffRequest } from "@/app/api/people/time-off/route"
import { useTimeOffRequests } from "@/lib/api-hooks"

interface TimeOffClientProps {
  role: string
}

const TYPE_COLORS: Record<string, string> = {
  annual: "rgba(255,255,255,0.15)",
  sick: "rgba(255,255,255,0.10)",
  personal: "rgba(255,255,255,0.10)",
  maternity: "rgba(255,255,255,0.10)",
  paternity: "rgba(255,255,255,0.10)",
  unpaid: "rgba(255,255,255,0.07)",
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

function getRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function TimeOffClient({ role: _role }: TimeOffClientProps) {
  const router = useRouter()
  const { openSheet } = useSheetStack()
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useTimeOffRequests("pending")
  const apiRequests = data?.requests ?? []
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const requests = apiRequests.filter((r) => !dismissed.has(r.id))

  const handleAction = useCallback(
    (req: TimeOffRequest, defaultAction: "approve" | "decline") => {
      openSheet({
        snapPoints: ["mid", "full"],
        defaultSnap: "mid",
        title: `${req.employeeName.split(" ")[0]}'s Request`,
        render: (onClose) => (
          <TimeOffSheetContent
            req={req}
            defaultAction={defaultAction}
            onConfirm={(action, reason) => {
              setDismissed((prev) => new Set([...prev, req.id]))
              onClose()
              fetch(`/api/people/time-off/${req.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, reason }),
              }).catch(() => {
                setDismissed((prev) => {
                  const next = new Set(prev)
                  next.delete(req.id)
                  return next
                })
              })
            }}
            onClose={onClose}
          />
        ),
      })
    },
    [openSheet]
  )

  if (isLoading) {
    return (
      <div style={{ padding: "24px 20px" }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: 160,
              borderRadius: 20,
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              marginBottom: 12,
              animation: "pulse 1.8s ease-in-out infinite",
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ padding: "20px 20px 12px" }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "var(--prv-text-1)",
            margin: 0,
            letterSpacing: -0.5,
          }}
        >
          Time-Off
        </h1>
        {requests.length > 0 ? (
          <p style={{ fontSize: 14, color: "var(--prv-text-3)", margin: "4px 0 0" }}>
            {requests.length} pending approval{requests.length !== 1 ? "s" : ""}
          </p>
        ) : (
          <p style={{ fontSize: 14, color: "var(--prv-text-3)", margin: "4px 0 0" }}>
            All caught up
          </p>
        )}
      </div>

      {requests.length === 0 ? (
        <div
          style={{
            margin: "16px 20px",
            padding: "40px 20px",
            borderRadius: 20,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: "var(--prv-g2)",
              border: "1px solid var(--prv-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              style={{ color: "var(--prv-text-3)" }}
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <p
            style={{ fontSize: 16, fontWeight: 600, color: "var(--prv-text-1)", margin: "0 0 4px" }}
          >
            No pending requests
          </p>
          <p style={{ fontSize: 13, color: "var(--prv-text-3)", margin: 0 }}>
            All time-off requests have been reviewed.
          </p>
        </div>
      ) : (
        <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {requests.map((req) => (
            <RequestCard
              key={req.id}
              req={req}
              onApprove={() => handleAction(req, "approve")}
              onDecline={() => handleAction(req, "decline")}
              onViewDetail={() => router.push(`/people/time-off/${req.id}`)}
            />
          ))}
          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              style={{
                width: "100%",
                padding: "12px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                color: "rgba(255,255,255,0.65)",
                fontSize: 13,
                fontWeight: 500,
                cursor: isFetchingNextPage ? "default" : "pointer",
              }}
            >
              {isFetchingNextPage ? "Se încarcă..." : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function RequestCard({
  req,
  onApprove,
  onDecline,
  onViewDetail,
}: {
  req: TimeOffRequest
  onApprove: () => void
  onDecline: () => void
  onViewDetail: () => void
}) {
  const period = req.endDate
    ? `${formatDateShort(req.startDate)} – ${formatDateShort(req.endDate)}`
    : formatDateShort(req.startDate)

  return (
    <div
      style={{
        borderRadius: 20,
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "16px 16px 14px" }}>
        {/* Header: avatar + name + submitted */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: "var(--prv-g3)",
              border: "1px solid var(--prv-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: 14,
              fontWeight: 700,
              color: "var(--prv-text-1)",
              letterSpacing: 0.5,
            }}
          >
            {req.employeeInitials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p
                onClick={onViewDetail}
                style={{ fontSize: 15, fontWeight: 600, color: "var(--prv-text-1)", margin: 0, cursor: "pointer" }}
              >
                {req.employeeName}
              </p>
              <span style={{ fontSize: 12, color: "var(--prv-text-4)" }}>
                {getRelativeTime(req.submittedAt)}
              </span>
            </div>
            <p style={{ fontSize: 12, color: "var(--prv-text-3)", margin: "2px 0 6px" }}>
              {req.employeeRole} · {req.employeeLocation}
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "3px 9px",
                  borderRadius: 100,
                  background: TYPE_COLORS[req.type] ?? "var(--prv-g2)",
                  border: "1px solid var(--prv-border-subtle)",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--prv-text-2)",
                  letterSpacing: 0.3,
                }}
              >
                {req.typeLabel}
              </span>
              {req.hasCertificate && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 9px",
                    borderRadius: 100,
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid var(--prv-border-subtle)",
                    fontSize: 11,
                    color: "var(--prv-text-3)",
                  }}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  Certificate
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
            marginBottom: 14,
          }}
        >
          {[
            { label: "Period", value: period },
            { label: "Duration", value: `${req.workingDays}d` },
            { label: "Balance", value: `${req.leaveBalance}d left` },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                borderRadius: 12,
                background: "var(--prv-g2)",
                border: "1px solid var(--prv-border-subtle)",
                padding: "8px 10px",
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  color: "var(--prv-text-4)",
                  margin: "0 0 2px",
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  fontWeight: 600,
                }}
              >
                {label}
              </p>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--prv-text-1)", margin: 0 }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Note */}
        {req.note && (
          <p
            style={{
              fontSize: 13,
              color: "var(--prv-text-3)",
              margin: "0 0 14px",
              lineHeight: 1.5,
              padding: "10px 12px",
              borderRadius: 12,
              background: "var(--prv-g2)",
              border: "1px solid var(--prv-border-subtle)",
            }}
          >
            &ldquo;{req.note}&rdquo;
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          borderTop: "1px solid var(--prv-border-subtle)",
        }}
      >
        <button
          onClick={onDecline}
          style={{
            padding: "13px 12px",
            background: "transparent",
            border: "none",
            borderRight: "1px solid var(--prv-border-subtle)",
            color: "rgba(255,99,90,0.85)",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,59,48,0.08)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent"
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Decline
        </button>
        <button
          onClick={onApprove}
          style={{
            padding: "13px 12px",
            background: "transparent",
            border: "none",
            color: "var(--prv-text-1)",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.06)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent"
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Approve
        </button>
      </div>
    </div>
  )
}

function TimeOffSheetContent({
  req,
  defaultAction,
  onConfirm,
  onClose,
}: {
  req: TimeOffRequest
  defaultAction: "approve" | "decline"
  onConfirm: (action: "approve" | "decline", reason?: string) => void
  onClose: () => void
}) {
  const [action, setAction] = useState<"approve" | "decline">(defaultAction)
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)

  const period = req.endDate
    ? `${formatDate(req.startDate)} – ${formatDate(req.endDate)}`
    : formatDate(req.startDate)

  const balanceAfter = req.leaveBalance - req.workingDays

  const stats = [
    { label: "Period", value: period },
    {
      label: "Duration",
      value: `${req.workingDays} working day${req.workingDays !== 1 ? "s" : ""}`,
    },
    { label: "Balance After", value: `${balanceAfter} day${balanceAfter !== 1 ? "s" : ""}` },
    { label: "Cover Needed", value: req.coverNeeded ? "Yes" : "No" },
  ]

  return (
    <div style={{ padding: "4px 20px 40px" }}>
      {/* Employee header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: "var(--prv-g3)",
            border: "1px solid var(--prv-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            fontWeight: 700,
            color: "var(--prv-text-1)",
            letterSpacing: 0.5,
            flexShrink: 0,
          }}
        >
          {req.employeeInitials}
        </div>
        <div>
          <p style={{ fontSize: 17, fontWeight: 600, color: "var(--prv-text-1)", margin: 0 }}>
            {req.employeeName}
          </p>
          <p style={{ fontSize: 13, color: "var(--prv-text-3)", margin: "2px 0 0" }}>
            {req.employeeRole} · {req.employeeLocation}
          </p>
        </div>
        <span
          style={{
            marginLeft: "auto",
            padding: "4px 10px",
            borderRadius: 100,
            background: TYPE_COLORS[req.type] ?? "var(--prv-g2)",
            border: "1px solid var(--prv-border-subtle)",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--prv-text-2)",
          }}
        >
          {req.typeLabel}
        </span>
      </div>

      {/* Stats grid */}
      <div
        style={{
          borderRadius: 16,
          border: "1px solid var(--prv-border-subtle)",
          overflow: "hidden",
          marginBottom: 16,
        }}
      >
        {stats.map((s, i) => (
          <div
            key={s.label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "11px 16px",
              borderBottom: i < stats.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
              background: "var(--prv-g1)",
            }}
          >
            <span style={{ fontSize: 14, color: "var(--prv-text-3)" }}>{s.label}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--prv-text-1)" }}>
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Note */}
      {req.note && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            borderRadius: 14,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--prv-text-4)",
              margin: "0 0 4px",
              textTransform: "uppercase",
              letterSpacing: 0.7,
            }}
          >
            Employee Note
          </p>
          <p style={{ fontSize: 14, color: "var(--prv-text-2)", margin: 0, lineHeight: 1.5 }}>
            {req.note}
          </p>
        </div>
      )}

      {/* Reason input (for decline or optional approve) */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: "var(--prv-text-3)", margin: "0 0 6px" }}>
          {action === "decline" ? "Reason for declining (optional)" : "Note to employee (optional)"}
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={
            action === "decline"
              ? "e.g., Overlap with project deadline…"
              : "e.g., Enjoy your time off!"
          }
          maxLength={500}
          rows={2}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 12,
            background: "var(--prv-g2)",
            border: "1px solid var(--prv-border)",
            color: "var(--prv-text-1)",
            fontSize: 14,
            resize: "none",
            outline: "none",
            fontFamily: "inherit",
            lineHeight: 1.5,
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Action toggle */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          borderRadius: 14,
          border: "1px solid var(--prv-border-subtle)",
          overflow: "hidden",
          marginBottom: 12,
        }}
      >
        <button
          onClick={() => setAction("decline")}
          style={{
            padding: "11px 12px",
            background: action === "decline" ? "rgba(255,59,48,0.10)" : "transparent",
            border: "none",
            borderRight: "1px solid var(--prv-border-subtle)",
            color: action === "decline" ? "rgba(255,99,90,0.9)" : "var(--prv-text-3)",
            fontSize: 14,
            fontWeight: action === "decline" ? 600 : 400,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          Decline
        </button>
        <button
          onClick={() => setAction("approve")}
          style={{
            padding: "11px 12px",
            background: action === "approve" ? "rgba(255,255,255,0.10)" : "transparent",
            border: "none",
            color: action === "approve" ? "var(--prv-text-1)" : "var(--prv-text-3)",
            fontSize: 14,
            fontWeight: action === "approve" ? 600 : 400,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          Approve
        </button>
      </div>

      {/* Confirm CTA */}
      <button
        onClick={async () => {
          setLoading(true)
          onConfirm(action, reason.trim() || undefined)
        }}
        disabled={loading}
        style={{
          width: "100%",
          padding: "15px 16px",
          borderRadius: 16,
          background: action === "approve" ? "rgba(255,255,255,0.95)" : "rgba(255,59,48,0.10)",
          border: `1px solid ${action === "approve" ? "rgba(255,255,255,0.3)" : "rgba(255,59,48,0.25)"}`,
          color: action === "approve" ? "#000000" : "rgba(255,99,90,0.9)",
          fontSize: 16,
          fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1,
          transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {loading ? "Processing…" : action === "approve" ? "Confirm Approval" : "Confirm Decline"}
      </button>

      <button
        onClick={onClose}
        style={{
          width: "100%",
          padding: "12px 16px",
          marginTop: 8,
          borderRadius: 14,
          background: "transparent",
          border: "none",
          color: "var(--prv-text-4)",
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        Cancel
      </button>
    </div>
  )
}
