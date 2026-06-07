"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import type { ClientSummary, ClientStatus } from "@/app/api/crm/clients/route"

// ── Icons (SF Symbol style) ───────────────────────────────────────────────────

function IconPlus() {
  return (
    <svg
      width="14"
      height="14"
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

function IconStar() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "inline", verticalAlign: "middle", marginRight: 2 }}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number) {
  return "€" + amount.toLocaleString("ro-RO")
}

function vipBorder(): string {
  return "linear-gradient(180deg,#d4a800,#ffcc44)"
}

type FilterId = "all" | ClientStatus

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Toți" },
  { id: "vip", label: "VIP" },
  { id: "active", label: "Active" },
  { id: "lead", label: "Leads" },
  { id: "cold", label: "Cold" },
]

const STATUS_CONFIG: Record<
  ClientStatus,
  { label: string; color: string; bg: string; avatarColor: string }
> = {
  vip: {
    label: "VIP",
    color: "#ffcc44",
    bg: "rgba(255,204,68,0.13)",
    avatarColor: "rgba(255,204,68,0.18)",
  },
  active: {
    label: "Active",
    color: "#5affa0",
    bg: "rgba(90,255,160,0.12)",
    avatarColor: "rgba(255,255,255,0.10)",
  },
  lead: {
    label: "Lead",
    color: "#7eb8ff",
    bg: "rgba(126,184,255,0.13)",
    avatarColor: "rgba(126,184,255,0.14)",
  },
  cold: {
    label: "Cold",
    color: "rgba(255,255,255,0.35)",
    bg: "rgba(255,255,255,0.07)",
    avatarColor: "rgba(255,255,255,0.07)",
  },
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function Skeleton({ w, h, radius = 6 }: { w: number | string; h: number; radius?: number }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        background: "rgba(255,255,255,0.07)",
      }}
    />
  )
}

// ── Client card ───────────────────────────────────────────────────────────────

