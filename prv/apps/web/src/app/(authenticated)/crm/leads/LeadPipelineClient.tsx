"use client"
import { useRouter } from "next/navigation"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useLeads } from "@/lib/api-hooks"
import {
  GlassKanban,
  GlassSegmentedControl,
  StandardSheet,
  GlassTimeline,
  type KanbanColumn,
  type KanbanCard,
  type SegmentItem,
  type TimelineEntry,
} from "@prv/ui"

// ── Types ─────────────────────────────────────────────────────────────────────

type LeadStage = "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost"
type LeadSource = "website" | "referral" | "cold_call" | "social" | "event" | "partner"

interface Lead {
  id: string
  name: string
  company?: string
  email: string
  phone: string
  source: LeadSource
  stage: LeadStage
  score: number
  estimatedValue: number
  assignedTo: string
  lastActivity: string
  createdAt: string
  notes?: string
}

// ── Static data ───────────────────────────────────────────────────────────────

const LEADS: Lead[] = [
  {
    id: "l1",
    name: "Familia Dinu",
    email: "dinu.alex@gmail.com",
    phone: "0740 111 222",
    source: "website",
    stage: "new",
    score: 42,
    estimatedValue: 14000,
    assignedTo: "Andrei P.",
    lastActivity: "2 hours",
    createdAt: "2026-06-05",
    notes: "Interested in full kitchen renovation. Has budget confirmed.",
  },
  {
    id: "l2",
    name: "Cosmin Vlad",
    email: "cosmin.vlad@yahoo.com",
    phone: "0755 333 444",
    source: "referral",
    stage: "new",
    score: 31,
    estimatedValue: 8500,
    assignedTo: "Maria S.",
    lastActivity: "1 zi",
    createdAt: "2026-06-04",
    notes: "Bathroom renovation. Referred by Mihai Popescu.",
  },
  {
    id: "l3",
    name: "Elena Marinescu",
    email: "elena.m@gmail.com",
    phone: "0722 555 666",
    source: "social",
    stage: "contacted",
    score: 58,
    estimatedValue: 21000,
    assignedTo: "Andrei P.",
    lastActivity: "3 hours",
    createdAt: "2026-06-01",
    notes: "Full apartment renovation. Very responsive on Instagram DMs.",
  },
  {
    id: "l4",
    name: "TechHub Cluj SRL",
    company: "TechHub Cluj SRL",
    email: "office@techhub.ro",
    phone: "0264 777 888",
    source: "event",
    stage: "contacted",
    score: 71,
    estimatedValue: 55000,
    assignedTo: "Ion D.",
    lastActivity: "5 hours",
    createdAt: "2026-05-28",
    notes: "Office fitout. Met at Cluj Business Forum. High potential.",
  },
  {
    id: "l5",
    name: "Victor Stanciu",
    email: "v.stanciu@gmail.com",
    phone: "0733 999 000",
    source: "website",
    stage: "qualified",
    score: 76,
    estimatedValue: 32000,
    assignedTo: "Maria S.",
    lastActivity: "1 hour",
    createdAt: "2026-05-20",
    notes: "Penthouse renovation. Budget confirmed €30-35K. Very motivated.",
  },
  {
    id: "l6",
    name: "Andrei Florescu",
    company: "Florescu & Partners",
    email: "a.florescu@fp.ro",
    phone: "0744 222 333",
    source: "partner",
    stage: "qualified",
    score: 84,
    estimatedValue: 78000,
    assignedTo: "Ion D.",
    lastActivity: "30 min",
    createdAt: "2026-05-15",
    notes: "Commercial space renovation. Decision maker confirmed. Q3 start.",
  },
  {
    id: "l7",
    name: "Ana Ionescu",
    email: "ana.ionescu@yahoo.com",
    phone: "0722 987 654",
    source: "website",
    stage: "proposal",
    score: 88,
    estimatedValue: 24200,
    assignedTo: "Andrei P.",
    lastActivity: "2 days",
    createdAt: "2026-05-10",
    notes: "Kitchen + living renovation. Quote #Q-042 sent. Awaiting decision.",
  },
  {
    id: "l8",
    name: "SC Modern SRL",
    company: "SC Modern SRL",
    email: "contact@modern.ro",
    phone: "0265 444 555",
    source: "cold_call",
    stage: "proposal",
    score: 65,
    estimatedValue: 38000,
    assignedTo: "Maria S.",
    lastActivity: "3 days",
    createdAt: "2026-05-08",
    notes: "Office renovation proposal sent. Awaiting board approval.",
  },
  {
    id: "l9",
    name: "Horia Munteanu",
    email: "horia.m@gmail.com",
    phone: "0766 111 999",
    source: "referral",
    stage: "negotiation",
    score: 91,
    estimatedValue: 19500,
    assignedTo: "Ion D.",
    lastActivity: "1 hour",
    createdAt: "2026-04-28",
    notes: "Apartment renovation. Price negotiation in progress. Close to deal.",
  },
]

