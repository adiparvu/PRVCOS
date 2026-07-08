"use client"

import { useState, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"

// ── Types ─────────────────────────────────────────────────────────────────────

type AlertSeverity = "l1_info" | "l2_warning" | "l3_critical" | "l4_emergency" | "l5_crisis"
type AlertStatus = "open" | "acknowledged" | "assigned" | "resolved"

interface Alert {
  id: string
  severity: AlertSeverity
  status: AlertStatus
  title: string
  description: string | null
  source: string
  entityType: string | null
  entityId: string | null
  assignedToId: string | null
  acknowledgedAt: string | null
  resolvedAt: string | null
  resolutionNote: string | null
  createdAt: string
  updatedAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  l1_info: {
    label: "Info",
    color: "rgba(255,255,255,0.55)",
    bg: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.10)",
    dot: "rgba(255,255,255,0.35)",
  },
  l2_warning: {
    label: "Avertisment",
    color: "rgba(255,204,68,0.85)",
    bg: "rgba(255,204,68,0.06)",
    border: "rgba(255,204,68,0.18)",
    dot: "rgba(255,204,68,0.70)",
  },
  l3_critical: {
    label: "Critic",
    color: "rgba(255,100,80,0.90)",
    bg: "rgba(255,100,80,0.06)",
    border: "rgba(255,100,80,0.20)",
    dot: "rgba(255,100,80,0.75)",
  },
  l4_emergency: {
    label: "Urgență",
    color: "rgba(255,60,60,0.95)",
    bg: "rgba(255,60,60,0.08)",
    border: "rgba(255,60,60,0.28)",
    dot: "rgba(255,60,60,0.90)",
  },
  l5_crisis: {
    label: "CRIZĂ",
    color: "#fff",
    bg: "rgba(255,40,40,0.14)",
    border: "rgba(255,40,40,0.45)",
    dot: "#ff2828",
  },
}

