"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { TimeOffDetail } from "@/app/api/people/time-off/[id]/route"

const STATUS_COLOR: Record<string, string> = {
  pending: "rgba(255,159,10,.95)",
  approved: "rgba(48,209,88,.95)",
  declined: "rgba(255,69,58,.95)",
}
const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  declined: "Refuzat",
}
const TYPE_COLOR: Record<string, string> = {
  annual: "rgba(10,132,255,.9)",
  sick: "rgba(255,69,58,.9)",
  personal: "rgba(255,159,10,.9)",
  maternity: "rgba(191,90,242,.9)",
  paternity: "rgba(191,90,242,.9)",
  unpaid: "rgba(255,255,255,.35)",
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })
}

function auditLabel(action: string): string {
  if (action.includes("approve")) return "Request approved"
  if (action.includes("decline") || action.includes("reject")) return "Request declined"
  if (action.includes("create")) return "Request registered"
  if (action.includes("update")) return "Request updated"
  return action
}

interface Props {
  id: string
}

export function TimeOffDetailClient({ id }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [actionLoading, setActionLoading] = useState<"approve" | "decline" | null>(null)
  const [actionDone, setActionDone] = useState<"approve" | "decline" | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["timeOffRequest", id],
    queryFn: () =>
      fetch(`/api/people/time-off/${id}`).then(
        (r) => r.json() as Promise<{ request: TimeOffDetail }>
      ),
  })

  const req = data?.request

  async function handleAction(action: "approve" | "decline") {
    setActionLoading(action)
    setError(null)
    try {
      const res = await fetch(`/api/people/time-off/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error("Action failed")
      setActionDone(action)
      void queryClient.invalidateQueries({ queryKey: ["timeOffRequests"] })
      void queryClient.invalidateQueries({ queryKey: ["timeOffRequest", id] })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setActionLoading(null)
    }
  }

  if (isLoading || !req) {
    return (
      <div style={{ padding: "24px 20px" }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: 80,
              borderRadius: 16,
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              marginBottom: 10,
              animation: "pulse 1.8s ease-in-out infinite",
            }}
          />
        ))}
      </div>
    )
  }

  const statusColor = STATUS_COLOR[req.status] ?? "rgba(255,255,255,.35)"
  const typeColor = TYPE_COLOR[req.type] ?? "rgba(255,255,255,.35)"
  const isPending = req.status === "pending" && !actionDone

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "20px 20px 12px",
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.45)",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
            padding: 0,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Time-Off
        </button>
      </div>

      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Employee card */}
        <div
          style={{
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            borderRadius: 20,
            padding: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "var(--prv-g2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                fontWeight: 700,
                color: "rgba(255,255,255,.7)",
                flexShrink: 0,
              }}
            >
              {req.employeeInitials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{ fontSize: 17, fontWeight: 700, color: "rgba(255,255,255,.95)", margin: 0 }}
              >
                {req.employeeName}
              </p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,.4)", margin: "2px 0 0" }}>
                {req.employeeRole} · {req.employeeLocation}
              </p>
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: statusColor,
                background: `${statusColor}18`,
                borderRadius: 100,
                padding: "3px 10px",
                flexShrink: 0,
              }}
            >
              {actionDone
                ? actionDone === "approve"
                  ? STATUS_LABEL.approved
                  : STATUS_LABEL.declined
                : (STATUS_LABEL[req.status] ?? req.status)}
            </div>
          </div>

          {/* Leave type + dates row */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: typeColor,
                background: `${typeColor}15`,
                borderRadius: 8,
                padding: "4px 10px",
              }}
            >
              {req.typeLabel}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "rgba(255,255,255,.55)",
                background: "rgba(255,255,255,.06)",
                borderRadius: 8,
                padding: "4px 10px",
              }}
            >
              {fmtDate(req.startDate)}
              {req.endDate && req.endDate !== req.startDate ? ` → ${fmtDate(req.endDate)}` : ""}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "rgba(255,255,255,.55)",
                background: "rgba(255,255,255,.06)",
                borderRadius: 8,
                padding: "4px 10px",
              }}
            >
              {req.workingDays} {req.workingDays === 1 ? "working day" : "working days"}
            </div>
          </div>
        </div>

        {/* Note */}
        {req.note && (
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 16,
              padding: "14px 16px",
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(255,255,255,.35)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                margin: "0 0 6px",
              }}
            >
              Motiv
            </p>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,.75)", margin: 0, lineHeight: 1.5 }}>
              {req.note}
            </p>
          </div>
        )}

        {/* Approved by */}
        {req.approvedByName && (
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 16,
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(48,209,88,.7)"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,.65)", margin: 0 }}>
              {req.status === "approved" ? "Approved" : "Actioned"} by{" "}
              <span style={{ color: "rgba(255,255,255,.9)", fontWeight: 600 }}>
                {req.approvedByName}
              </span>
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              background: "rgba(255,69,58,.1)",
              border: "1px solid rgba(255,69,58,.25)",
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: 13,
              color: "rgba(255,69,58,.9)",
            }}
          >
            {error}
          </div>
        )}

        {/* Action buttons */}
        {isPending && (
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => handleAction("decline")}
              disabled={!!actionLoading}
              style={{
                flex: 1,
                padding: "13px",
                borderRadius: 14,
                background: "rgba(255,69,58,.12)",
                border: "1px solid rgba(255,69,58,.25)",
                color: "rgba(255,69,58,.9)",
                fontSize: 14,
                fontWeight: 600,
                cursor: actionLoading ? "default" : "pointer",
                opacity: actionLoading === "decline" ? 0.5 : 1,
              }}
            >
              {actionLoading === "decline" ? "Processing…" : "Reject"}
            </button>
            <button
              onClick={() => handleAction("approve")}
              disabled={!!actionLoading}
              style={{
                flex: 1,
                padding: "13px",
                borderRadius: 14,
                background: "rgba(255,255,255,.95)",
                border: "none",
                color: "#000",
                fontSize: 14,
                fontWeight: 600,
                cursor: actionLoading ? "default" : "pointer",
                opacity: actionLoading === "approve" ? 0.5 : 1,
              }}
            >
              {actionLoading === "approve" ? "Processing…" : "Approve"}
            </button>
          </div>
        )}

        {actionDone && (
          <div
            style={{
              background: actionDone === "approve" ? "rgba(48,209,88,.1)" : "rgba(255,69,58,.1)",
              border: `1px solid ${actionDone === "approve" ? "rgba(48,209,88,.25)" : "rgba(255,69,58,.25)"}`,
              borderRadius: 14,
              padding: "14px 16px",
              textAlign: "center",
              fontSize: 14,
              fontWeight: 600,
              color: actionDone === "approve" ? "rgba(48,209,88,.9)" : "rgba(255,69,58,.9)",
            }}
          >
            {actionDone === "approve" ? "Request approved" : "Request declined"}
          </div>
        )}

        {/* Audit trail */}
        {req.auditTrail.length > 0 && (
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 20,
              padding: "14px 16px",
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(255,255,255,.35)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                margin: "0 0 12px",
              }}
            >
              Istoric
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {req.auditTrail.map((entry, i) => (
                <div key={entry.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: i === 0 ? "rgba(255,255,255,.6)" : "rgba(255,255,255,.2)",
                      marginTop: 5,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,.75)", margin: 0 }}>
                      {auditLabel(entry.action)}
                    </p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,.3)", margin: "2px 0 0" }}>
                      {fmtDate(entry.timestamp)} · {fmtTime(entry.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submitted at */}
        <p
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,.25)",
            textAlign: "center",
            margin: "4px 0 0",
          }}
        >
          Submitted {fmtDate(req.submittedAt)}
        </p>
      </div>
    </div>
  )
}
