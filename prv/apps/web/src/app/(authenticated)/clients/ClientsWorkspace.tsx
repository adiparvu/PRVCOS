"use client"

import { useState } from "react"

type ClientStatus = "Active" | "Pending" | "Review" | "Completed"
type FilterType = "All" | "Active" | "Pending" | "Completed"

interface Client {
  id: string
  initials: string
  name: string
  type: "Residential" | "Commercial"
  city: string
  projectTitle: string
  projectProgress: number
  projectStart: string
  projectEnd: string
  contractValue: number
  paid: number
  status: ClientStatus
  phone: string
  siteManager: string
  documents: string
  lastUpdate: string
  pendingNote?: string
}

interface ActivityEntry {
  id: string
  title: string
  detail: string
  color: string
}

// ── Data ─────────────────────────────────────────────────────────────────────

const CLIENTS: Client[] = [
  { id: "c1", initials: "MP", name: "Mihai & Elena Popescu",  type: "Residential", city: "Cluj-Napoca", projectTitle: "Kitchen + Bathroom Renovation", projectProgress: 64, projectStart: "Apr 12",  projectEnd: "Jul 20, 2026", contractValue: 38400, paid: 22100, status: "Active",    phone: "0721 100 200", siteManager: "Liviu Toma",   documents: "Contract · 3 invoices", lastUpdate: "Jun 3, 2026" },
  { id: "c2", initials: "SI", name: "SC Invest-Imob SRL",    type: "Commercial",  city: "Brașov",      projectTitle: "Full Apartment Block Renovation", projectProgress: 31, projectStart: "May 2",   projectEnd: "Nov 30, 2026", contractValue: 210000, paid: 63000, status: "Active",    phone: "0722 200 300", siteManager: "Andrei Moldovan", documents: "Contract · 2 invoices · Specs", lastUpdate: "Jun 4, 2026" },
  { id: "c3", initials: "DR", name: "Dan & Roxana Ionescu",  type: "Residential", city: "Cluj-Napoca", projectTitle: "Living Room + Office",            projectProgress: 0,  projectStart: "—",       projectEnd: "—",            contractValue: 42000, paid: 0,     status: "Review",    phone: "0723 300 400", siteManager: "—",             documents: "Quote sent",            lastUpdate: "Jun 2, 2026", pendingNote: "Quote sent · Awaiting approval" },
  { id: "c4", initials: "HT", name: "Hotel Transilvania SA", type: "Commercial",  city: "Brașov",      projectTitle: "Lobby & Reception Renovation",   projectProgress: 88, projectStart: "Feb 15",  projectEnd: "Jun 20, 2026", contractValue: 96000, paid: 80000, status: "Active",    phone: "0724 400 500", siteManager: "Radu Dima",    documents: "Contract · 4 invoices · Plans", lastUpdate: "Jun 5, 2026" },
  { id: "c5", initials: "AC", name: "Andrei Constantin",     type: "Residential", city: "Timișoara",   projectTitle: "Bathroom Renovation",            projectProgress: 0,  projectStart: "—",       projectEnd: "—",            contractValue: 14000, paid: 0,     status: "Pending",   phone: "0725 500 600", siteManager: "—",             documents: "—",                     lastUpdate: "Jun 1, 2026", pendingNote: "Site visit scheduled · Jun 10" },
  { id: "c6", initials: "VD", name: "Vasile & Doina Marin",  type: "Residential", city: "Cluj-Napoca", projectTitle: "Kitchen Renovation",             projectProgress: 100, projectStart: "Mar 1",  projectEnd: "May 15, 2026", contractValue: 28600, paid: 28600, status: "Completed", phone: "0726 600 700", siteManager: "Ion Crișan",  documents: "Contract · 4 invoices", lastUpdate: "May 15, 2026" },
  { id: "c7", initials: "PG", name: "Petra & George Lungu",  type: "Residential", city: "Cluj-Napoca", projectTitle: "Master Bedroom + Bathroom",       projectProgress: 0,  projectStart: "—",       projectEnd: "—",            contractValue: 22000, paid: 0,     status: "Pending",   phone: "0727 700 800", siteManager: "—",             documents: "—",                     lastUpdate: "May 30, 2026", pendingNote: "Initial consultation done" },
  { id: "c8", initials: "OM", name: "Office Max SRL",        type: "Commercial",  city: "Cluj-Napoca", projectTitle: "Open Space Renovation",          projectProgress: 52, projectStart: "Apr 20",  projectEnd: "Aug 10, 2026", contractValue: 67000, paid: 34000, status: "Active",    phone: "0728 800 900", siteManager: "Sorin Florea", documents: "Contract · 3 invoices · Plans", lastUpdate: "Jun 3, 2026" },
]

