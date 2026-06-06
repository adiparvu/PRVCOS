"use client"

import { useState } from "react"
import { GlassSegmentedControl, type SegmentItem } from "@prv/ui"

// ── Types ─────────────────────────────────────────────────────────────────────

type Urgency = "urgent" | "medium" | "low"
type ApprovalType = "expense" | "leave" | "invoice" | "overtime" | "onboarding"
type DecisionStatus = "approved" | "rejected" | "pending"

interface ApprovalItem {
  id: string
  type: ApprovalType
  title: string
  meta: string
  urgency: Urgency
  amount?: string
}

interface HistoryItem {
  id: string
  title: string
  sub: string
  status: "approved" | "rejected"
}

interface ApprovalDetail {
  type: string
  title: string
  fields: { label: string; value: string }[]
  reason: string
}

// ── Static data ───────────────────────────────────────────────────────────────

const FILTER_ITEMS: SegmentItem[] = [
  { id: "all",     label: "All (9)"   },
  { id: "urgent",  label: "Urgent (3)"},
  { id: "leave",   label: "Leave"     },
  { id: "finance", label: "Finance"   },
]

const APPROVALS: ApprovalItem[] = [
  { id: "a1", type: "expense",    title: "Expense Claim — €1,840",      meta: "Radu Dima · Procurement · 2 hr ago",               urgency: "urgent", amount: "€1,840" },
  { id: "a2", type: "leave",      title: "Leave Request — 5 days",      meta: "Maria Ionescu · HR · Jun 14–18 · Annual leave",     urgency: "urgent"                  },
  { id: "a3", type: "invoice",    title: "Invoice Approval — €5,200",   meta: "Finance · Invoice #1041 · Renovare Cluj · Due Jun 10",urgency: "urgent", amount: "€5,200" },
  { id: "a4", type: "overtime",   title: "Overtime Request — 12h",      meta: "Liviu Toma · Cluj Mănăștur site · Weekend",          urgency: "medium"                  },
  { id: "a5", type: "onboarding", title: "New Employee — Onboarding",   meta: "HR · Bogdan Moldovan · Starts Jun 16 · Worker",      urgency: "low"                     },
  { id: "a6", type: "leave",      title: "Leave Request — 3 days",      meta: "Sorin Florea · Brașov · Jun 20–22 · Medical",        urgency: "medium"                  },
  { id: "a7", type: "expense",    title: "Expense Claim — €420",        meta: "Andrei Popescu · Fuel & materials · Jun 5",          urgency: "low"                     },
  { id: "a8", type: "invoice",    title: "Invoice Approval — €3,800",   meta: "Finance · Invoice #1040 · Radu Construct",           urgency: "medium", amount: "€3,800" },
  { id: "a9", type: "overtime",   title: "Overtime Request — 8h",       meta: "Ion Crișan · Timișoara · Saturday",                  urgency: "low"                     },
]

const DETAIL_MAP: Record<string, ApprovalDetail> = {
  a2: {
    type: "Leave Request",
    title: "5 Days Annual Leave",
    fields: [
      { label: "Requested by", value: "Maria Ionescu"        },
      { label: "Department",   value: "HR · Cluj"            },
      { label: "Dates",        value: "Jun 14 – Jun 18, 2026"},
      { label: "Type",         value: "Annual Leave"         },
      { label: "Coverage",     value: "Elena Marin (confirmed)" },
      { label: "Balance after",value: "12 days remaining"    },
    ],
    reason: "Family vacation planned 3 months in advance. Coverage confirmed with Elena.",
  },
}

const HISTORY: HistoryItem[] = [
  { id: "h1", title: "Payroll Run — June W1",    sub: "Approved by you · 3 hr ago", status: "approved" },
  { id: "h2", title: "Expense — €3,400 tools",   sub: "Rejected · amount over limit · Yesterday", status: "rejected" },
  { id: "h3", title: "Leave — Dan Pop · 3 days", sub: "Approved by you · Jun 3",    status: "approved" },
  { id: "h4", title: "Invoice #1038 · €4,200",   sub: "Approved by you · Jun 3",    status: "approved" },
]

// ── Style helpers ─────────────────────────────────────────────────────────────

const g1  = "var(--prv-g1)"
const bds = "var(--prv-border-subtle)"
const t1  = "var(--prv-text-1)"
const t2  = "var(--prv-text-2)"
const t3  = "var(--prv-text-3)"


const URGENCY_STYLE: Record<Urgency, { bg: string; color: string; label: string }> = {
  urgent: { bg: "rgba(255,69,58,0.15)",   color: "rgba(255,69,58,0.95)",  label: "Urgent" },
  medium: { bg: "rgba(255,159,10,0.15)",  color: "rgba(255,159,10,0.95)", label: "Medium" },
  low:    { bg: bds, color: t3, label: "Low" },
}