function ClientCard({ client }: { client: ClientSummary }) {
  const s = STATUS_CONFIG[client.status]
  const border = client.status === "vip" ? vipBorder() : undefined

  return (
    <Link href={`/crm/clients/${client.id}`} style={{ textDecoration: "none", display: "block" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          borderBottom: "1px solid var(--prv-border-subtle)",
          position: "relative",
          ...(border
            ? {
                borderLeft: "3px solid transparent",
                borderImage: `${border} 1`,
                paddingLeft: 13,
              }
            : {}),
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            background: s.avatarColor,
            border: `1px solid ${client.status === "vip" ? "rgba(255,204,68,0.28)" : "var(--prv-border-subtle)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
            color:
              client.status === "vip"
                ? "#ffcc44"
                : client.status === "lead"
                  ? "#7eb8ff"
                  : "rgba(255,255,255,0.70)",
            flexShrink: 0,
          }}
        >
          {client.initials}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <p
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "rgba(255,255,255,0.90)",
                margin: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {client.status === "vip" && (
                <span style={{ color: "#ffcc44", marginRight: 4 }}>
                  <IconStar />
                </span>
              )}
              {client.name}
            </p>
          </div>
          <p
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.35)",
              margin: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {client.location} · since {client.since}
          </p>
        </div>

        {/* Right side */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 5,
            flexShrink: 0,
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 700, color: "#5affa0", margin: 0 }}>
            {fmt(client.ltv)}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {client.openQuotes > 0 && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 7px",
                  borderRadius: 6,
                  background: "rgba(126,184,255,0.12)",
                  border: "1px solid rgba(126,184,255,0.22)",
                  color: "#7eb8ff",
                }}
              >
                {client.openQuotes} ofert{client.openQuotes > 1 ? "e" : "ă"}
              </span>
            )}
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 7px",
                borderRadius: 6,
                background: s.bg,
                color: s.color,
              }}
            >
              {s.label}
            </span>
          </div>
        </div>

        {/* Chevron */}
        <div style={{ color: "rgba(255,255,255,0.20)", marginLeft: 2, flexShrink: 0 }}>
          <IconChevronRight />
        </div>
      </div>
    </Link>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ClientListClient() {
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterId>("all")

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/crm/clients", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setClients(data.clients)
    } catch {
      setError("Nu s-au putut încărca clienții.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const filtered = filter === "all" ? clients : clients.filter((c) => c.status === filter)

  const totalLTV = clients.reduce((s, c) => s + c.ltv, 0)
  const activeVipCount = clients.filter((c) => c.status === "active" || c.status === "vip").length
  const leadCount = clients.filter((c) => c.status === "lead").length
  const budgetRisk = clients.filter((c) => c.status === "cold").length

  return (
    <div
      style={{
        padding: "56px 16px 112px",
        maxWidth: 640,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            href="/crm"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              color: "rgba(255,255,255,0.45)",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <IconChevronLeft />
            CRM
          </Link>
        </div>
        <button
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.65)",
            cursor: "pointer",
          }}
        >
          <IconPlus />
        </button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "rgba(255,255,255,0.35)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 4,
          }}
        >
          CRM
        </p>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 600,
            color: "rgba(255,255,255,0.90)",
            letterSpacing: "-0.5px",
            margin: 0,
          }}
        >
          Clienți
        </h1>
      </div>

      {/* KPI strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          marginBottom: 16,
        }}
      >
        {[
          { v: loading ? "—" : String(clients.length), l: "Total", c: "rgba(255,255,255,0.90)" },
          {
            v: loading ? "—" : String(activeVipCount),
            l: "Active",
            c: "#5affa0",
          },
          {
            v: loading ? "—" : String(leadCount),
            l: "Leads",
            c: "#7eb8ff",
          },
          {
            v: loading ? "—" : `€${(totalLTV / 1000).toFixed(0)}K`,
            l: "LTV",
            c: "#5affa0",
          },
        ].map(({ v, l, c }) => (
          <div
            key={l}
            style={{
              padding: "10px 0",
              borderRadius: 14,
              textAlign: "center",
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
            }}
          >
            <p style={{ fontSize: 18, fontWeight: 700, color: c, margin: 0 }}>{v}</p>
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                margin: "4px 0 0",
              }}
            >
              {l}
            </p>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          marginBottom: 16,
          paddingBottom: 2,
          scrollbarWidth: "none",
        }}
      >
        {FILTERS.map((f) => {
          const active = filter === f.id
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                flexShrink: 0,
                padding: "6px 14px",
                borderRadius: 100,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                background: active ? "rgba(255,255,255,0.14)" : "var(--prv-g1)",
                border: active
                  ? "1px solid rgba(255,255,255,0.28)"
                  : "1px solid var(--prv-border-subtle)",
                color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)",
                transition: "all 0.15s ease",
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* List */}
      <div
        style={{
          borderRadius: 18,
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: "16px" }}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 0",
                  borderBottom: i < 4 ? "1px solid var(--prv-border-subtle)" : "none",
                }}
              >
                <Skeleton w={42} h={42} radius={21} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                  <Skeleton w="60%" h={13} />
                  <Skeleton w="40%" h={11} />
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    alignItems: "flex-end",
                  }}
                >
                  <Skeleton w={60} h={13} />
                  <Skeleton w={44} h={18} radius={6} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div
            style={{
              padding: "40px 16px",
              textAlign: "center",
              color: "rgba(255,255,255,0.35)",
              fontSize: 14,
            }}
          >
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              padding: "40px 16px",
              textAlign: "center",
              color: "rgba(255,255,255,0.35)",
              fontSize: 14,
            }}
          >
            Niciun client găsit.
          </div>
        ) : (
          filtered.map((client, idx) => (
            <div
              key={client.id}
              style={idx === filtered.length - 1 ? { borderBottom: "none" } : {}}
            >
              <ClientCard client={client} />
            </div>
          ))
        )}
      </div>

      {/* Cold clients note */}
      {!loading && budgetRisk > 0 && (
        <p
          style={{
            marginTop: 12,
            fontSize: 12,
            color: "rgba(255,255,255,0.25)",
            textAlign: "center",
          }}
        >
          {budgetRisk} client{budgetRisk > 1 ? "i" : ""} inactiv{budgetRisk > 1 ? "i" : ""}
        </p>
      )}
    </div>
  )
}