const ACTIVITY: ActivityEntry[] = [
  { id: "a1", title: "Invoice #2041 paid",          detail: "Hotel Transilvania SA · €24,000 · Jun 5", color: "rgba(48,209,88,0.90)"  },
  { id: "a2", title: "Quote approved",              detail: "SC Invest-Imob SRL · €210,000 · Jun 4",   color: "rgba(10,132,255,0.90)" },
  { id: "a3", title: "Progress photos uploaded",    detail: "Mihai & Elena Popescu · 14 photos · Jun 3", color: "rgba(255,255,255,0.35)" },
  { id: "a4", title: "Quote sent",                  detail: "Dan & Roxana Ionescu · €42,000 · Jun 2",  color: "rgba(255,159,10,0.90)" },
  { id: "a5", title: "Contract signed",             detail: "Office Max SRL · €67,000 · Apr 20",       color: "rgba(48,209,88,0.90)"  },
]

// ── Tokens ────────────────────────────────────────────────────────────────────

const g1  = "var(--prv-g1)"
const g2  = "var(--prv-g2)"
const bds = "var(--prv-border-subtle)"
const bd  = "var(--prv-border)"
const t1  = "var(--prv-text-1)"
const t2  = "var(--prv-text-2)"
const t3  = "var(--prv-text-3)"

const green  = "rgba(48,209,88,0.90)"
const greenBg = "rgba(48,209,88,0.12)"
const blue   = "rgba(10,132,255,0.90)"
const blueBg = "rgba(10,132,255,0.12)"
const amber  = "rgba(255,159,10,0.95)"
const amberBg = "rgba(255,159,10,0.15)"

// ── Helpers ───────────────────────────────────────────────────────────────────

function Specular() {
  return <div style={{ position: "absolute", inset: "0 0 auto", height: 1, background: `linear-gradient(90deg,transparent,${bd},transparent)` }} />
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 4, background: bd, borderRadius: 2, overflow: "hidden", marginTop: 6 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: t2, borderRadius: 2 }} />
    </div>
  )
}

const STATUS_STYLE: Record<ClientStatus, { bg: string; color: string; avatarBg: string; avatarColor: string }> = {
  Active:    { bg: greenBg, color: green,  avatarBg: g2,                         avatarColor: t1    },
  Pending:   { bg: amberBg, color: amber,  avatarBg: "rgba(255,159,10,0.10)",    avatarColor: amber },
  Review:    { bg: blueBg,  color: blue,   avatarBg: "rgba(10,132,255,0.10)",    avatarColor: blue  },
  Completed: { bg: bds,     color: t3,     avatarBg: g1,                         avatarColor: t3    },
}

function StatusPill({ status }: { status: ClientStatus }) {
  const s = STATUS_STYLE[status]
  const label = status === "Review" ? "Review" : status
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: s.bg, color: s.color, whiteSpace: "nowrap", flexShrink: 0 }}>
      {label}
    </span>
  )
}

// ── Client detail sheet ───────────────────────────────────────────────────────

