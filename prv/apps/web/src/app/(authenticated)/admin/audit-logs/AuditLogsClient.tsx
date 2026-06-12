"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconChevronLeft() {
  return (
    <svg
      width="9"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.40)"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuditEntry {
  id: string
  actorId: string | null
  action: string
  entityType: string | null
  entityId: string | null
  method: string | null
  path: string | null
  ipAddress: string | null
  userAgent: string | null
  payload: unknown
  gateFailed: boolean | null
  createdAt: string
}

type FilterModule = "all" | "auth" | "finance" | "crm" | "admin" | "shop" | "people"

const FILTERS: { id: FilterModule; label: string }[] = [
  { id: "all", label: "Toate" },
  { id: "auth", label: "Auth" },
  { id: "finance", label: "Finance" },
  { id: "crm", label: "CRM" },
  { id: "admin", label: "Admin" },
  { id: "shop", label: "Shop" },
  { id: "people", label: "People" },
]

function dotColor(entry: AuditEntry): string {
  if (entry.gateFailed) return "rgba(255,80,80,0.80)"
  const a = entry.action
  if (a.startsWith("auth.")) return "rgba(100,160,255,0.80)"
  if (a.startsWith("finance.")) return "rgba(80,255,140,0.80)"
  if (a.startsWith("crm.")) return "rgba(80,255,140,0.80)"
  if (a.startsWith("admin.") || a.startsWith("roles.") || a.startsWith("audit"))
    return "rgba(255,200,50,0.80)"
  if (a.startsWith("shop.")) return "rgba(80,255,140,0.80)"
  if (a.startsWith("people.") || a.startsWith("user.")) return "rgba(100,160,255,0.80)"
  return "rgba(255,255,255,0.30)"
}

