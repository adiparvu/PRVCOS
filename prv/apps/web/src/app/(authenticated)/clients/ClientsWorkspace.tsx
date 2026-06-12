"use client"

import { useEffect, useMemo, useState } from "react"

// ── API Types ─────────────────────────────────────────────────────────────────

type ApiClientStatus = "vip" | "active" | "lead" | "cold"

interface ApiClientSummary {
  id: string
  initials: string
  name: string
  location: string
  status: ApiClientStatus
  ltv: number
  activeProjects: number
  openQuotes: number
  nps: number | null
  since: string
}

interface ApiLinkedProject {
  id: string
  name: string
  status: "active" | "planning" | "review" | "done" | "hold"
  completionPct: number
  currentPhaseName: string
  budget: number
  spent: number
  daysLeft: number
}

interface ApiLinkedInvoice {
  id: string
  ref: string
  projectName: string
  amount: number
  status: "overdue" | "due" | "partial" | "paid" | "draft" | "void"
}

interface ApiClientActivity {
  id: string
  type: string
  text: string
  timestamp: string
}

interface ApiClientDetail extends ApiClientSummary {
  phone: string
  email: string
  cifVat: string
  address: string
  contactPerson: string
  totalInvoiced: number
  totalPaid: number
  quotes: unknown[]
  invoices: ApiLinkedInvoice[]
  projects: ApiLinkedProject[]
  activities: ApiClientActivity[]
}

// ── Local UI Types ────────────────────────────────────────────────────────────

type UiStatus = "Active" | "Pending" | "Completed"
type FilterType = "All" | "Active" | "Pending" | "Completed"