function ClientDetail({ client, onClose }: { client: Client; onClose: () => void }) {
  const remaining = client.contractValue - client.paid

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 480, background: g2, border: `1px solid ${bd}`, borderRadius: "28px 28px 0 0", overflow: "hidden", position: "relative", paddingBottom: 36 }}>
        <Specular />
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 6 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: bd }} />
        </div>

        <div style={{ padding: "0 20px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 15, background: STATUS_STYLE[client.status].avatarBg, border: `1px solid ${bd}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16, fontWeight: 700, color: STATUS_STYLE[client.status].avatarColor, letterSpacing: "0.02em" }}>
              {client.initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: t3, marginBottom: 3 }}>{client.type} · {client.city}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: t1, marginBottom: 4 }}>{client.name}</div>
              <StatusPill status={client.status} />
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", background: g1, border: `1px solid ${bds}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, marginTop: 2 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={t3} strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* Pending note */}
          {client.pendingNote && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: amberBg, border: `1px solid rgba(255,159,10,0.25)`, marginBottom: 14 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={amber} strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span style={{ fontSize: 12, color: amber }}>{client.pendingNote}</span>
            </div>
          )}

          {/* Project progress */}
          {client.status !== "Pending" && client.projectProgress > 0 && (
            <div style={{ padding: 14, borderRadius: 14, background: g1, border: `1px solid ${bds}`, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: t1 }}>{client.projectTitle}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: t1 }}>{client.projectProgress}%</span>
              </div>
              <div style={{ height: 6, background: bds, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${client.projectProgress}%`, background: t2, borderRadius: 3 }} />
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                <span style={{ fontSize: 11, color: t3 }}>Started: {client.projectStart}</span>
                <span style={{ fontSize: 11, color: t3 }}>Est. finish: {client.projectEnd}</span>
              </div>
            </div>
          )}

          {/* Finance cards */}
          {client.contractValue > 0 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {[
                { val: `€${(client.contractValue / 1000).toFixed(0)}k`, lbl: "Contract"  },
                { val: `€${(client.paid / 1000).toFixed(0)}k`,          lbl: "Paid"      },
                { val: `€${(remaining / 1000).toFixed(0)}k`,            lbl: "Remaining" },
              ].map(m => (
                <div key={m.lbl} style={{ flex: 1, padding: "10px 6px", borderRadius: 12, background: g1, border: `1px solid ${bds}`, textAlign: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: t1, marginBottom: 2 }}>{m.val}</div>
                  <div style={{ fontSize: 9, color: t3 }}>{m.lbl}</div>
                </div>
              ))}
            </div>
          )}

          {/* Info rows */}
          <div style={{ background: g1, border: `1px solid ${bds}`, borderRadius: 16, padding: "0 14px", marginBottom: 16 }}>
            {[
              { label: "Contact",      val: client.phone },
              { label: "Site manager", val: client.siteManager },
              { label: "Documents",    val: client.documents },
              { label: "Last update",  val: client.lastUpdate },
            ].map((r, i, arr) => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < arr.length - 1 ? `1px solid ${bds}` : "none" }}>
                <span style={{ fontSize: 13, color: t3 }}>{r.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: t1 }}>{r.val}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ flex: 1, padding: "13px", borderRadius: 14, background: g2, border: `1px solid ${bd}`, color: t1, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              View Project
            </button>
            <button style={{ flex: 1, padding: "13px", borderRadius: 14, background: t1, border: "none", color: "var(--prv-bg)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              {client.status === "Review" ? "Send Quote" : client.status === "Pending" ? "Schedule Visit" : "Send Update"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ClientsWorkspace() {
  const [filter, setFilter] = useState<FilterType>("All")
  const [search, setSearch]  = useState("")
  const [selected, setSelected] = useState<Client | null>(null)

  const FILTERS: FilterType[] = ["All", "Active", "Pending", "Completed"]

  const filtered = CLIENTS.filter(c => {
    const matchFilter =
      filter === "All"       ||
      (filter === "Active"    && c.status === "Active") ||
      (filter === "Pending"   && (c.status === "Pending" || c.status === "Review")) ||
      (filter === "Completed" && c.status === "Completed")
    const q = search.toLowerCase()
    const matchSearch = !search || c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q) || c.projectTitle.toLowerCase().includes(q)
    return matchFilter && matchSearch
  })

  const totalValue = CLIENTS.reduce((s, c) => s + c.contractValue, 0)
  const activeCount = CLIENTS.filter(c => c.status === "Active").length
  const pendingCount = CLIENTS.filter(c => c.status === "Pending" || c.status === "Review").length

  const showActivity = filter === "All" && !search

  return (
    <div style={{ paddingBottom: 120 }}>

      {/* ── Header ── */}
      <div style={{ padding: "6px 16px 4px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: t1 }}>Client Portal</h1>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: g1, border: `1px solid ${bds}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t2} strokeWidth="1.7" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
        </div>
        <p style={{ fontSize: 14, color: t2 }}>{CLIENTS.length} clients · {activeCount} active projects</p>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "flex", gap: 8, padding: "16px 16px 0" }}>
        {[
          { val: String(CLIENTS.length), lbl: "Clients"  },
          { val: String(activeCount),    lbl: "Active"   },
          { val: String(pendingCount),   lbl: "Pending", color: pendingCount > 0 ? amber : t1 },
          { val: `€${(totalValue / 1000000).toFixed(1)}M`, lbl: "Total" },
        ].map(s => (
          <div key={s.lbl} style={{ flex: 1, padding: "12px 8px", borderRadius: 14, background: g1, border: `1px solid ${bds}`, textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: s.color ?? t1, marginBottom: 2 }}>{s.val}</div>
            <div style={{ fontSize: 10, color: t3 }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 14, background: "rgba(255,255,255,0.07)", border: `1px solid ${bds}`, margin: "14px 16px 0" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t3} strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients, projects, cities…" style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 14, color: t1, fontFamily: "inherit" }} />
      </div>

      {/* ── Filter ── */}
      <div style={{ display: "flex", gap: 4, padding: "3px", background: g1, borderRadius: 10, margin: "12px 16px 0" }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ flex: 1, padding: "6px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, color: filter === f ? t1 : t3, background: filter === f ? g2 : "transparent", border: "none", cursor: "pointer", transition: "all 0.15s" }}>
            {f}
          </button>
        ))}
      </div>

      {/* ── Client list ── */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: t3, marginBottom: 12 }}>
          {filter === "All" ? "All Clients" : `${filter} Clients`}
        </div>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: t3, fontSize: 14 }}>No clients found</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
            {filtered.map(c => (
              <div key={c.id} onClick={() => setSelected(c)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", borderRadius: 16, background: g1, border: `1px solid ${c.status === "Review" ? "rgba(10,132,255,0.22)" : bds}`, cursor: "pointer", position: "relative" }}>
                <Specular />
                <div style={{ width: 44, height: 44, borderRadius: 13, background: STATUS_STYLE[c.status].avatarBg, border: `1px solid ${bd}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, fontWeight: 700, color: STATUS_STYLE[c.status].avatarColor, letterSpacing: "0.02em" }}>
                  {c.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: c.status === "Completed" ? t2 : t1, marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: t3, marginBottom: c.pendingNote ? 2 : 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.projectTitle} · {c.city}</div>
                  {c.pendingNote && <div style={{ fontSize: 11, color: c.status === "Review" ? blue : amber, marginTop: 1 }}>{c.pendingNote}</div>}
                  {c.status === "Active" && c.projectProgress > 0 && (
                    <>
                      <ProgressBar pct={c.projectProgress} />
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                        <div style={{ fontSize: 11, color: t3 }}>{c.projectProgress}% complete</div>
                        <div style={{ fontSize: 11, color: t3 }}>€{(c.contractValue / 1000).toFixed(0)}k</div>
                      </div>
                    </>
                  )}
                  {c.status === "Completed" && (
                    <div style={{ fontSize: 12, color: t3, marginTop: 1 }}>€{c.contractValue.toLocaleString()} · Paid in full</div>
                  )}
                </div>
                <StatusPill status={c.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Recent Activity ── */}
      {showActivity && (
        <div style={{ padding: "24px 16px 0" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: t3, marginBottom: 12 }}>Recent Activity</div>
          <div style={{ padding: "14px 16px", borderRadius: 16, background: g1, border: `1px solid ${bds}`, position: "relative" }}>
            <Specular />
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 0 }}>
              {ACTIVITY.map((a, i) => (
                <div key={a.id} style={{ display: "flex", gap: 12, paddingBottom: i < ACTIVITY.length - 1 ? 14 : 0 }}>
                  <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: a.color, flexShrink: 0, marginTop: 3 }} />
                    {i < ACTIVITY.length - 1 && <div style={{ width: 1, flex: 1, background: bds, margin: "3px 0 0 0", minHeight: 20 }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: i < ACTIVITY.length - 1 ? 0 : 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: t1, marginBottom: 1 }}>{a.title}</div>
                    <div style={{ fontSize: 12, color: t3 }}>{a.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Detail sheet ── */}
      {selected && <ClientDetail client={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