const STATUS_LABELS: Record<AlertStatus, string> = {
  open: "Deschis",
  acknowledged: "Recunoscut",
  assigned: "Alocat",
  resolved: "Rezolvat",
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "acum"
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}z`
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconBack() {
  return (
    <svg
      width="9"
      height="15"
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
      width="13"
      height="13"
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
function IconBell() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
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
          width: 160,
          background: "var(--prv-g2)",
          borderRadius: 8,
          marginBottom: 24,
        }}
        className="animate-pulse"
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            height: 80,
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

// ── Alert Row ─────────────────────────────────────────────────────────────────

function AlertRow({
  alert,
  onAcknowledge,
  onResolve,
  onAssign,
  people,
}: {
  alert: Alert
  onAcknowledge: (id: string) => void
  onResolve: (id: string, note?: string) => void
  onAssign: (id: string, userId: string) => void
  people: { id: string; firstName: string; lastName: string }[]
}) {
  const cfg = SEVERITY_CONFIG[alert.severity]
  const [resolving, setResolving] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [note, setNote] = useState("")

  return (
    <div
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 16,
        padding: "13px 16px",
        marginBottom: 8,
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
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent)",
        }}
      />

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {/* Severity dot */}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: cfg.dot,
            marginTop: 5,
            flexShrink: 0,
          }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Severity badge + time */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: cfg.color,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}
            >
              {cfg.label}
            </span>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>·</span>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>
              {timeAgo(alert.createdAt)}
            </span>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.20)", marginLeft: "auto" }}>
              {STATUS_LABELS[alert.status]}
            </span>
          </div>

          {/* Title */}
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "rgba(255,255,255,0.90)",
              lineHeight: 1.3,
              marginBottom: alert.description ? 3 : 0,
            }}
          >
            {alert.title}
          </p>

          {/* Description */}
          {alert.description && (
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>
              {alert.description}
            </p>
          )}

          {/* Source */}
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 4 }}>
            {alert.source}
          </p>
        </div>
      </div>

      {/* Actions — only for open/acknowledged */}
      {alert.status !== "resolved" && !resolving && !assigning && (
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {alert.status === "open" && (
            <button
              onClick={() => onAcknowledge(alert.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "5px 10px",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                color: "rgba(255,255,255,0.60)",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <IconBell />
              Recunoaște
            </button>
          )}
          <button
            onClick={() => setResolving(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "5px 10px",
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              color: "rgba(255,255,255,0.60)",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <IconCheck />
            Rezolvă
          </button>
          <button
            onClick={() => setAssigning(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "5px 10px",
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              color: "rgba(255,255,255,0.60)",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Alocă
          </button>
        </div>
      )}
      {alert.status !== "resolved" && assigning && (
        <div style={{ marginTop: 10 }}>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                onAssign(alert.id, e.target.value)
                setAssigning(false)
              }
            }}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              padding: "8px 10px",
              color: "rgba(255,255,255,0.85)",
              fontSize: 12,
              fontFamily: "inherit",
              appearance: "none",
              marginBottom: 8,
            }}
          >
            <option value="" style={{ background: "#111" }}>
              Alege o persoană…
            </option>
            {people.map((p) => (
              <option key={p.id} value={p.id} style={{ background: "#111" }}>
                {p.firstName} {p.lastName}
              </option>
            ))}
          </select>
          <button
            onClick={() => setAssigning(false)}
            style={{
              padding: "5px 12px",
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              color: "rgba(255,255,255,0.60)",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Anulează
          </button>
        </div>
      )}
      {alert.status !== "resolved" && resolving && (
        <div style={{ marginTop: 10 }}>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Notă de rezolvare (opțional)"
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              padding: "8px 10px",
              color: "rgba(255,255,255,0.85)",
              fontSize: 12,
              fontFamily: "inherit",
              lineHeight: 1.5,
              resize: "vertical",
              minHeight: 54,
              marginBottom: 8,
            }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => {
                onResolve(alert.id, note.trim() || undefined)
                setResolving(false)
                setNote("")
              }}
              style={{
                padding: "5px 12px",
                background: "rgba(255,255,255,0.92)",
                border: 0,
                borderRadius: 8,
                color: "#000",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Confirmă rezolvarea
            </button>
            <button
              onClick={() => {
                setResolving(false)
                setNote("")
              }}
              style={{
                padding: "5px 12px",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                color: "rgba(255,255,255,0.60)",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Anulează
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

type FilterTab = "open" | "all"

export function AlertsClient() {
  const [tab, setTab] = useState<FilterTab>("open")
  const queryClient = useQueryClient()

  const { data, isLoading: loading } = useQuery({
    queryKey: ["alerts", tab],
    queryFn: () =>
      fetch(`/api/alerts?status=${tab}`).then((r) => {
        if (!r.ok) throw new Error("Failed to load alerts")
        return r.json() as Promise<{ alerts: Alert[] }>
      }),
  })
  const alertList = data?.alerts ?? []

  const { data: peopleData } = useQuery({
    queryKey: ["people", "picker"],
    queryFn: () =>
      fetch("/api/people?limit=200").then(
        (r) =>
          r.json() as Promise<{ members: { id: string; firstName: string; lastName: string }[] }>
      ),
  })
  const people = peopleData?.members ?? []

  const handleAcknowledge = useCallback(
    async (id: string) => {
      await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "acknowledge" }),
      })
      queryClient.setQueryData<{ alerts: Alert[] }>(["alerts", tab], (prev) =>
        prev
          ? {
              alerts: prev.alerts.map((a) =>
                a.id === id ? { ...a, status: "acknowledged" as AlertStatus } : a
              ),
            }
          : prev
      )
    },
    [queryClient, tab]
  )

  const handleResolve = useCallback(
    async (id: string, note?: string) => {
      await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "resolve", resolutionNote: note }),
      })
      queryClient.setQueryData<{ alerts: Alert[] }>(["alerts", tab], (prev) =>
        prev
          ? {
              alerts:
                tab === "open"
                  ? prev.alerts.filter((a) => a.id !== id)
                  : prev.alerts.map((a) =>
                      a.id === id ? { ...a, status: "resolved" as AlertStatus } : a
                    ),
            }
          : prev
      )
    },
    [queryClient, tab]
  )

  const handleAssign = useCallback(
    async (id: string, userId: string) => {
      await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "assign", assignedToId: userId }),
      })
      queryClient.setQueryData<{ alerts: Alert[] }>(["alerts", tab], (prev) =>
        prev
          ? {
              alerts: prev.alerts.map((a) =>
                a.id === id ? { ...a, status: "assigned" as AlertStatus, assignedToId: userId } : a
              ),
            }
          : prev
      )
    },
    [queryClient, tab]
  )

  // Counts by severity for the open alerts
  const criticalCount = alertList.filter(
    (a) =>
      a.severity === "l3_critical" || a.severity === "l4_emergency" || a.severity === "l5_crisis"
  ).length

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            color: "rgba(255,255,255,0.35)",
            textDecoration: "none",
          }}
        >
          <IconBack />
        </Link>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "-0.5px",
            color: "rgba(255,255,255,0.95)",
            flex: 1,
          }}
        >
          Alerte
        </h1>
        {criticalCount > 0 && (
          <div
            style={{
              background: "rgba(255,60,60,0.14)",
              border: "1px solid rgba(255,60,60,0.35)",
              borderRadius: 100,
              padding: "3px 10px",
              fontSize: 11,
              fontWeight: 700,
              color: "rgba(255,80,80,0.90)",
            }}
          >
            {criticalCount} critic{criticalCount !== 1 ? "e" : "ă"}
          </div>
        )}
      </div>

      {/* Tab switcher */}
      <div
        style={{
          display: "flex",
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 12,
          padding: 3,
          marginBottom: 16,
        }}
      >
        {(["open", "all"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: "7px 0",
              borderRadius: 9,
              border: "none",
              background: tab === t ? "rgba(255,255,255,0.10)" : "transparent",
              color: tab === t ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.35)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            {t === "open" ? "Active" : "Toate"}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <Skeleton />
      ) : alertList.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 0",
            color: "rgba(255,255,255,0.25)",
            fontSize: 14,
          }}
        >
          {tab === "open" ? "Nicio alertă activă." : "Nu există alerte."}
        </div>
      ) : (
        <>
          {/* Severity summary */}
          {tab === "open" && (
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {(["l5_crisis", "l4_emergency", "l3_critical", "l2_warning", "l1_info"] as const).map(
                (sev) => {
                  const count = alertList.filter((a) => a.severity === sev).length
                  if (!count) return null
                  const cfg = SEVERITY_CONFIG[sev]
                  return (
                    <div
                      key={sev}
                      style={{
                        padding: "4px 10px",
                        background: cfg.bg,
                        border: `1px solid ${cfg.border}`,
                        borderRadius: 100,
                        fontSize: 11,
                        fontWeight: 600,
                        color: cfg.color,
                      }}
                    >
                      {count} {cfg.label}
                    </div>
                  )
                }
              )}
            </div>
          )}

          {/* Alert list — critical first */}
          {[...alertList]
            .sort((a, b) => {
              const order = {
                l5_crisis: 0,
                l4_emergency: 1,
                l3_critical: 2,
                l2_warning: 3,
                l1_info: 4,
              }
              return order[a.severity] - order[b.severity]
            })
            .map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onAcknowledge={handleAcknowledge}
                onResolve={handleResolve}
                onAssign={handleAssign}
                people={people}
              />
            ))}
        </>
      )}
    </div>
  )
}
