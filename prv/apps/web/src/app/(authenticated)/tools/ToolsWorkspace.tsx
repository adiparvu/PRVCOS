"use client"

import { useState, useMemo } from "react"
import { useTools } from "@/lib/api-hooks"
import type { ToolSummary, ToolStatus } from "@/app/api/tools/route"

type FilterType = "All" | "Available" | "In Use" | "Service"

interface Tool {
  id: string
  name: string
  model: string
  category: string
  status: ToolStatus
  assignedTo?: string
  site?: string
  dueBack?: string
  location?: string
  lastUsed?: string
  nextService: string
  lastService: string
  ageYears: number
  utilisationPct: number
  usesThisMonth: number
  valueEur: number
  serviceOverdueDays?: number
}

interface CategoryStat {
  label: string
  count: number
  detail: string
}

// ── Category detail labels ────────────────────────────────────────────────────

const CATEGORY_DETAILS: Record<string, string> = {
  "Power Tools":     "Drills, grinders, saws",
  "Measuring":       "Levels, rulers, sensors",
  "Hand Tools":      "Hammers, chisels, clamps",
  "Heavy Equipment": "Mixers, compactors, lifts",
}

// ── Mapper ────────────────────────────────────────────────────────────────────

function mapTool(t: ToolSummary): Tool {
  return {
    id: t.id,
    name: t.name,
    model: t.model,
    category: t.category,
    status: t.status,
    assignedTo: t.assignedTo ?? undefined,
    site: t.site ?? undefined,
    dueBack: t.dueBack ?? undefined,
    location: t.location ?? undefined,
    lastUsed: t.lastUsed ?? undefined,
    nextService: "—",
    lastService: "—",
    ageYears: 0,
    utilisationPct: t.utilisationPct,
    usesThisMonth: 0,
    valueEur: 0,
    serviceOverdueDays: t.serviceOverdueDays ?? undefined,
  }
}

// ── Tokens ────────────────────────────────────────────────────────────────────

const g1  = "var(--prv-g1)"
const g2  = "var(--prv-g2)"
const bds = "var(--prv-border-subtle)"
const bd  = "var(--prv-border)"
const t1  = "var(--prv-text-1)"
const t2  = "var(--prv-text-2)"
const t3  = "var(--prv-text-3)"

const green   = "rgba(48,209,88,0.90)"
const greenBg = "rgba(48,209,88,0.12)"
const blue    = "rgba(10,132,255,0.90)"
const blueBg  = "rgba(10,132,255,0.12)"
const amber   = "rgba(255,159,10,0.95)"
const amberBg = "rgba(255,159,10,0.15)"
const red     = "rgba(255,69,58,0.90)"
const redBg   = "rgba(255,69,58,0.14)"

// ── Helpers ───────────────────────────────────────────────────────────────────

function Specular() {
  return <div style={{ position: "absolute", inset: "0 0 auto", height: 1, background: `linear-gradient(90deg,transparent,${bd},transparent)` }} />
}

const STATUS_STYLE: Record<ToolStatus, { bg: string; color: string }> = {
  Available:   { bg: greenBg, color: green },
  "In Use":    { bg: blueBg,  color: blue  },
  Maintenance: { bg: amberBg, color: amber },
  Missing:     { bg: redBg,   color: red   },
}

function StatusPill({ status }: { status: ToolStatus }) {
  const s = STATUS_STYLE[status]
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: s.bg, color: s.color, whiteSpace: "nowrap", flexShrink: 0 }}>
      {status}
    </span>
  )
}

