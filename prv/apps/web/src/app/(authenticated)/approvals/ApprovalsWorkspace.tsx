"use client"

import { useEffect, useMemo, useState } from "react"
import { GlassSegmentedControl, type SegmentItem } from "@prv/ui"

// ── API Types ─────────────────────────────────────────────────────────────────

type ApiApprovalType = "purchase" | "leave" | "expense" | "contract" | "overtime"
type ApiApprovalStatus = "Pending" | "Urgent" | "Expired"

interface ApiApprovalSummary {
  id: string
  type: ApiApprovalType
  ref: string
  title: string
  requestedBy: string
  description: string
  value: number | null
  deadline: string
  daysUntilDeadline: number | null
  status: ApiApprovalStatus
}

interface ApiMeta {
  pending: number
  urgent: number
  expired: number
  approvedToday: number
}

// ── Local UI Types ────────────────────────────────────────────────────────────

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
  requestedBy: string
  ref: string
  deadline: string
  daysUntilDeadline: number | null
  description: string
  value: number | null
}

interface ApprovalDetail {
  type: string
  title: string
  fields: { label: string; value: string }[]
  reason: string
}

interface LocalDecision {
  id: string
  title: string
  sub: string
  status: "approved" | "rejected"
}

// ── Mappers ───────────────────────────────────────────────────────────────────

const API_TYPE_MAP: Record<ApiApprovalType, ApprovalType> = {
  purchase: "expense",
  expense: "expense",
  leave: "leave",
  contract: "invoice",
  overtime: "overtime",
}

function mapUrgency(status: ApiApprovalStatus, days: number | null): Urgency {
  if (status === "Urgent") return "urgent"
  if (status === "Expired") return "low"
  if (days !== null && days <= 2) return "urgent"
  if (days !== null && days <= 7) return "medium"
  return "low"
}

function mapToItem(a: ApiApprovalSummary): ApprovalItem {
  const type = API_TYPE_MAP[a.type]
  const urgency = mapUrgency(a.status, a.daysUntilDeadline)
  const meta = [a.requestedBy, a.description, a.deadline].filter(Boolean).join(" · ")
  return {
    id: a.id,
    type,
    title: a.title,
    meta,
    urgency,
    amount: a.value !== null ? `€${a.value.toLocaleString()}` : undefined,
    requestedBy: a.requestedBy,
    ref: a.ref,
    deadline: a.deadline,
    daysUntilDeadline: a.daysUntilDeadline,
    description: a.description,
    value: a.value,
  }
}

const TYPE_LABEL_MAP: Record<ApprovalType, string> = {
  expense: "Decontare cheltuieli",
  leave: "Cerere concediu",
  invoice: "Invoice approval",
  overtime: "Ore suplimentare",
  onboarding: "Angajare",
}

function buildDetail(item: ApprovalItem): ApprovalDetail {
  const fields: { label: string; value: string }[] = [
    { label: "Solicitant", value: item.requestedBy },
    { label: "Reference", value: item.ref },
    { label: "Deadline", value: item.deadline },
    ...(item.daysUntilDeadline !== null
      ? [{ label: "Zile remaininge", value: `${item.daysUntilDeadline} days` }]
      : []),
    ...(item.value !== null
      ? [{ label: "Valoare", value: `€${item.value.toLocaleString()}` }]
      : []),
  ]
  return {
    type: TYPE_LABEL_MAP[item.type],
    title: item.title,
    fields,
    reason: item.description || "No description provided.",
  }
}

// ── Style helpers ─────────────────────────────────────────────────────────────

const g1 = "var(--prv-g1)"
const bds = "var(--prv-border-subtle)"
const t1 = "var(--prv-text-1)"
const t2 = "var(--prv-text-2)"
const t3 = "var(--prv-text-3)"

const URGENCY_STYLE: Record<Urgency, { bg: string; color: string; label: string }> = {
  urgent: { bg: "rgba(255,69,58,0.15)", color: "rgba(255,69,58,0.95)", label: "Urgent" },
  medium: { bg: "rgba(255,159,10,0.15)", color: "rgba(255,159,10,0.95)", label: "Medium" },
  low: { bg: bds, color: t3, label: "Low" },
}