function matchesFilter(entry: AuditEntry, filter: FilterModule): boolean {
  if (filter === "all") return true
  return entry.action.startsWith(filter + ".")
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "acum"
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}z`
}

// ── Detail sheet ──────────────────────────────────────────────────────────────

function EntryDetail({ entry, onClose }: { entry: AuditEntry; onClose: () => void }) {
  const color = dotColor(entry)
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.70)",
        backdropFilter: "blur(8px)",
        zIndex: 100,
        display: "flex",
        alignItems: "flex-end",
        padding: "0 0 16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          margin: "0 auto",
          background: "rgba(18,18,18,0.98)",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: "24px 24px 20px 20px",
          padding: "20px 20px 32px",
          position: "relative",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)",
          }}
        />
        <div
          style={{
            width: 36,
            height: 4,
            background: "rgba(255,255,255,0.14)",
            borderRadius: 100,
            margin: "0 auto 18px",
          }}
        />

        {/* Action */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div
            style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }}
          />
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "rgba(255,255,255,0.95)",
              fontFamily: "monospace",
            }}
          >
            {entry.action}
          </span>
        </div>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 16 }}>
          {new Date(entry.createdAt).toLocaleString("en-US")}
        </p>

        {/* Fields */}
        {[
          { label: "Actor", value: entry.actorId ?? "system" },
          {
            label: "Entity",
            value:
              entry.entityType && entry.entityId
                ? `${entry.entityType} · ${entry.entityId.slice(0, 8)}…`
                : (entry.entityType ?? "—"),
          },
          { label: "IP", value: entry.ipAddress ?? "—" },
          { label: "Method", value: entry.method ?? "—" },
          { label: "Path", value: entry.path ?? "—" },
        ].map(({ label, value }, i, arr) => (
          <div key={label}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
              }}
            >
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{label}</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.75)",
                  maxWidth: 200,
                  textAlign: "right",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {value}
              </span>
            </div>
            {i < arr.length - 1 && (
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
            )}
          </div>
        ))}

        {/* Payload */}
        {entry.payload != null && (
          <div style={{ marginTop: 14 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.30)",
                marginBottom: 6,
              }}
            >
              Payload
            </p>
            <div
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                padding: 10,
                fontFamily: "monospace",
                fontSize: 10,
                color: "rgba(255,255,255,0.55)",
                lineHeight: 1.7,
                maxHeight: 120,
                overflow: "auto",
              }}
            >
              {JSON.stringify(entry.payload, null, 2)}
            </div>
          </div>
        )}

        {/* SHA banner */}
        <div
          style={{
            marginTop: 14,
            background: "rgba(80,255,140,0.05)",
            border: "1px solid rgba(80,255,140,0.14)",
            borderRadius: 10,
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(80,255,140,0.70)"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span style={{ fontSize: 11, color: "rgba(80,255,140,0.75)", fontFamily: "monospace" }}>
            {entry.id.slice(0, 8)}…{entry.id.slice(-6)} · Chain intact
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      <div
        style={{
          width: 140,
          height: 28,
          background: "var(--prv-g2)",
          borderRadius: 8,
          marginBottom: 20,
        }}
        className="animate-pulse"
      />
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{ height: 62, background: "var(--prv-g1)", borderRadius: 16 }}
            className="animate-pulse"
          />
        ))}
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            height: 60,
            background: "var(--prv-g1)",
            borderRadius: 0,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
          className="animate-pulse"
        />
      ))}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AuditLogsClient() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterModule>("all")
  const [selected, setSelected] = useState<AuditEntry | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/audit-logs")
      if (res.ok) {
        const data = await res.json()
        setEntries(data.items ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <Skeleton />

  const visible = entries.filter((e) => matchesFilter(e, filter))
  const todayCount = entries.length
  const criticalCount = entries.filter(
    (e) => e.gateFailed || e.action.includes("failed") || e.action.includes("revoke")
  ).length
  const errorCount = entries.filter((e) => e.gateFailed).length

  return (
    <div className="pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
          padding: "0 16px",
        }}
      >
        <Link
          href="/admin"
          style={{ display: "flex", alignItems: "center", textDecoration: "none" }}
        >
          <IconChevronLeft />
        </Link>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "-0.5px",
            color: "rgba(255,255,255,0.95)",
          }}
        >
          Jurnal Audit
        </h1>
      </div>

      {/* KPI strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8,
          marginBottom: 14,
          padding: "0 16px",
        }}
      >
        {[
          {
            label: "Azi",
            value: String(todayCount),
            textColor: "rgba(255,255,255,0.92)",
            bg: "var(--prv-g1)",
            border: "var(--prv-border-subtle)",
            lineColor: "rgba(255,255,255,0.14)",
          },
          {
            label: "Critice",
            value: String(criticalCount),
            textColor: "rgba(255,200,50,0.92)",
            bg: "rgba(255,200,50,0.07)",
            border: "rgba(255,200,50,0.18)",
            lineColor: "rgba(255,200,50,0.25)",
          },
          {
            label: "Erori",
            value: String(errorCount),
            textColor: "rgba(255,80,80,0.85)",
            bg: "rgba(255,60,60,0.06)",
            border: "rgba(255,60,60,0.16)",
            lineColor: "rgba(255,80,80,0.22)",
          },
        ].map(({ label, value, textColor, bg, border, lineColor }) => (
          <div
            key={label}
            style={{
              background: bg,
              border: `1px solid ${border}`,
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
                background: `linear-gradient(90deg,transparent,${lineColor},transparent)`,
              }}
            />
            <p style={{ fontSize: 16, fontWeight: 700, color: textColor, letterSpacing: "-0.3px" }}>
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

      {/* Filter chips */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 0,
          overflowX: "auto",
          paddingBottom: 2,
          padding: "0 16px 2px",
        }}
      >
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            style={{
              flexShrink: 0,
              padding: "5px 12px",
              borderRadius: 100,
              fontSize: 11,
              fontWeight: 500,
              cursor: "pointer",
              background: filter === id ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.07)",
              border:
                filter === id
                  ? "1px solid rgba(255,255,255,0.28)"
                  : "1px solid rgba(255,255,255,0.10)",
              color: filter === id ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.55)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Log list */}
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          marginTop: 12,
        }}
      >
        {visible.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
              color: "rgba(255,255,255,0.30)",
              fontSize: 14,
            }}
          >
            No records
          </div>
        ) : (
          visible.map((entry) => (
            <div
              key={entry.id}
              onClick={() => setSelected(entry)}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                padding: "11px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: dotColor(entry),
                  flexShrink: 0,
                  marginTop: 5,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.85)",
                    fontFamily: "monospace",
                  }}
                >
                  {entry.action}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.30)",
                    marginTop: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {entry.actorId ? `${entry.actorId.slice(0, 8)}…` : "system"}
                  {entry.entityType ? ` · ${entry.entityType}` : ""}
                  {entry.ipAddress ? ` · ${entry.ipAddress}` : ""}
                </p>
              </div>
              <span
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.25)",
                  flexShrink: 0,
                  marginTop: 3,
                }}
              >
                {fmtTime(entry.createdAt)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Detail sheet */}
      {selected && <EntryDetail entry={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
