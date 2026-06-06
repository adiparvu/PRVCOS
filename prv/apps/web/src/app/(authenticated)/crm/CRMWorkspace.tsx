"use client"

import { useState } from "react"
import {
  GlassSegmentedControl,
  GlassTabs,
  GlassTimeline,
  GlassKanban,
  type SegmentItem,
  type TabItem,
  type TimelineEntry,
  type KanbanColumn,
} from "@prv/ui"

// ── Types ─────────────────────────────────────────────────────────────────────

type ClientStatus = "vip" | "active" | "lead" | "cold"

interface Client {
  id: string
  initials: string
  name: string
  email: string
  phone: string
  location: string
  sub: string
  value: string
  ltv: number
  status: ClientStatus
  projects: number
  nps: number
  openQuotes: number
  since: string
  timeline: TimelineEntry[]
}

// ── Static data ───────────────────────────────────────────────────────────────

const FILTER_ITEMS: SegmentItem[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "lead", label: "Leads" },
  { id: "vip", label: "VIP" },
]

const DETAIL_TABS: TabItem[] = [
  { value: "overview", label: "Overview" },
  { value: "activity", label: "Activity" },
  { value: "projects", label: "Projects" },
  { value: "documents", label: "Documents" },
]

const STATUS_STYLE: Record<ClientStatus, { bg: string; color: string; label: string }> = {
  vip: { bg: "rgba(255,159,10,0.15)", color: "rgba(255,159,10,0.95)", label: "VIP" },
  active: { bg: "rgba(48,209,88,0.14)", color: "rgba(48,209,88,0.95)", label: "Active" },
  lead: { bg: "rgba(10,132,255,0.14)", color: "rgba(10,132,255,0.90)", label: "Lead" },
  cold: { bg: "var(--prv-border-subtle)", color: "var(--prv-text-3)", label: "Cold" },
}

const CLIENTS: Client[] = [
  {
    id: "c1",
    initials: "MP",
    name: "Mihai Popescu",
    email: "mihai.popescu@gmail.com",
    phone: "0740 123 456",
    location: "Cluj",
    sub: "3 projects · Cluj",
    value: "€42,800",
    ltv: 42800,
    status: "vip",
    projects: 3,
    nps: 8.9,
    openQuotes: 1,
    since: "2024",
    timeline: [
      {
        id: "t1",
        type: "success",
        title: "Invoice #1042 paid — €298",
        description: "Cluj · Main project",
        timestamp: "2 min ago",
      },
      {
        id: "t2",
        type: "info",
        title: "Message from Andrei P.",
        description: '"Tiles arrive Thursday, on track"',
        timestamp: "1 hr ago",
      },
      {
        id: "t3",
        type: "info",
        title: "Site visit scheduled",
        description: "Jun 14 · 10:00 · Mănăștur",
        timestamp: "Yesterday",
      },
      {
        id: "t4",
        type: "success",
        title: "Contract signed · €18,400",
        description: "Renovare Apartament project",
        timestamp: "May 10",
      },
      {
        id: "t5",
        type: "warning",
        title: "New quote sent — €24,400",
        description: "Kitchen renovation · Pending",
        timestamp: "Jun 1",
      },
    ],
  },
  {
    id: "c2",
    initials: "AG",
    name: "Andronic Group SRL",
    email: "office@andronic.ro",
    phone: "0264 456 789",
    location: "București",
    sub: "1 active project · București",
    value: "€67,000",
    ltv: 67000,
    status: "active",
    projects: 1,
    nps: 7.4,
    openQuotes: 0,
    since: "2025",
    timeline: [
      {
        id: "t1",
        type: "info",
        title: "Progress report sent",
        description: "Spațiu Comercial · 28% done",
        timestamp: "Today",
      },
      {
        id: "t2",
        type: "success",
        title: "Phase 1 completed",
        description: "Permits & Planning",
        timestamp: "May 20",
      },
      {
        id: "t3",
        type: "success",
        title: "Contract signed · €67,000",
        description: "Spațiu Comercial · Brașov",
        timestamp: "Apr 30",
      },
    ],
  },
  {
    id: "c3",
    initials: "AI",
    name: "Ana Ionescu",
    email: "ana.ionescu@yahoo.com",
    phone: "0722 987 654",
    location: "Timișoara",
    sub: "Quote sent · Timișoara",
    value: "€24,200",
    ltv: 24200,
    status: "lead",
    projects: 0,
    nps: 0,
    openQuotes: 1,
    since: "2026",
    timeline: [
      {
        id: "t1",
        type: "warning",
        title: "Quote #Q-042 sent",
        description: "€24,200 · Kitchen + Living",
        timestamp: "Jun 1",
      },
      {
        id: "t2",
        type: "info",
        title: "Initial consultation",
        description: "Timișoara office · 1h",
        timestamp: "May 28",
      },
      {
        id: "t3",
        type: "info",
        title: "Lead created via website",
        description: "Contact form submission",
        timestamp: "May 24",
      },
    ],
  },
  {
    id: "c4",
    initials: "BC",
    name: "Biroul Construct SRL",
    email: "contact@birouconstruct.ro",
    phone: "0268 321 654",
    location: "Brașov",
    sub: "2 projects · Brașov",
    value: "€31,400",
    ltv: 31400,
    status: "active",
    projects: 2,
    nps: 8.1,
    openQuotes: 0,
    since: "2024",
    timeline: [
      {
        id: "t1",
        type: "success",
        title: "Invoice #1038 paid — €4,200",
        description: "Office renovation · final",
        timestamp: "Jun 3",
      },
      {
        id: "t2",
        type: "info",
        title: "New project started",
        description: "Warehouse fit-out · €22K",
        timestamp: "May 15",
      },
    ],
  },
  {
    id: "c5",
    initials: "RN",
    name: "Radu Niculescu",
    email: "radu.n@gmail.com",
    phone: "0755 111 222",
    location: "Iași",
    sub: "Last contact: 3 months ago",
    value: "€8,600",
    ltv: 8600,
    status: "cold",
    projects: 1,
    nps: 6.5,
    openQuotes: 0,
    since: "2024",
    timeline: [
      {
        id: "t1",
        type: "info",
        title: "Project completed",
        description: "Pardoseli · Iași Copou",
        timestamp: "Mar 3",
      },
      {
        id: "t2",
        type: "success",
        title: "Final invoice paid · €9,600",
        description: "Closed",
        timestamp: "Mar 5",
      },
    ],
  },
]