const TYPE_ICON: Record<ApprovalType, { path: string; bg: string; stroke: string }> = {
  expense: {
    path: "M1 4h22v16H1ZM1 10h22",
    bg: "rgba(255,69,58,0.12)",
    stroke: "rgba(255,69,58,0.9)",
  },
  leave: {
    path: "M3 4h18v18H3ZM16 2v4M8 2v4M3 10h18",
    bg: "rgba(255,159,10,0.12)",
    stroke: "rgba(255,159,10,0.9)",
  },
  invoice: {
    path: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6",
    bg: "rgba(10,132,255,0.12)",
    stroke: "rgba(10,132,255,0.9)",
  },
  overtime: {
    path: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM12 6v6l4 2",
    bg: "rgba(255,159,10,0.10)",
    stroke: "rgba(255,159,10,0.85)",
  },
  onboarding: {
    path: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    bg: g1,
    stroke: t2,
  },
}

const DECISION_STYLE: Record<
  "approved" | "rejected",
  { bg: string; color: string; label: string }
> = {
  approved: { bg: "rgba(48,209,88,0.14)", color: "rgba(48,209,88,0.95)", label: "Approved" },
  rejected: { bg: "rgba(255,69,58,0.14)", color: "rgba(255,69,58,0.95)", label: "Rejected" },
}

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
  const detail = buildDetail(item)
  const u = URGENCY_STYLE[item.urgency]
  const ti = TYPE_ICON[item.type]

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
        Approveri
      </button>

      <GlassCard className="p-4 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
            style={{ background: ti.bg }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={ti.stroke}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={ti.path} />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-bold text-white/35 uppercase tracking-widest">
              {detail.type}
            </p>
            <p className="text-[18px] font-bold text-white/90 leading-tight mt-0.5">
              {detail.title}
            </p>
          </div>
          <span
            className="text-[10px] font-semibold px-2 py-1 rounded-[7px]"
            style={{ background: u.bg, color: u.color }}
          >
            {u.label}
          </span>
        </div>

        <div className="flex flex-col gap-2.5 mb-4">
          {detail.fields.map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span className="text-[13px] text-white/35">{label}</span>
              <span className="text-[13px] font-semibold text-white/90">{value}</span>
            </div>
          ))}
        </div>
        <div
          className="p-3 rounded-[12px] text-[13px] text-white/65 italic leading-relaxed"
          style={{ background: "var(--prv-g2)" }}
        >
          &quot;{detail.reason}&quot;
        </div>
      </GlassCard>

      {/* CTA */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => onDecide(item.id, "approved")}
          className="flex-1 py-3.5 rounded-[14px] text-[14px] font-bold"
          style={{
            background: "rgba(48,209,88,0.15)",
            color: "rgba(48,209,88,0.95)",
            border: "1px solid rgba(48,209,88,0.30)",
          }}
        >
          ✓ Approve
        </button>
        <button
          onClick={() => onDecide(item.id, "rejected")}
          className="flex-1 py-3.5 rounded-[14px] text-[14px] font-bold"
          style={{
            background: "rgba(255,69,58,0.10)",
            color: "rgba(255,69,58,0.95)",
            border: "1px solid rgba(255,69,58,0.25)",
          }}
        >
          ✕ Reject
        </button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ApprovalsWorkspace() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([])
  const [meta, setMeta] = useState<ApiMeta>({ pending: 0, urgent: 0, expired: 0, approvedToday: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [selected, setSelected] = useState<ApprovalItem | null>(null)
  const [decided, setDecided] = useState<Record<string, DecisionStatus>>({})
  const [localHistory, setLocalHistory] = useState<LocalDecision[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch("/api/approvals/")
        if (!res.ok) return
        const data = (await res.json()) as {
          approvals: ApiApprovalSummary[]
          meta: ApiMeta
        }
        if (cancelled) return
        setApprovals(data.approvals.map(mapToItem))
        setMeta(data.meta)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const pending = approvals.filter((a) => !decided[a.id])

  const urgentCount = pending.filter((a) => a.urgency === "urgent").length

  const filterItems: SegmentItem[] = useMemo(
    () => [
      { id: "all", label: `All (${pending.length})` },
      { id: "urgent", label: `Urgent (${urgentCount})` },
      { id: "leave", label: "Concediu" },
      { id: "finance", label: "Finance" },
    ],
    [pending.length, urgentCount]
  )

  const filtered = pending.filter((a) => {
    if (filter === "all") return true
    if (filter === "urgent") return a.urgency === "urgent"
    if (filter === "leave") return a.type === "leave"
    if (filter === "finance") return a.type === "expense" || a.type === "invoice"
    return true
  })

  const approvedCount =
    Object.values(decided).filter((d) => d === "approved").length + meta.approvedToday
  const rejectedCount = Object.values(decided).filter((d) => d === "rejected").length

  async function handleDecide(id: string, decision: "approved" | "rejected") {
    const item = approvals.find((a) => a.id === id)
    setDecided((prev) => ({ ...prev, [id]: decision }))
    setSelected(null)

    setLocalHistory((prev) => [
      {
        id,
        title: item?.title ?? id,
        sub: `${decision === "approved" ? "Approved" : "Rejected"} de tine · acum`,
        status: decision,
      },
      ...prev,
    ])

    try {
      await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: decision === "approved" ? "approve" : "reject" }),
      })
    } catch {
      // revert on network error
      setDecided((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }
  }

  if (selected) {
    return (
      <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
        <ApprovalDetailView
          item={selected}
          onBack={() => setSelected(null)}
          onDecide={handleDecide}
        />
      </div>
    )
  }

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-white/35 text-[13px] font-medium mb-0.5">Command</p>
          <h1 className="text-white/90 text-[26px] font-semibold tracking-tight leading-tight">
            Approveri
          </h1>
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
          {
            v: loading ? "…" : String(pending.length),
            l: "Pending",
            c: "rgba(255,69,58,0.95)",
          },
          { v: loading ? "…" : String(urgentCount), l: "Urgent", c: "rgba(255,159,10,0.95)" },
          { v: loading ? "…" : String(approvedCount), l: "Approved", c: "rgba(48,209,88,0.95)" },
          { v: loading ? "…" : String(rejectedCount), l: "Rejected", c: t1 },
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
        items={filterItems}
        activeId={filter}
        onChange={setFilter}
        fullWidth
        className="mb-4"
      />

      {/* Approval queue */}
      {loading ? (
        <GlassCard className="py-12 text-center">
          <p className="text-[14px] text-white/35">Loading…</p>
        </GlassCard>
      ) : filtered.length === 0 ? (
        <GlassCard className="py-12 text-center">
          <p className="text-[15px] font-semibold text-white/90 mb-1">All clear</p>
          <p className="text-[13px] text-white/35">No pending approvals in this category.</p>
        </GlassCard>
      ) : (
        <GlassCard>
          {filtered.map((item) => {
            const u = URGENCY_STYLE[item.urgency]
            const ti = TYPE_ICON[item.type]
            return (
              <div
                key={item.id}
                className="px-4 py-3.5"
                style={{ borderBottom: "1px solid var(--prv-border-subtle)" }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                    style={{ background: ti.bg }}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={ti.stroke}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={ti.path} />
                    </svg>
                  </div>
                  <p className="text-[14px] font-bold text-white/90 flex-1">{item.title}</p>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px] shrink-0"
                    style={{ background: u.bg, color: u.color }}
                  >
                    {u.label}
                  </span>
                </div>
                <p className="text-[12px] text-white/35 mb-2.5 ml-12">{item.meta}</p>
                <div className="flex gap-2 ml-12">
                  {(["approved", "rejected"] as const).map((decision) => {
                    const isApprove = decision === "approved"
                    return (
                      <button
                        key={decision}
                        onClick={() => void handleDecide(item.id, decision)}
                        className="flex-1 py-2 rounded-[10px] text-[12px] font-bold"
                        style={
                          isApprove
                            ? {
                                background: "rgba(48,209,88,0.15)",
                                color: "rgba(48,209,88,0.95)",
                                border: "1px solid rgba(48,209,88,0.25)",
                              }
                            : {
                                background: "rgba(255,69,58,0.10)",
                                color: "rgba(255,69,58,0.95)",
                                border: "1px solid rgba(255,69,58,0.20)",
                              }
                        }
                      >
                        {isApprove ? "Approve" : "Reject"}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setSelected(item)}
                    className="flex-1 py-2 rounded-[10px] text-[12px] font-bold text-white/65"
                    style={{
                      background: "var(--prv-g2)",
                      border: "1px solid var(--prv-border-subtle)",
                    }}
                  >
                    Detalii
                  </button>
                </div>
              </div>
            )
          })}
        </GlassCard>
      )}

      {/* Recent decisions */}
      {localHistory.length > 0 && (
        <>
          <Label>Decizii Recente</Label>
          <GlassCard>
            {localHistory.slice(0, 5).map((h) => {
              const ds = DECISION_STYLE[h.status]
              return (
                <div
                  key={h.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: "1px solid var(--prv-border-subtle)" }}
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: ds.color }} />
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-white/90">{h.title}</p>
                    <p className="text-[11px] text-white/35 mt-0.5">{h.sub}</p>
                  </div>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px]"
                    style={{ background: ds.bg, color: ds.color }}
                  >
                    {ds.label}
                  </span>
                </div>
              )
            })}
          </GlassCard>
        </>
      )}
    </div>
  )
}