const SOURCE_LABELS: Record<LeadSource, string> = {
  website: "Website",
  referral: "Referral",
  cold_call: "Cold Call",
  social: "Social",
  event: "Event",
  partner: "Partner",
}

const VIEW_ITEMS: SegmentItem[] = [
  { id: "pipeline", label: "Pipeline" },
  { id: "list", label: "List" },
]

const LEAD_TIMELINE: Record<string, TimelineEntry[]> = {
  l7: [
    { id: "t1", type: "warning", title: "Quote #Q-042 sent — €24,200", timestamp: "Jun 1" },
    { id: "t2", type: "info", title: "Initial consultation — 1h", timestamp: "May 28" },
    { id: "t3", type: "info", title: "Lead created via website", timestamp: "May 24" },
  ],
  l9: [
    { id: "t1", type: "warning", title: "Price negotiation started", timestamp: "Jun 5" },
    { id: "t2", type: "success", title: "Proposal accepted in principle", timestamp: "May 30" },
    { id: "t3", type: "info", title: "Site visit completed", timestamp: "May 15" },
    { id: "t4", type: "info", title: "Lead qualified", timestamp: "May 10" },
  ],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 85) return "rgba(48,209,88,0.95)"
  if (score >= 70) return "rgba(255,159,10,0.95)"
  if (score >= 50) return "rgba(10,132,255,0.9)"
  return "var(--prv-text-3)"
}

function scoreBg(score: number): string {
  if (score >= 85) return "rgba(48,209,88,0.12)"
  if (score >= 70) return "rgba(255,159,10,0.12)"
  if (score >= 50) return "rgba(10,132,255,0.10)"
  return "rgba(255,255,255,0.06)"
}

function scoreLabel(score: number): string {
  if (score >= 85) return "Hot"
  if (score >= 70) return "Warm"
  if (score >= 50) return "Lukewarm"
  return "Cold"
}

function stageColor(stage: LeadStage): string {
  const map: Record<LeadStage, string> = {
    new: "var(--prv-text-2)",
    contacted: "rgba(10,132,255,0.9)",
    qualified: "rgba(100,160,255,0.95)",
    proposal: "rgba(255,159,10,0.95)",
    negotiation: "rgba(255,214,10,0.95)",
    won: "rgba(48,209,88,0.95)",
    lost: "rgba(255,69,58,0.9)",
  }
  return map[stage]
}

function buildPipelineCols(leads: Lead[]): KanbanColumn[] {
  const stages: Array<{ id: LeadStage; title: string }> = [
    { id: "new", title: "New Lead" },
    { id: "contacted", title: "Contacted" },
    { id: "qualified", title: "Qualified" },
    { id: "proposal", title: "Proposal" },
    { id: "negotiation", title: "Negotiation" },
  ]

  return stages.map((s) => ({
    id: s.id,
    title: s.title,
    color: stageColor(s.id),
    cards: leads
      .filter((l) => l.stage === s.id)
      .map((l) => ({
        id: l.id,
        title: l.name,
        data: l,
      })),
  }))
}

// ── Lead Detail Sheet ──────────────────────────────────────────────────────────