interface ClientItem {
  id: string
  initials: string
  name: string
  location: string
  uiStatus: UiStatus
  isVip: boolean
  ltv: number
  activeProjects: number
  openQuotes: number
  since: string
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapUiStatus(s: ApiClientStatus): UiStatus {
  if (s === "vip" || s === "active") return "Active"
  if (s === "lead") return "Pending"
  return "Completed"
}

function mapToItem(c: ApiClientSummary): ClientItem {
  return {
    id: c.id,
    initials: c.initials,
    name: c.name,
    location: c.location,
    uiStatus: mapUiStatus(c.status),
    isVip: c.status === "vip",
    ltv: c.ltv,
    activeProjects: c.activeProjects,
    openQuotes: c.openQuotes,
    since: c.since,
  }
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const g1 = "var(--prv-g1)"
const g2 = "var(--prv-g2)"
const bds = "var(--prv-border-subtle)"
const bd = "var(--prv-border)"
const t1 = "var(--prv-text-1)"
const t2 = "var(--prv-text-2)"
const t3 = "var(--prv-text-3)"
const green = "rgba(48,209,88,0.90)"
const greenBg = "rgba(48,209,88,0.12)"
const amber = "rgba(255,159,10,0.95)"
const amberBg = "rgba(255,159,10,0.15)"
const gold = "rgba(255,204,0,0.95)"
const goldBg = "rgba(255,204,0,0.12)"

const STATUS_STYLE: Record<
  UiStatus,
  { bg: string; color: string; avatarBg: string; avatarColor: string }
> = {
  Active: { bg: greenBg, color: green, avatarBg: g2, avatarColor: t1 },
  Pending: { bg: amberBg, color: amber, avatarBg: amberBg, avatarColor: amber },
  Completed: { bg: bds, color: t3, avatarBg: g1, avatarColor: t3 },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Specular() {
  return (
    <div
      style={{
        position: "absolute",
        inset: "0 0 auto",
        height: 1,
        background: `linear-gradient(90deg,transparent,${bd},transparent)`,
      }}
    />
  )
}

function StatusPill({ status, isVip }: { status: UiStatus; isVip?: boolean }) {
  if (isVip) {
    return (
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          padding: "3px 8px",
          borderRadius: 20,
          background: goldBg,
          color: gold,
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        VIP
      </span>
    )
  }
  const s = STATUS_STYLE[status]
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "3px 8px",
        borderRadius: 20,
        background: s.bg,
        color: s.color,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {status === "Completed" ? "Inactive" : status === "Pending" ? "Lead" : "Active"}
    </span>
  )
}

function fmtCurrency(v: number): string {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}k`
  return `€${v}`
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  const months = [
    "Ian",
    "Feb",
    "Mar",
    "Apr",
    "Mai",
    "Iun",
    "Iul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ]
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

// ── Client Detail Sheet ───────────────────────────────────────────────────────

function ClientDetailSheet({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<ApiClientDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/crm/clients/${clientId}`)
        if (!res.ok || cancelled) return
        const data = (await res.json()) as { client: ApiClientDetail }
        if (!cancelled) setDetail(data.client)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [clientId])

  const uiStatus = detail ? mapUiStatus(detail.status) : "Active"
  const isVip = detail?.status === "vip"
  const ss = STATUS_STYLE[uiStatus]
  const remaining = detail ? detail.totalInvoiced - detail.totalPaid : 0
  const activeProject = detail?.projects.find((p) => p.status === "active")

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: g2,
          border: `1px solid ${bd}`,
          borderRadius: "28px 28px 0 0",
          overflow: "hidden",
          position: "relative",
          paddingBottom: 36,
          maxHeight: "90dvh",
          overflowY: "auto",
        }}
      >
        <Specular />
        <div
          style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 6 }}
        >
          <div style={{ width: 36, height: 4, borderRadius: 2, background: bd }} />
        </div>

        {loading || !detail ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: t3, fontSize: 14 }}>
            {loading ? "Loading…" : "Client not found."}
          </div>
        ) : (
          <div style={{ padding: "0 20px" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 15,
                  background: ss.avatarBg,
                  border: `1px solid ${bd}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 16,
                  fontWeight: 700,
                  color: isVip ? gold : ss.avatarColor,
                  letterSpacing: "0.02em",
                }}
              >
                {detail.initials}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase" as const,
                    color: t3,
                    marginBottom: 3,
                  }}
                >
                  {detail.location}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: t1, marginBottom: 4 }}>
                  {detail.name}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                  <StatusPill status={uiStatus} isVip={isVip} />
                  {detail.activeProjects > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: 20,
                        background: bds,
                        color: t2,
                      }}
                    >
                      {detail.activeProjects} proiect{detail.activeProjects !== 1 ? "e" : ""} activ
                      {detail.activeProjects !== 1 ? "e" : ""}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: g1,
                  border: `1px solid ${bds}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={t3}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Active project progress */}
            {activeProject && (
              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: g1,
                  border: `1px solid ${bds}`,
                  marginBottom: 14,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: t1 }}>
                    {activeProject.name}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: t1 }}>
                    {activeProject.completionPct}%
                  </span>
                </div>
                <div style={{ height: 6, background: bds, borderRadius: 3, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${activeProject.completionPct}%`,
                      background: t2,
                      borderRadius: 3,
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: t3 }}>
                    Buget: {fmtCurrency(activeProject.budget)}
                  </span>
                  <span style={{ fontSize: 11, color: t3 }}>
                    Cheltuit: {fmtCurrency(activeProject.spent)}
                  </span>
                  {activeProject.daysLeft > 0 && (
                    <span style={{ fontSize: 11, color: t3 }}>
                      {activeProject.daysLeft} days remaining
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Finance cards */}
            {detail.totalInvoiced > 0 && (
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {[
                  { val: fmtCurrency(detail.totalInvoiced), lbl: "Facturat" },
                  { val: fmtCurrency(detail.totalPaid), lbl: "Collected" },
                  { val: fmtCurrency(remaining), lbl: "Remaining" },
                ].map((m) => (
                  <div
                    key={m.lbl}
                    style={{
                      flex: 1,
                      padding: "10px 6px",
                      borderRadius: 12,
                      background: g1,
                      border: `1px solid ${bds}`,
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 700, color: t1, marginBottom: 2 }}>
                      {m.val}
                    </div>
                    <div style={{ fontSize: 9, color: t3 }}>{m.lbl}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Info rows */}
            <div
              style={{
                background: g1,
                border: `1px solid ${bds}`,
                borderRadius: 16,
                padding: "0 14px",
                marginBottom: 16,
              }}
            >
              {[
                { label: "Telefon", val: detail.phone },
                { label: "Email", val: detail.email },
                { label: "Address", val: detail.address !== "—" ? detail.address : "—" },
                { label: "Contact person", val: detail.contactPerson },
                { label: "CIF / VAT", val: detail.cifVat },
                { label: "Client din", val: detail.since },
              ]
                .filter((r) => r.val && r.val !== "—")
                .map((r, i, arr) => (
                  <div
                    key={r.label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px 0",
                      borderBottom: i < arr.length - 1 ? `1px solid ${bds}` : "none",
                    }}
                  >
                    <span style={{ fontSize: 13, color: t3 }}>{r.label}</span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: t1,
                        maxWidth: "55%",
                        textAlign: "right",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.val}
                    </span>
                  </div>
                ))}
            </div>

            {/* Recent activity */}
            {detail.activities.length > 0 && (
              <>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase" as const,
                    color: t3,
                    marginBottom: 10,
                  }}
                >
                  Activitate
                </div>
                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: 16,
                    background: g1,
                    border: `1px solid ${bds}`,
                    position: "relative",
                    marginBottom: 16,
                  }}
                >
                  <Specular />
                  {detail.activities.slice(0, 5).map((a, i) => (
                    <div
                      key={a.id}
                      style={{
                        display: "flex",
                        gap: 12,
                        paddingBottom: i < Math.min(detail.activities.length, 5) - 1 ? 14 : 0,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column" as const,
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: t2,
                            flexShrink: 0,
                            marginTop: 3,
                          }}
                        />
                        {i < Math.min(detail.activities.length, 5) - 1 && (
                          <div
                            style={{
                              width: 1,
                              flex: 1,
                              background: bds,
                              margin: "3px 0 0 0",
                              minHeight: 20,
                            }}
                          />
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: t1, marginBottom: 1 }}>
                          {a.text}
                        </div>
                        <div style={{ fontSize: 12, color: t3 }}>{fmtDate(a.timestamp)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* CTAs */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                style={{
                  flex: 1,
                  padding: "13px",
                  borderRadius: 14,
                  background: g2,
                  border: `1px solid ${bd}`,
                  color: t1,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Proiecte
              </button>
              <button
                style={{
                  flex: 1,
                  padding: "13px",
                  borderRadius: 14,
                  background: t1,
                  border: "none",
                  color: "var(--prv-bg)",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {detail.status === "lead" ? "Trimite quote" : "Send update"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ClientsWorkspace() {
  const [clients, setClients] = useState<ClientItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>("All")
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch("/api/crm/clients/")
        if (!res.ok || cancelled) return
        const data = (await res.json()) as { clients: ApiClientSummary[] }
        if (!cancelled) setClients(data.clients.map(mapToItem))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const FILTERS: FilterType[] = ["All", "Active", "Pending", "Completed"]

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const matchFilter =
        filter === "All" ||
        (filter === "Active" && c.uiStatus === "Active") ||
        (filter === "Pending" && c.uiStatus === "Pending") ||
        (filter === "Completed" && c.uiStatus === "Completed")
      const q = search.toLowerCase()
      const matchSearch =
        !search || c.name.toLowerCase().includes(q) || c.location.toLowerCase().includes(q)
      return matchFilter && matchSearch
    })
  }, [clients, filter, search])

  const activeCount = useMemo(
    () => clients.filter((c) => c.uiStatus === "Active").length,
    [clients]
  )
  const pendingCount = useMemo(
    () => clients.filter((c) => c.uiStatus === "Pending").length,
    [clients]
  )
  const totalLtv = useMemo(() => clients.reduce((s, c) => s + c.ltv, 0), [clients])

  return (
    <div style={{ paddingBottom: 120 }}>
      {/* ── Header ── */}
      <div style={{ padding: "6px 16px 4px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 4,
          }}
        >
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: t1 }}>
            Client Portal
          </h1>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: g1,
              border: `1px solid ${bds}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={t2}
              strokeWidth="1.7"
              strokeLinecap="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
        </div>
        <p style={{ fontSize: 14, color: t2 }}>
          {loading ? "…" : `${clients.length} clients · ${activeCount} active projects`}
        </p>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "flex", gap: 8, padding: "16px 16px 0" }}>
        {[
          { val: loading ? "…" : String(clients.length), lbl: "Clients" },
          { val: loading ? "…" : String(activeCount), lbl: "Activi" },
          {
            val: loading ? "…" : String(pendingCount),
            lbl: "Lead-uri",
            color: pendingCount > 0 ? amber : t1,
          },
          { val: loading ? "…" : fmtCurrency(totalLtv), lbl: "LTV Total" },
        ].map((s) => (
          <div
            key={s.lbl}
            style={{
              flex: 1,
              padding: "12px 8px",
              borderRadius: 14,
              background: g1,
              border: `1px solid ${bds}`,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: s.color ?? t1, marginBottom: 2 }}>
              {s.val}
            </div>
            <div style={{ fontSize: 10, color: t3 }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          borderRadius: 14,
          background: "var(--prv-border-subtle)",
          border: `1px solid ${bds}`,
          margin: "14px 16px 0",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={t3}
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients, cities…"
          style={{
            flex: 1,
            background: "none",
            border: "none",
            outline: "none",
            fontSize: 14,
            color: t1,
            fontFamily: "inherit",
          }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            style={{
              background: "none",
              border: "none",
              color: t3,
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* ── Filter tabs ── */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "3px",
          background: g1,
          borderRadius: 10,
          margin: "12px 16px 0",
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              flex: 1,
              padding: "6px 0",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              color: filter === f ? t1 : t3,
              background: filter === f ? g2 : "transparent",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {f === "All"
              ? "All"
              : f === "Active"
                ? "Activi"
                : f === "Pending"
                  ? "Lead-uri"
                  : "Inactivi"}
          </button>
        ))}
      </div>

      {/* ── Client list ── */}
      <div style={{ padding: "16px 16px 0" }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.07em",
            textTransform: "uppercase" as const,
            color: t3,
            marginBottom: 12,
          }}
        >
          {filter === "All"
            ? "All clients"
            : filter === "Active"
              ? "Active clients"
              : filter === "Pending"
                ? "Lead-uri"
                : "Inactive clients"}
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                style={{ height: 72, borderRadius: 16, background: g1, border: `1px solid ${bds}` }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: t3, fontSize: 14 }}>
            No clients found
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
            {filtered.map((c) => {
              const ss = STATUS_STYLE[c.uiStatus]
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "13px 14px",
                    borderRadius: 16,
                    background: g1,
                    border: `1px solid ${c.uiStatus === "Pending" ? "rgba(255,159,10,0.22)" : bds}`,
                    cursor: "pointer",
                    position: "relative",
                  }}
                >
                  <Specular />
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 13,
                      background: c.isVip ? goldBg : ss.avatarBg,
                      border: `1px solid ${bd}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: 14,
                      fontWeight: 700,
                      color: c.isVip ? gold : ss.avatarColor,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {c.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: c.uiStatus === "Completed" ? t2 : t1,
                        marginBottom: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: t3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.location}
                      {c.activeProjects > 0 &&
                        ` · ${c.activeProjects} proiect${c.activeProjects !== 1 ? "e" : ""} activ${c.activeProjects !== 1 ? "e" : ""}`}
                      {c.ltv > 0 && ` · ${fmtCurrency(c.ltv)} LTV`}
                    </div>
                    {c.openQuotes > 0 && (
                      <div style={{ fontSize: 11, color: amber, marginTop: 2 }}>
                        {c.openQuotes} open quote
                      </div>
                    )}
                  </div>
                  <StatusPill status={c.uiStatus} isVip={c.isVip} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Detail sheet ── */}
      {selectedId && (
        <ClientDetailSheet clientId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}