const PIPELINE_COLS: KanbanColumn[] = [
  {
    id: "lead",
    title: "Lead",
    color: "var(--prv-text-2)",
    cards: [
      { id: "k1", title: "Familia Dinu", data: { value: "€14,000", sub: "Kitchen" } },
      { id: "k2", title: "Cosmin Vlad", data: { value: "€8,500", sub: "Bathroom" } },
    ],
  },
  {
    id: "proposal",
    title: "Proposal",
    color: "rgba(10,132,255,0.9)",
    cards: [
      { id: "k3", title: "Ana Ionescu", data: { value: "€24,200", sub: "Full Reno" } },
      { id: "k4", title: "SC Modern SRL", data: { value: "€38,000", sub: "Office" } },
    ],
  },
  {
    id: "negotiation",
    title: "Negotiation",
    color: "rgba(255,159,10,0.95)",
    cards: [{ id: "k5", title: "Horia Munteanu", data: { value: "€19,500", sub: "Apartment" } }],
  },
  {
    id: "won",
    title: "Won",
    color: "rgba(48,209,88,0.95)",
    cards: [
      { id: "k6", title: "Mihai Popescu", data: { value: "€18,400", sub: "Active" } },
      { id: "k7", title: "Andronic Group", data: { value: "€67,000", sub: "Active" } },
    ],
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

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
            <p className="text-[12px] text-white/35 mt-1">
              {client.email} · {client.phone}
            </p>
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
              v: client.nps > 0 ? String(client.nps) : "—",
              l: "NPS",
              color: "rgba(10,132,255,0.9)",
            },
            { v: String(client.openQuotes), l: "Quotes", color: "rgba(255,159,10,0.95)" },
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
            {client.nps > 0 && (
              <>
                {" "}
                NPS score: <span className="text-white/90 font-semibold">{client.nps}/10</span>.
              </>
            )}
            {client.openQuotes > 0 && (
              <>
                {" "}
                <span className="text-white/90 font-semibold">
                  {client.openQuotes} open quote
                </span>{" "}
                awaiting response.
              </>
            )}
          </p>
        </GlassCard>
      )}

      {tab === "activity" && (
        <GlassCard>
          <div className="p-3">
            <GlassTimeline entries={client.timeline} compact />
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
          <div className="py-10 text-center text-white/35 text-[14px]">
            Documents module coming soon.
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
  const [pipeline, setPipeline] = useState(PIPELINE_COLS)

  const filtered = CLIENTS.filter((c) => {
    if (filter === "all") return true
    if (filter === "vip") return c.status === "vip"
    if (filter === "active") return c.status === "active" || c.status === "vip"
    if (filter === "lead") return c.status === "lead"
    return true
  })

  const totalLTV = CLIENTS.reduce((s, c) => s + c.ltv, 0)

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
          { v: String(CLIENTS.length), l: "Clients", c: "var(--prv-text-1)" },
          {
            v: String(CLIENTS.filter((c) => c.status === "lead").length),
            l: "Leads",
            c: "rgba(10,132,255,0.9)",
          },
          {
            v: String(CLIENTS.reduce((s, c) => s + c.openQuotes, 0)),
            l: "Proposals",
            c: "rgba(255,159,10,0.95)",
          },
          { v: `€${(totalLTV / 1000).toFixed(0)}K`, l: "LTV", c: "rgba(48,209,88,0.95)" },
        ].map(({ v, l, c }) => (
          <div
            key={l}
            className="py-3 rounded-[14px] text-center"
            style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
          >
            <p className="text-[18px] font-bold" style={{ color: c }}>
              {v}
            </p>
            <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mt-1">
              {l}
            </p>
          </div>
        ))}
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
        {filtered.map((client) => {
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
              <div className="text-right shrink-0">
                <p className="text-[14px] font-bold text-white/90">{client.value}</p>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px] mt-1 inline-block"
                  style={{ background: s.bg, color: s.color }}
                >
                  {s.label}
                </span>
              </div>
            </button>
          )
        })}
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