const TYPE_ICON: Record<ApprovalType, { path: string; bg: string; stroke: string }> = {
  expense:    { path: "M1 4h22v16H1ZM1 10h22",                                                         bg: "rgba(255,69,58,0.12)",    stroke: "rgba(255,69,58,0.9)"   },
  leave:      { path: "M3 4h18v18H3ZM16 2v4M8 2v4M3 10h18",                                            bg: "rgba(255,159,10,0.12)",   stroke: "rgba(255,159,10,0.9)"  },
  invoice:    { path: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6",          bg: "rgba(10,132,255,0.12)",   stroke: "rgba(10,132,255,0.9)"  },
  overtime:   { path: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM12 6v6l4 2",                           bg: "rgba(255,159,10,0.10)",   stroke: "rgba(255,159,10,0.85)" },
  onboarding: { path: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",bg: g1, stroke: t2},
}

const DECISION_STYLE: Record<"approved" | "rejected", { bg: string; color: string; label: string }> = {
  approved: { bg: "rgba(48,209,88,0.14)",  color: "rgba(48,209,88,0.95)", label: "Approved" },
  rejected: { bg: "rgba(255,69,58,0.14)",  color: "rgba(255,69,58,0.95)", label: "Rejected" },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[18px] relative overflow-hidden ${className}`}
      style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}>
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

// ── Approval Detail ───────────────────────────────────────────────────────────

function ApprovalDetailView({
  item,
  onBack,
  onDecide,
}: {
  item: ApprovalItem
  onBack: () => void
  onDecide: (id: string, decision: "approved" | "rejected") => void
}) {
  const detail = DETAIL_MAP[item.id]
  const u = URGENCY_STYLE[item.urgency]
  const ti = TYPE_ICON[item.type]

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 mb-4 text-white/45 text-[13px] font-medium">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Approvals
      </button>

      <GlassCard className="p-4 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: ti.bg }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ti.stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d={ti.path} />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-bold text-white/35 uppercase tracking-widest">{detail?.type ?? item.type}</p>
            <p className="text-[18px] font-bold text-white/90 leading-tight mt-0.5">{detail?.title ?? item.title}</p>
          </div>
          <span className="text-[10px] font-semibold px-2 py-1 rounded-[7px]" style={{ background: u.bg, color: u.color }}>{u.label}</span>
        </div>

        {detail ? (
          <>
            <div className="flex flex-col gap-2.5 mb-4">
              {detail.fields.map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-[13px] text-white/35">{label}</span>
                  <span className="text-[13px] font-semibold text-white/90">{value}</span>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-[12px] text-[13px] text-white/65 italic leading-relaxed" style={{ background: "var(--prv-g2)" }}>
              "{detail.reason}"
            </div>
          </>
        ) : (
          <p className="text-[13px] text-white/65 leading-relaxed">{item.meta}</p>
        )}
      </GlassCard>

      {/* CTA */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => onDecide(item.id, "approved")}
          className="flex-1 py-3.5 rounded-[14px] text-[14px] font-bold"
          style={{ background: "rgba(48,209,88,0.15)", color: "rgba(48,209,88,0.95)", border: "1px solid rgba(48,209,88,0.30)" }}
        >
          ✓ Approve
        </button>
        <button
          onClick={() => onDecide(item.id, "rejected")}
          className="flex-1 py-3.5 rounded-[14px] text-[14px] font-bold"
          style={{ background: "rgba(255,69,58,0.10)", color: "rgba(255,69,58,0.95)", border: "1px solid rgba(255,69,58,0.25)" }}
        >
          ✕ Reject
        </button>
      </div>

      {/* Recent decisions */}
      <Label>Recent Decisions</Label>
      <GlassCard>
        {HISTORY.map((h) => {
          const ds = DECISION_STYLE[h.status]
          return (
            <div key={h.id} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--prv-border-subtle)" }}>
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: ds.color }} />
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-white/90">{h.title}</p>
                <p className="text-[11px] text-white/35 mt-0.5">{h.sub}</p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px]" style={{ background: ds.bg, color: ds.color }}>{ds.label}</span>
            </div>
          )
        })}
      </GlassCard>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ApprovalsWorkspace() {
  const [filter,   setFilter]   = useState("all")
  const [selected, setSelected] = useState<ApprovalItem | null>(null)
  const [decided,  setDecided]  = useState<Record<string, DecisionStatus>>({})

  const pending = APPROVALS.filter((a) => !decided[a.id])

  const filtered = pending.filter((a) => {
    if (filter === "all")     return true
    if (filter === "urgent")  return a.urgency === "urgent"
    if (filter === "leave")   return a.type === "leave"
    if (filter === "finance") return a.type === "expense" || a.type === "invoice"
    return true
  })

  const urgentCount   = pending.filter((a) => a.urgency === "urgent").length
  const approvedCount = Object.values(decided).filter((d) => d === "approved").length + 24
  const rejectedCount = Object.values(decided).filter((d) => d === "rejected").length + 2

  function handleDecide(id: string, decision: "approved" | "rejected") {
    setDecided((prev) => ({ ...prev, [id]: decision }))
    setSelected(null)
  }

  if (selected) {
    return (
      <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
        <ApprovalDetailView item={selected} onBack={() => setSelected(null)} onDecide={handleDecide} />
      </div>
    )
  }

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-white/35 text-[13px] font-medium mb-0.5">Command</p>
          <h1 className="text-white/90 text-[26px] font-semibold tracking-tight leading-tight">Approvals</h1>
        </div>
        {pending.length > 0 && (
          <div
            className="min-w-[28px] h-7 px-2 rounded-full flex items-center justify-center text-[12px] font-bold text-white"
            style={{ background: "rgba(255,69,58,0.85)" }}
          >
            {pending.length}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-2.5 mb-4">
        {[
          { v: String(pending.length),  l: "Pending",  c: "rgba(255,69,58,0.95)"   },
          { v: String(urgentCount),     l: "Urgent",   c: "rgba(255,159,10,0.95)"  },
          { v: String(approvedCount),   l: "Approved", c: "rgba(48,209,88,0.95)"   },
          { v: String(rejectedCount),   l: "Rejected", c: t1 },
        ].map(({ v, l, c }) => (
          <div key={l} className="py-3 rounded-[14px] text-center"
            style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}>
            <p className="text-[18px] font-bold" style={{ color: c }}>{v}</p>
            <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mt-1">{l}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <GlassSegmentedControl items={FILTER_ITEMS} activeId={filter} onChange={setFilter} fullWidth className="mb-4" />

      {/* Approval queue */}
      {filtered.length === 0 ? (
        <GlassCard className="py-12 text-center">
          <p className="text-[15px] font-semibold text-white/90 mb-1">All clear</p>
          <p className="text-[13px] text-white/35">No pending approvals in this category.</p>
        </GlassCard>
      ) : (
        <GlassCard>
          {filtered.map((item) => {
            const u  = URGENCY_STYLE[item.urgency]
            const ti = TYPE_ICON[item.type]
            return (
              <div key={item.id} className="px-4 py-3.5" style={{ borderBottom: "1px solid var(--prv-border-subtle)" }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: ti.bg }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={ti.stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d={ti.path} />
                    </svg>
                  </div>
                  <p className="text-[14px] font-bold text-white/90 flex-1">{item.title}</p>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px] shrink-0" style={{ background: u.bg, color: u.color }}>{u.label}</span>
                </div>
                <p className="text-[12px] text-white/35 mb-2.5 ml-12">{item.meta}</p>
                <div className="flex gap-2 ml-12">
                  {(["approved", "rejected"] as const).map((decision) => {
                    const isApprove = decision === "approved"
                    return (
                      <button
                        key={decision}
                        onClick={() => handleDecide(item.id, decision)}
                        className="flex-1 py-2 rounded-[10px] text-[12px] font-bold"
                        style={isApprove
                          ? { background: "rgba(48,209,88,0.15)", color: "rgba(48,209,88,0.95)", border: "1px solid rgba(48,209,88,0.25)" }
                          : { background: "rgba(255,69,58,0.10)",  color: "rgba(255,69,58,0.95)", border: "1px solid rgba(255,69,58,0.20)"  }
                        }
                      >
                        {isApprove ? "Approve" : "Reject"}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setSelected(item)}
                    className="flex-1 py-2 rounded-[10px] text-[12px] font-bold text-white/65"
                    style={{ background: "var(--prv-g2)", border: "1px solid var(--prv-border-subtle)" }}
                  >
                    Review
                  </button>
                </div>
              </div>
            )
          })}
        </GlassCard>
      )}

      {/* Recent decisions */}
      <Label>Recent Decisions</Label>
      <GlassCard>
        {HISTORY.map((h) => {
          const ds = DECISION_STYLE[h.status]
          return (
            <div key={h.id} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--prv-border-subtle)" }}>
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: ds.color }} />
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-white/90">{h.title}</p>
                <p className="text-[11px] text-white/35 mt-0.5">{h.sub}</p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px]" style={{ background: ds.bg, color: ds.color }}>{ds.label}</span>
            </div>
          )
        })}
      </GlassCard>

    </div>
  )
}
