"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  GlassSegmentedControl,
  GlassTabs,
  GlassKanban,
  type SegmentItem,
  type TabItem,
  type KanbanColumn,
} from "@prv/ui"
import { useClients, useLeads } from "@/lib/api-hooks"
import type { ClientSummary } from "@/app/api/crm/clients/route"

// ── Types ─────────────────────────────────────────────────────────────────────

type ClientStatus = "vip" | "active" | "lead" | "cold"

interface Client {
  id: string
  initials: string
  name: string
  location: string
  sub: string
  value: string
  ltv: number
  status: ClientStatus
  projects: number
  nps: number | null
  health: { score: number; band: string }
  openQuotes: number
  since: string
}

// ── Static display config ─────────────────────────────────────────────────────

const HEALTH_BADGE: Record<string, { label: string; bg: string; color: string; bd: string }> = {
  vip: {
    label: "VIP",
    bg: "rgba(255,255,255,0.14)",
    color: "rgba(255,255,255,0.95)",
    bd: "rgba(255,255,255,0.24)",
  },
  healthy: {
    label: "Healthy",
    bg: "rgba(255,255,255,0.07)",
    color: "rgba(255,255,255,0.7)",
    bd: "rgba(255,255,255,0.14)",
  },
  at_risk: {
    label: "At risk",
    bg: "rgba(255,176,64,0.12)",
    color: "rgba(255,190,90,0.92)",
    bd: "rgba(255,176,64,0.3)",
  },
  dormant: {
    label: "Dormant",
    bg: "rgba(255,176,64,0.06)",
    color: "rgba(255,190,90,0.6)",
    bd: "rgba(255,176,64,0.18)",
  },
}

const FILTER_ITEMS: SegmentItem[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "lead", label: "Leads" },
  { id: "vip", label: "VIP" },
]

const DETAIL_TABS: TabItem[] = [
  { value: "overview", label: "Overview" },
  { value: "projects", label: "Projects" },
  { value: "documents", label: "Documents" },
]

const STATUS_STYLE: Record<ClientStatus, { bg: string; color: string; label: string }> = {
  vip: { bg: "rgba(255,159,10,0.15)", color: "rgba(255,159,10,0.95)", label: "VIP" },
  active: { bg: "rgba(48,209,88,0.14)", color: "rgba(48,209,88,0.95)", label: "Active" },
  lead: { bg: "rgba(10,132,255,0.14)", color: "rgba(10,132,255,0.90)", label: "Lead" },
  cold: { bg: "var(--prv-border-subtle)", color: "var(--prv-text-3)", label: "Cold" },
}

const PIPELINE_STAGE_CONFIG: Array<{ id: string; title: string; color: string }> = [
  { id: "new", title: "New Lead", color: "var(--prv-text-2)" },
  { id: "contacted", title: "Contacted", color: "rgba(10,132,255,0.9)" },
  { id: "qualified", title: "Qualified", color: "rgba(100,160,255,0.95)" },
  { id: "proposal", title: "Proposal", color: "rgba(255,159,10,0.95)" },
  { id: "negotiation", title: "Negotiation", color: "rgba(255,214,10,0.95)" },
]