function LeadDetailSheet({
  lead,
  onClose,
  onConvert,
}: {
  lead: Lead
  onClose: () => void
  onConvert: (id: string) => void
}) {
  const timeline = LEAD_TIMELINE[lead.id] ?? []
  const sc = scoreColor(lead.score)
  const sb = scoreBg(lead.score)

  return (
    <StandardSheet open onClose={onClose} title={lead.name}>
      {/* Score + value hero */}
      <div
        className="mx-4 mb-4 p-4 rounded-[16px]"
        style={{ background: "var(--prv-g2)", border: "1px solid var(--prv-border-subtle)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[22px] font-bold text-white/90">
              €{lead.estimatedValue.toLocaleString()}
            </p>
            <p className="text-[12px] text-white/35 mt-0.5">Estimated Value</p>
          </div>
          <div className="text-right">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px]"
              style={{ background: sb, border: `1px solid ${sc}33` }}
            >
              <span className="text-[20px] font-bold" style={{ color: sc }}>
                {lead.score}
              </span>
              <div>
                <p className="text-[11px] font-bold" style={{ color: sc }}>
                  {scoreLabel(lead.score)}
                </p>
                <p className="text-[10px] text-white/35">Lead Score</p>
              </div>
            </div>
          </div>
        </div>

        {/* Score bar */}
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${lead.score}%`, background: sc }}
          />
        </div>
      </div>

      {/* Contact info */}
      <div
        className="mx-4 mb-3 rounded-[16px] overflow-hidden"
        style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
      >
        {[
          {
            icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
            val: lead.email,
          },
          {
            icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
            val: lead.phone,
          },
          {
            icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
            val: `${SOURCE_LABELS[lead.source]} · ${lead.assignedTo}`,
          },
        ].map(({ icon, val }, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: i < 2 ? "1px solid var(--prv-border-subtle)" : undefined }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--prv-text-3)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={icon} />
            </svg>
            <span className="text-[13px] text-white/65">{val}</span>
          </div>
        ))}
      </div>

      {/* Notes */}
      {lead.notes && (
        <div
          className="mx-4 mb-3 p-3.5 rounded-[16px]"
          style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
        >
          <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mb-2">
            Notes
          </p>
          <p className="text-[13px] text-white/65 leading-relaxed">{lead.notes}</p>
        </div>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <div className="mx-4 mb-3">
          <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mb-2.5">
            Activity
          </p>
          <div
            className="rounded-[16px] overflow-hidden"
            style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
          >
            <div className="p-3">
              <GlassTimeline entries={timeline} compact />
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mx-4 mb-2 flex flex-col gap-2.5">
        <button
          onClick={() => onConvert(lead.id)}
          className="w-full py-3.5 rounded-[14px] text-[14px] font-bold tracking-tight"
          style={{
            background: "rgba(48,209,88,0.15)",
            border: "1px solid rgba(48,209,88,0.3)",
            color: "rgba(48,209,88,0.95)",
          }}
        >
          Convert to Client
        </button>
        <button
          className="w-full py-3.5 rounded-[14px] text-[14px] font-semibold"
          style={{
            background: "var(--prv-g2)",
            border: "1px solid var(--prv-border-subtle)",
            color: "var(--prv-text-1)",
          }}
        >
          Request Approval
        </button>
      </div>
    </StandardSheet>
  )
}

// ── Lead List Item ─────────────────────────────────────────────────────────────

function LeadListItem({ lead, onSelect }: { lead: Lead; onSelect: (l: Lead) => void }) {
  const sc = scoreColor(lead.score)
  const sb = scoreBg(lead.score)
  return (
    <button
      onClick={() => onSelect(lead)}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      style={{ borderBottom: "1px solid var(--prv-border-subtle)" }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold text-white/70 shrink-0"
        style={{ background: "var(--prv-g2)" }}
      >
        {lead.name.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-white/90 truncate">{lead.name}</p>
        <p className="text-[12px] text-white/35 mt-0.5">
          {SOURCE_LABELS[lead.source]} · {lead.lastActivity}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[14px] font-bold text-white/90">
          €{(lead.estimatedValue / 1000).toFixed(0)}K
        </p>
        <div
          className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[11px] font-bold"
          style={{ background: sb, color: sc }}
        >
          {lead.score} · {scoreLabel(lead.score)}
        </div>
      </div>
    </button>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function LeadPipelineClient() {
  const router = useRouter()
  const [view, setView] = useState("pipeline")
  const [leads, setLeads] = useState<Lead[]>([])
  const [selected, setSelected] = useState<Lead | null>(null)
  const [converted, setConverted] = useState<Set<string>>(new Set())
  const [synced, setSynced] = useState(false)
  const { data: leadsData } = useLeads()

  useEffect(() => {
    if (!synced && leadsData?.leads?.length) {
      const fetched = leadsData.leads as Lead[]
      setLeads(fetched)
      setPipeline(buildPipelineCols(fetched))
      setSynced(true)
    }
  }, [synced, leadsData])

  const activeLeads = leads.filter((l) => l.stage !== "won" && l.stage !== "lost")
  const hotLeads = activeLeads.filter((l) => l.score >= 70)
  const pipelineValue = activeLeads.reduce((s, l) => s + l.estimatedValue, 0)
  const proposalLeads = leads.filter((l) => l.stage === "proposal")

  const [pipeline, setPipeline] = useState<KanbanColumn[]>(() => buildPipelineCols([]))

  function handleCardMove(cardId: string, fromCol: string, toCol: string) {
    setLeads((prev) => prev.map((l) => (l.id === cardId ? { ...l, stage: toCol as LeadStage } : l)))
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

  function handleConvert(leadId: string) {
    setConverted((prev) => new Set([...prev, leadId]))
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: "won" } : l)))
    setPipeline(buildPipelineCols(leads.map((l) => (l.id === leadId ? { ...l, stage: "won" } : l))))
    setSelected(null)
  }

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <Link
            href="/crm"
            className="text-white/35 text-[13px] font-medium mb-0.5 flex items-center gap-1"
            style={{ textDecoration: "none" }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            CRM
          </Link>
          <h1 className="text-white/90 text-[26px] font-semibold tracking-tight leading-tight">
            Lead Pipeline
          </h1>
        </div>
        <button
          onClick={() => router.push("/crm/leads/new")}
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
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-2.5 mb-4">
        {[
          { v: String(activeLeads.length), l: "Active", c: "var(--prv-text-1)" },
          { v: String(hotLeads.length), l: "Hot", c: "rgba(255,159,10,0.95)" },
          { v: String(proposalLeads.length), l: "Proposal", c: "rgba(100,160,255,0.95)" },
          {
            v: `€${(pipelineValue / 1000).toFixed(0)}K`,
            l: "Pipeline",
            c: "rgba(48,209,88,0.95)",
          },
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

      {/* Converted banner */}
      {converted.size > 0 && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-[12px] mb-4 text-[13px] font-medium"
          style={{
            background: "rgba(48,209,88,0.10)",
            border: "1px solid rgba(48,209,88,0.22)",
            color: "rgba(48,209,88,0.95)",
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
            <path d="M20 6L9 17l-5-5" />
          </svg>
          {converted.size} lead{converted.size > 1 ? "s" : ""} converted to client
        </div>
      )}

      {/* View toggle */}
      <GlassSegmentedControl
        items={VIEW_ITEMS}
        activeId={view}
        onChange={setView}
        fullWidth
        className="mb-4"
      />

      {/* Pipeline view */}
      {view === "pipeline" && (
        <GlassKanban
          columns={pipeline}
          onCardMove={handleCardMove}
          renderCard={(card: KanbanCard) => {
            const lead = card.data as Lead
            const sc = scoreColor(lead.score)
            const sb = scoreBg(lead.score)
            return (
              <button onClick={() => setSelected(lead)} className="w-full text-left">
                <p className="text-[13px] font-semibold text-white/90 mb-1.5">{lead.name}</p>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] text-white/55 font-medium">
                    €{(lead.estimatedValue / 1000).toFixed(0)}K
                  </span>
                  <span
                    className="text-[11px] font-bold px-1.5 py-0.5 rounded-[5px]"
                    style={{ background: sb, color: sc }}
                  >
                    {lead.score}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-1 flex-1 rounded-full overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${lead.score}%`, background: sc }}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-white/30 mt-1.5">{lead.lastActivity}</p>
              </button>
            )
          }}
        />
      )}

      {/* List view */}
      {view === "list" && (
        <div
          className="rounded-[18px] overflow-hidden"
          style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
        >
          {activeLeads
            .sort((a, b) => b.score - a.score)
            .map((lead) => (
              <LeadListItem key={lead.id} lead={lead} onSelect={setSelected} />
            ))}
          {activeLeads.length === 0 && (
            <div className="py-12 text-center text-white/35 text-[14px]">No active leads.</div>
          )}
        </div>
      )}

      {/* Lead detail sheet */}
      {selected && (
        <LeadDetailSheet
          lead={selected}
          onClose={() => setSelected(null)}
          onConvert={handleConvert}
        />
      )}
    </div>
  )
}