function ToolIcon({ category, status }: { category: string; status: ToolStatus }) {
  const stroke = status === "Maintenance" ? amber : status === "In Use" ? blue : t2
  const bg = status === "Maintenance" ? "rgba(255,159,10,0.10)" : status === "In Use" ? "rgba(10,132,255,0.10)" : g2

  const path = category === "Measuring"
    ? <><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><circle cx="12" cy="12" r="4"/></>
    : category === "Heavy Equipment"
    ? <><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></>
    : category === "Hand Tools"
    ? <><path d="M2 12h20M12 2v20"/></>
    : <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>

  return (
    <div style={{ width: 44, height: 44, borderRadius: 13, background: bg, border: `1px solid ${bd}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {path}
      </svg>
    </div>
  )
}

// ── Tool detail sheet ─────────────────────────────────────────────────────────

function ToolDetail({ tool, onClose }: { tool: Tool; onClose: () => void }) {
  const rows = tool.status === "In Use"
    ? [
        { label: "Assigned to",  val: tool.assignedTo ?? "—" },
        { label: "Current site", val: tool.site ?? "—" },
        { label: "Due back",     val: tool.dueBack ?? "—" },
        { label: "Last service", val: tool.lastService },
        { label: "Next service", val: tool.nextService },
      ]
    : [
        { label: "Location",     val: tool.location ?? tool.site ?? "—" },
        { label: "Last used",    val: tool.lastUsed ?? "—" },
        { label: "Last service", val: tool.lastService },
        { label: "Next service", val: tool.nextService },
        { label: "Value",        val: tool.valueEur > 0 ? `€${tool.valueEur.toLocaleString()}` : "—" },
      ]

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
            <ToolIcon category={tool.category} status={tool.status} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: t3, marginBottom: 3 }}>{tool.category} · ID #{tool.id.toUpperCase()}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: t1, lineHeight: 1.2, marginBottom: 4 }}>{tool.model} · {tool.name}</div>
              <StatusPill status={tool.status} />
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", background: g1, border: `1px solid ${bds}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, marginTop: 2 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={t3} strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* Service overdue warning */}
          {tool.serviceOverdueDays != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: "rgba(255,159,10,0.07)", border: "1px solid rgba(255,159,10,0.18)", marginBottom: 14 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={amber} strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span style={{ fontSize: 12, color: amber }}>Maintenance overdue by {tool.serviceOverdueDays} days</span>
            </div>
          )}

          {/* Metric cards */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[
              { val: tool.ageYears > 0 ? `${tool.ageYears}yr` : "—",           lbl: "Age"           },
              { val: `${tool.utilisationPct}%`,                                  lbl: "Utilisation"   },
              { val: tool.usesThisMonth > 0 ? String(tool.usesThisMonth) : "—", lbl: "Uses this mo." },
              { val: tool.valueEur > 0 ? `€${tool.valueEur.toLocaleString()}` : "—", lbl: "Value" },
            ].map(m => (
              <div key={m.lbl} style={{ flex: 1, padding: "10px 6px", borderRadius: 12, background: g1, border: `1px solid ${bds}`, textAlign: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: t1, marginBottom: 2 }}>{m.val}</div>
                <div style={{ fontSize: 9, color: t3, lineHeight: 1.2 }}>{m.lbl}</div>
              </div>
            ))}
          </div>

          {/* Info rows */}
          <div style={{ background: g1, border: `1px solid ${bds}`, borderRadius: 16, padding: "0 14px", marginBottom: 16 }}>
            {rows.map((r, i) => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < rows.length - 1 ? `1px solid ${bds}` : "none" }}>
                <span style={{ fontSize: 13, color: t3 }}>{r.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: t1 }}>{r.val}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ flex: 1, padding: "13px", borderRadius: 14, background: g2, border: `1px solid ${bd}`, color: t1, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Log Issue
            </button>
            <button style={{ flex: 1, padding: "13px", borderRadius: 14, background: t1, border: "none", color: "var(--prv-bg)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              {tool.status === "In Use" ? "Check In" : tool.status === "Available" ? "Check Out" : "Schedule Service"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ToolsWorkspace() {
  const [filter, setFilter] = useState<FilterType>("All")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Tool | null>(null)

  const FILTERS: FilterType[] = ["All", "Available", "In Use", "Service"]

  const { data, isLoading } = useTools()

  const tools = useMemo(() => (data?.tools ?? []).map(mapTool), [data?.tools])
  const meta = data?.meta

  const filtered = useMemo(() => tools.filter(t => {
    const matchFilter =
      filter === "All" ||
      (filter === "Available" && t.status === "Available") ||
      (filter === "In Use"    && t.status === "In Use") ||
      (filter === "Service"   && t.status === "Maintenance")
    const q = search.toLowerCase()
    const matchSearch = !search || t.name.toLowerCase().includes(q) || t.model.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || (t.assignedTo ?? "").toLowerCase().includes(q) || (t.site ?? "").toLowerCase().includes(q)
    return matchFilter && matchSearch
  }), [tools, filter, search])

  const overdueCount = meta?.overdueCount ?? tools.filter(t => t.serviceOverdueDays != null).length
  const overdueTitles = tools.filter(t => t.serviceOverdueDays != null).map(t => t.name).join(" · ")

  const total     = meta?.total ?? tools.length
  const available = tools.filter(t => t.status === "Available").length
  const inUse     = meta?.inUse ?? tools.filter(t => t.status === "In Use").length
  const service   = meta?.inService ?? tools.filter(t => t.status === "Maintenance").length

  const categories = useMemo<CategoryStat[]>(() => {
    const counts: Record<string, number> = {}
    for (const t of tools) counts[t.category] = (counts[t.category] ?? 0) + 1
    return Object.entries(counts).map(([label, count]) => ({
      label,
      count,
      detail: CATEGORY_DETAILS[label] ?? label,
    }))
  }, [tools])

  const showCategories = filter === "All" && !search

  return (
    <div style={{ paddingBottom: 120 }}>

      {/* ── Header ── */}
      <div style={{ padding: "6px 16px 4px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: t1 }}>Tool Management</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: g1, border: `1px solid ${bds}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t2} strokeWidth="1.7" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: g1, border: `1px solid ${bds}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t2} strokeWidth="1.7" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            </div>
          </div>
        </div>
        <p style={{ fontSize: 14, color: t2 }}>
          {isLoading ? "Loading…" : `${total} tools · ${overdueCount} overdue for maintenance`}
        </p>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "flex", gap: 8, padding: "16px 16px 0" }}>
        {[
          { val: isLoading ? "…" : String(total),     lbl: "Total"     },
          { val: isLoading ? "…" : String(available),  lbl: "Available" },
          { val: isLoading ? "…" : String(inUse),      lbl: "In Use"    },
          { val: isLoading ? "…" : String(service),    lbl: "Service", color: service > 0 ? amber : t1 },
        ].map(s => (
          <div key={s.lbl} style={{ flex: 1, padding: "12px 8px", borderRadius: 14, background: g1, border: `1px solid ${bds}`, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color ?? t1, marginBottom: 2 }}>{s.val}</div>
            <div style={{ fontSize: 10, color: t3 }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 14, background: "var(--prv-border-subtle)", border: `1px solid ${bds}`, margin: "14px 16px 0" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t3} strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tools, categories, locations…" style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 14, color: t1, fontFamily: "inherit" }} />
      </div>

      {/* ── Filter ── */}
      <div style={{ display: "flex", gap: 4, padding: "3px", background: g1, borderRadius: 10, margin: "12px 16px 0" }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ flex: 1, padding: "6px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, color: filter === f ? t1 : t3, background: filter === f ? g2 : "transparent", border: "none", cursor: "pointer", transition: "all 0.15s" }}>
            {f}
          </button>
        ))}
      </div>

      {/* ── Maintenance alert ── */}
      {overdueCount > 0 && (filter === "All" || filter === "Service") && (
        <div style={{ margin: "16px 16px 0", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 14, background: "rgba(255,159,10,0.07)", border: "1px solid rgba(255,159,10,0.18)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={amber} strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: amber }}>{overdueCount} tool{overdueCount > 1 ? "s" : ""} overdue for maintenance</div>
            <div style={{ fontSize: 12, color: t3, marginTop: 1 }}>{overdueTitles}</div>
          </div>
          <span style={{ fontSize: 12, color: t3 }}>View →</span>
        </div>
      )}

      {/* ── Tool list ── */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: t3, marginBottom: 12 }}>
          {filter === "All" ? "All Tools" : filter === "Service" ? "In Service" : `${filter}`}
        </div>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: t3, fontSize: 14 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: t3, fontSize: 14 }}>No tools found</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
            {filtered.map(t => (
              <div key={t.id} onClick={() => setSelected(t)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", borderRadius: 16, background: g1, border: `1px solid ${t.serviceOverdueDays != null ? "rgba(255,159,10,0.22)" : bds}`, cursor: "pointer", position: "relative" }}>
                <Specular />
                <ToolIcon category={t.category} status={t.status} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: t1, marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.model} · {t.name}</div>
                  {t.status === "In Use" ? (
                    <>
                      <div style={{ fontSize: 12, color: t3 }}>Assigned: {t.assignedTo} · {t.site}</div>
                      <div style={{ fontSize: 12, color: t3, marginTop: 1 }}>Due back: {t.dueBack ?? "—"}</div>
                    </>
                  ) : t.serviceOverdueDays != null ? (
                    <>
                      <div style={{ fontSize: 12, color: t3 }}>{t.location}</div>
                      <div style={{ fontSize: 11, color: amber, marginTop: 2 }}>⚠ Maintenance overdue by {t.serviceOverdueDays} days</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 12, color: t3 }}>{t.location} · Last used: {t.lastUsed ?? "—"}</div>
                      <div style={{ fontSize: 12, color: t3, marginTop: 1 }}>Next service: {t.nextService}</div>
                    </>
                  )}
                </div>
                <StatusPill status={t.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Category breakdown ── */}
      {showCategories && categories.length > 0 && (
        <div style={{ padding: "24px 16px 0" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: t3, marginBottom: 12 }}>By Category</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {categories.map(cat => (
              <div key={cat.label} style={{ padding: 14, borderRadius: 16, background: g1, border: `1px solid ${bds}` }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: t1, marginBottom: 2 }}>{cat.count}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 1 }}>{cat.label}</div>
                <div style={{ fontSize: 11, color: t3 }}>{cat.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Detail sheet ── */}
      {selected && <ToolDetail tool={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