function buildCols(
  pipelineData: Record<
    string,
    Array<{ id: string; name: string; estimatedValue: number; notes?: string }>
  >
): KanbanColumn[] {
  return PIPELINE_STAGE_CONFIG.map((s) => ({
    id: s.id,
    title: s.title,
    color: s.color,
    cards: (pipelineData[s.id] ?? []).map((l) => ({
      id: l.id,
      title: l.name,
      data: {
        value: `€${(l.estimatedValue / 1000).toFixed(0)}K`,
        sub: l.notes?.slice(0, 30) ?? s.title,
      },
    })),
  }))
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtLtv(ltv: number): string {
  if (ltv >= 1_000_000) return `€${(ltv / 1_000_000).toFixed(1)}M`
  if (ltv >= 1_000) return `€${(ltv / 1_000).toFixed(0)}K`
  return `€${ltv}`
}

function mapClient(c: ClientSummary): Client {
  const sub =
    c.activeProjects > 0
      ? `${c.activeProjects} project${c.activeProjects > 1 ? "s" : ""} · ${c.location}`
      : c.location
  return {
    id: c.id,
    initials: c.initials,
    name: c.name,
    location: c.location,
    sub,
    value: fmtLtv(c.ltv),
    ltv: c.ltv,
    status: c.status,
    projects: c.activeProjects,
    nps: c.nps,
    health: c.health,
    openQuotes: c.openQuotes,
    since: c.since,
  }
}

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-[18px] relative overflow-hidden ${className}`}
      style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
    >
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mx-1 mt-5 mb-2.5">
      {children}
    </p>
  )
}

// ── Client Detail ─────────────────────────────────────────────────────────────

function ClientDetail({ client, onBack }: { client: Client; onBack: () => void }) {
  const [tab, setTab] = useState("overview")
  const s = STATUS_STYLE[client.status]

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 mb-4 text-white/45 text-[13px] font-medium"
      >
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
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        CRM
      </button>

      {/* Hero */}
      <div
        className="p-4 rounded-[18px] mb-3.5 relative overflow-hidden"
        style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
      >
        <div className="flex items-center gap-4 mb-3">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-[18px] font-bold text-white/70 shrink-0"
            style={{ background: "var(--prv-g2)" }}
          >
            {client.initials}
          </div>
          <div>
            <p className="text-[19px] font-bold text-white/90 leading-tight">{client.name}</p>
            <p className="text-[12px] text-white/35 mt-1">{client.location}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap mb-4">
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-[8px]"
            style={{ background: s.bg, color: s.color }}
          >
            {s.label}
          </span>
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-[8px]"
            style={{ background: "var(--prv-g2)", color: "var(--prv-text-3)" }}
          >
            {client.location}
          </span>
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-[8px]"
            style={{ background: "var(--prv-g2)", color: "var(--prv-text-3)" }}
          >
            Client since {client.since}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { v: String(client.projects), l: "Projects", color: "var(--prv-text-1)" },
            { v: client.value, l: "LTV", color: "rgba(48,209,88,0.95)" },
            {
              v: client.nps !== null && client.nps > 0 ? String(client.nps) : "—",
              l: "NPS",
              color: "rgba(10,132,255,0.9)",
            },
            { v: String(client.openQuotes), l: "Oferte", color: "rgba(100,160,255,0.95)" },
          ].map(({ v, l, color }) => (
            <div
              key={l}
              className="py-2.5 rounded-[12px] text-center"
              style={{ background: "var(--prv-g2)" }}
            >
              <p className="text-[16px] font-bold" style={{ color }}>
                {v}
              </p>
              <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mt-0.5">
                {l}
              </p>
            </div>
          ))}
        </div>
      </div>

      <GlassTabs tabs={DETAIL_TABS} value={tab} onChange={setTab} className="mb-4" />

      {tab === "overview" && (
        <GlassCard className="p-4">
          <p className="text-[13px] text-white/65 leading-relaxed">
            {client.name} is a{" "}
            <span className="text-white/90 font-semibold">{s.label.toLowerCase()}</span> client
            based in <span className="text-white/90 font-semibold">{client.location}</span> with a
            total lifetime value of{" "}
            <span className="text-white/90 font-semibold">{client.value}</span> across{" "}
            {client.projects} project{client.projects !== 1 ? "s" : ""}.
            {client.nps !== null && client.nps > 0 && (
              <>
                {" "}
                NPS score: <span className="text-white/90 font-semibold">{client.nps}/10</span>.
              </>
            )}
            {client.openQuotes > 0 && (
              <>
                {" "}
                <Link
                  href={`/crm/quotes?clientId=${client.id}`}
                  className="font-semibold"
                  style={{ color: "#7eb8ff", textDecoration: "none" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {client.openQuotes} quote{client.openQuotes !== 1 ? "s" : ""} active
                </Link>{" "}
                pending.
              </>
            )}
          </p>
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--prv-border-subtle)" }}>
            <Link
              href={`/crm/clients/${client.id}`}
              className="text-[13px] font-semibold"
              style={{ color: "#7eb8ff", textDecoration: "none" }}
              onClick={(e) => e.stopPropagation()}
            >
              Profil complet →
            </Link>
          </div>
        </GlassCard>
      )}

      {tab === "projects" && (
        <GlassCard>
          {client.projects === 0 ? (
            <div className="py-10 text-center text-white/35 text-[14px]">No projects yet.</div>
          ) : (
            <div className="px-4 py-3">
              <p className="text-[13px] text-white/65">
                {client.projects} project{client.projects !== 1 ? "s" : ""} — view in Projects
                workspace.
              </p>
            </div>
          )}
        </GlassCard>
      )}

      {tab === "documents" && (
        <GlassCard>
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p className="text-[13px] text-white/45 leading-snug max-w-[220px]">
              Client documents are managed in the Documents module.
            </p>
            <Link
              href={`/documents?clientId=${client.id}`}
              className="text-[13px] font-semibold"
              style={{ color: "rgba(255,255,255,0.75)", textDecoration: "none" }}
              onClick={(e) => e.stopPropagation()}
            >
              Deschide Documente →
            </Link>
          </div>
        </GlassCard>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function CRMWorkspace() {
  const [filter, setFilter] = useState("all")
  const [selected, setSelected] = useState<Client | null>(null)

  const { data, isLoading } = useClients()
  const { data: leadsData } = useLeads()

  const [pipeline, setPipeline] = useState<KanbanColumn[]>(() => buildCols({}))

  // Sync pipeline from real data once loaded
  const [pipelineSynced, setPipelineSynced] = useState(false)
  if (!pipelineSynced && leadsData?.pages?.[0]?.pipeline) {
    setPipeline(buildCols(leadsData.pages[0].pipeline))
    setPipelineSynced(true)
  }

  const clients = useMemo(() => (data?.clients ?? []).map(mapClient), [data?.clients])

  const filtered = clients.filter((c) => {
    if (filter === "all") return true
    if (filter === "vip") return c.status === "vip"
    if (filter === "active") return c.status === "active" || c.status === "vip"
    if (filter === "lead") return c.status === "lead"
    return true
  })

  const totalLTV = clients.reduce((s, c) => s + c.ltv, 0)
  const totalLeads = clients.filter((c) => c.status === "lead").length
  const totalQuotes = clients.reduce((s, c) => s + c.openQuotes, 0)

  function handleCardMove(cardId: string, fromCol: string, toCol: string) {
    setPipeline((prev) => {
      const next = prev.map((col) => ({ ...col, cards: [...col.cards] }))
      const from = next.find((c) => c.id === fromCol)
      const to = next.find((c) => c.id === toCol)
      if (!from || !to) return prev
      const idx = from.cards.findIndex((c) => c.id === cardId)
      if (idx === -1) return prev
      const [card] = from.cards.splice(idx, 1)
      to.cards.push(card!)
      return next
    })
  }

  if (selected) {
    return (
      <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
        <ClientDetail client={selected} onBack={() => setSelected(null)} />
      </div>
    )
  }

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-white/35 text-[13px] font-medium mb-0.5">PRV</p>
          <h1 className="text-white/90 text-[26px] font-semibold tracking-tight leading-tight">
            CRM
          </h1>
        </div>
        <div className="flex gap-2">
          {["M21 21l-4.35-4.35M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z", "M12 5v14M5 12h14"].map(
            (path, i) => (
              <div
                key={i}
                className="w-9 h-9 rounded-[10px] flex items-center justify-center"
                style={{
                  background: "var(--prv-g1)",
                  border: "1px solid var(--prv-border-subtle)",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--prv-text-2)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d={path} />
                </svg>
              </div>
            )
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-2.5 mb-4">
        {[
          {
            v: isLoading ? "…" : String(clients.length),
            l: "Clients",
            c: "var(--prv-text-1)",
            href: "/crm/clients",
          },
          {
            v: isLoading ? "…" : String(totalLeads),
            l: "Leads",
            c: "rgba(10,132,255,0.9)",
            href: "/crm/leads",
          },
          {
            v: isLoading ? "…" : String(totalQuotes),
            l: "Oferte",
            c: "rgba(100,160,255,0.95)",
            href: "/crm/quotes",
          },
          {
            v: isLoading ? "…" : `€${(totalLTV / 1000).toFixed(0)}K`,
            l: "LTV",
            c: "rgba(48,209,88,0.95)",
            href: undefined,
          },
        ].map(({ v, l, c, href }) => {
          const inner = (
            <>
              <p className="text-[18px] font-bold" style={{ color: c }}>
                {v}
              </p>
              <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mt-1">
                {l}
              </p>
            </>
          )
          return href ? (
            <Link
              key={l}
              href={href}
              className="py-3 rounded-[14px] text-center block"
              style={{
                background: "var(--prv-g1)",
                border: "1px solid var(--prv-border-subtle)",
                textDecoration: "none",
              }}
            >
              {inner}
            </Link>
          ) : (
            <div
              key={l}
              className="py-3 rounded-[14px] text-center"
              style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
            >
              {inner}
            </div>
          )
        })}
      </div>

      {/* Filter */}
      <GlassSegmentedControl
        items={FILTER_ITEMS}
        activeId={filter}
        onChange={setFilter}
        fullWidth
        className="mb-4"
      />

      {/* Client list */}
      <GlassCard className="mb-4">
        {isLoading ? (
          <div className="py-8 text-center text-white/30 text-[13px]">Loading clients…</div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-white/30 text-[13px]">No clients found</div>
        ) : (
          filtered.map((client) => {
            const s = STATUS_STYLE[client.status]
            return (
              <button
                key={client.id}
                onClick={() => setSelected(client)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                style={{ borderBottom: "1px solid var(--prv-border-subtle)" }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white/70 shrink-0"
                  style={{ background: "var(--prv-g2)" }}
                >
                  {client.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-white/90 truncate">{client.name}</p>
                  <p className="text-[12px] text-white/35 mt-0.5 truncate">{client.sub}</p>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <p className="text-[14px] font-bold text-white/90">{client.value}</p>
                  <div className="flex items-center gap-1.5">
                    {client.openQuotes > 0 && (
                      <Link
                        href={`/crm/quotes?clientId=${client.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px]"
                        style={{
                          background: "rgba(100,160,255,0.12)",
                          border: "1px solid rgba(100,160,255,0.22)",
                          color: "#7eb8ff",
                          textDecoration: "none",
                        }}
                      >
                        {client.openQuotes} quote{client.openQuotes !== 1 ? "s" : ""}
                      </Link>
                    )}
                    {(() => {
                      const h = HEALTH_BADGE[client.health.band]
                      return h ? (
                        <span
                          title={`Health score ${client.health.score}/100`}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px]"
                          style={{ background: h.bg, color: h.color, border: `1px solid ${h.bd}` }}
                        >
                          {h.label}
                        </span>
                      ) : null
                    })()}
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px]"
                      style={{ background: s.bg, color: s.color }}
                    >
                      {s.label}
                    </span>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </GlassCard>

      {/* Pipeline */}
      <Label>Sales Pipeline</Label>
      <GlassKanban
        columns={pipeline}
        onCardMove={handleCardMove}
        renderCard={(card) => {
          const d = card.data as { value: string; sub: string }
          return (
            <div>
              <p className="text-[13px] font-semibold text-white/90 mb-1">{card.title}</p>
              <p className="text-[11px] text-white/45">
                {d.value} · {d.sub}
              </p>
            </div>
          )
        }}
      />
    </div>
  )
}
