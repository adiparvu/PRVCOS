"use client"

import { useState } from "react"

type ArticleType = "SOP" | "Policy" | "Guide" | "FAQ"
type ArticleCategory = "Operations" | "HR" | "Finance" | "Procurement" | "Fleet" | "Projects"

interface ChecklistItem {
  label: string
  checked: boolean
}

interface Article {
  id: string
  title: string
  type: ArticleType
  category: ArticleCategory
  updated: string
  readMin: number
  views?: number
  author?: string
  version?: string
  toc: string[]
  checklist?: ChecklistItem[]
}

const ARTICLES: Article[] = [
  {
    id: "sop-14", title: "SOP-14 · Site Safety Protocol", type: "SOP", category: "Operations",
    updated: "Jun 1", readMin: 8, views: 988, author: "Maria Ionescu", version: "v4.2",
    toc: ["Purpose & Scope", "Personal Protective Equipment", "Site Entry Procedures", "Emergency Response", "Incident Reporting"],
    checklist: [
      { label: "Safety helmet EN397", checked: true },
      { label: "Hi-visibility vest Class 2", checked: true },
      { label: "Safety boots S3", checked: false },
      { label: "Gloves EN388", checked: false },
    ],
  },
  {
    id: "pol-leave", title: "Leave & Absence Policy 2026", type: "Policy", category: "HR",
    updated: "May 15", readMin: 12, author: "Maria Ionescu", version: "v2.0",
    toc: ["Annual Leave Entitlement", "Requesting Leave", "Sick Leave", "Unpaid Leave", "Public Holidays"],
  },
  {
    id: "guide-onboard", title: "New Employee Onboarding — Week 1", type: "Guide", category: "HR",
    updated: "Apr 20", readMin: 15, author: "Maria Ionescu", version: "v3.1",
    toc: ["Day 1 Checklist", "System Access Setup", "Meet the Team", "First Project Assignment"],
  },
  {
    id: "faq-expense", title: "How to submit an expense report", type: "FAQ", category: "Finance",
    updated: "Mar 10", readMin: 4, views: 2140, author: "System",
    toc: ["Step-by-step guide", "Required receipts", "Approval process", "Payment timeline"],
  },
  {
    id: "faq-leave", title: "Requesting time off — step by step", type: "FAQ", category: "HR",
    updated: "Mar 5", readMin: 3, views: 1874, author: "Maria Ionescu",
    toc: ["Submitting a request", "Manager approval", "Calendar sync"],
  },
  {
    id: "sop-03", title: "SOP-03 · Material ordering process", type: "SOP", category: "Procurement",
    updated: "Feb 20", readMin: 10, views: 1322, author: "Andrei Popescu", version: "v2.4",
    toc: ["Identifying material needs", "Creating a PO", "Supplier selection", "Delivery tracking"],
  },
  {
    id: "sop-vehicle", title: "Vehicle inspection checklist", type: "SOP", category: "Fleet",
    updated: "Jan 15", readMin: 6, views: 988, author: "System", version: "v1.8",
    toc: ["Pre-trip inspection", "During trip", "Post-trip checklist", "Reporting issues"],
    checklist: [
      { label: "Check tyre pressure", checked: false },
      { label: "Inspect lights & indicators", checked: false },
      { label: "Verify fuel level", checked: false },
      { label: "Check fluid levels", checked: false },
    ],
  },
]

const RECENT = ARTICLES.slice(0, 3)
const POPULAR = [...ARTICLES].filter(a => a.views).sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 4)

const CATEGORIES = [
  { label: "SOPs", count: 74, bg: "rgba(10,132,255,0.12)", stroke: "rgba(10,132,255,0.9)" },
  { label: "Onboarding", count: 32, bg: "rgba(48,209,88,0.10)", stroke: "rgba(48,209,88,0.85)" },
  { label: "Policies", count: 48, bg: "rgba(191,90,242,0.10)", stroke: "rgba(191,90,242,0.85)" },
  { label: "FAQs", count: 94, bg: "rgba(255,159,10,0.10)", stroke: "rgba(255,159,10,0.9)" },
]

const g1 = "rgba(255,255,255,0.06)"
const g2 = "rgba(255,255,255,0.10)"
const bds = "rgba(255,255,255,0.07)"
const t2 = "rgba(255,255,255,0.65)"
const t3 = "rgba(255,255,255,0.35)"
const green = "rgba(48,209,88,0.95)"

const card: React.CSSProperties = {
  background: g1,
  border: `1px solid ${bds}`,
  borderRadius: 18,
  position: "relative",
  overflow: "hidden",
  marginBottom: 12,
}

function TopEdge() {
  return <div style={{ position: "absolute", inset: "0 0 auto", height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.09),transparent)" }} />
}

function TypePill({ type }: { type: ArticleType }) {
  const styles: Record<ArticleType, React.CSSProperties> = {
    SOP: { background: "rgba(10,132,255,0.12)", color: "rgba(10,132,255,0.9)" },
    Policy: { background: "rgba(191,90,242,0.12)", color: "rgba(191,90,242,0.95)" },
    Guide: { background: "rgba(48,209,88,0.12)", color: green },
    FAQ: { background: "rgba(255,159,10,0.12)", color: "rgba(255,159,10,0.95)" },
  }
  return <span style={{ ...styles[type], fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6 }}>{type}</span>
}

function ArticleIcon({ type }: { type: ArticleType }) {
  const colors: Record<ArticleType, { bg: string; stroke: string }> = {
    SOP: { bg: "rgba(10,132,255,0.12)", stroke: "rgba(10,132,255,0.9)" },
    Policy: { bg: "rgba(191,90,242,0.10)", stroke: "rgba(191,90,242,0.85)" },
    Guide: { bg: "rgba(48,209,88,0.10)", stroke: "rgba(48,209,88,0.85)" },
    FAQ: { bg: "rgba(255,159,10,0.10)", stroke: "rgba(255,159,10,0.9)" },
  }
  const { bg, stroke } = colors[type]
  return (
    <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
      </svg>
    </div>
  )
}

export function KnowledgeWorkspace() {
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Article | null>(null)
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null)
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})

  function toggleCheck(artId: string, idx: number) {
    const key = `${artId}-${idx}`
    setChecklist(c => ({ ...c, [key]: !c[key] }))
  }

  function isChecked(art: Article, idx: number) {
    const key = `${art.id}-${idx}`
    return key in checklist ? checklist[key] : (art.checklist?.[idx]?.checked ?? false)
  }

  const searchResults = search.length > 0
    ? ARTICLES.filter(a => a.title.toLowerCase().includes(search.toLowerCase()) || a.category.toLowerCase().includes(search.toLowerCase()))
    : []

  if (selected) {
    const art = selected
    return (
      <div style={{ padding: "32px 16px 120px", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif", WebkitFontSmoothing: "antialiased" }}>
        <button onClick={() => { setSelected(null); setFeedback(null) }} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: t2, fontSize: 14, fontWeight: 500, cursor: "pointer", marginBottom: 20, padding: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          Knowledge Base
        </button>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
            <TypePill type={art.type} />
            <span style={{ fontSize: 11, color: t3 }}>{art.category} · {art.readMin} min read</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.01em", color: "rgba(255,255,255,0.95)", marginBottom: 8 }}>{art.title}</h1>
          <p style={{ fontSize: 12, color: t3 }}>Last updated {art.updated}, 2026 · by {art.author}{art.version ? ` · ${art.version}` : ""}</p>
        </div>

        {/* TOC */}
        <p style={{ fontSize: 11, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 2px 10px" }}>Contents</p>
        <div style={card}>
          <TopEdge />
          {art.toc.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", borderBottom: i < art.toc.length - 1 ? `1px solid ${bds}` : "none" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t3, width: 20 }}>{i + 1}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.95)" }}>{item}</div>
            </div>
          ))}
        </div>

        {/* Article body */}
        <p style={{ fontSize: 11, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: "0.07em", margin: "18px 2px 10px" }}>Article</p>
        <div style={{ ...card, padding: 16 }}>
          <TopEdge />
          {art.toc.slice(0, 2).map((section, si) => (
            <div key={si}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.95)", margin: si > 0 ? "18px 0 10px" : "0 0 10px" }}>{si + 1}. {section}</div>
              {si === 1 && art.checklist ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 8 }}>
                  {art.checklist.map((item, idx) => {
                    const done = isChecked(art, idx)
                    return (
                      <button key={idx} onClick={() => toggleCheck(art.id, idx)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: done ? "rgba(48,209,88,0.07)" : "rgba(255,255,255,0.04)", border: `1px solid ${done ? "rgba(48,209,88,0.12)" : bds}`, cursor: "pointer", textAlign: "left", width: "100%" }}>
                        {done
                          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(48,209,88,0.85)" strokeWidth="2.2" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                          : <div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${bds}` }} />
                        }
                        <span style={{ fontSize: 13, fontWeight: 600, color: done ? "rgba(255,255,255,0.95)" : t2 }}>{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                [100, 90, 95, 70].slice(0, si === 0 ? 4 : 3).map((w, i) => (
                  <div key={i} style={{ height: 9, borderRadius: 3, background: "rgba(255,255,255,0.08)", width: `${w}%`, marginBottom: 7 }} />
                ))
              )}
            </div>
          ))}
        </div>

        {/* Feedback */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 16, background: g1, border: `1px solid ${bds}`, marginTop: 4 }}>
          <span style={{ fontSize: 13, color: t2 }}>{feedback ? (feedback === "yes" ? "Thanks for the feedback!" : "We'll improve this.") : "Was this helpful?"}</span>
          {!feedback && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setFeedback("yes")} style={{ padding: "6px 16px", borderRadius: 8, background: "rgba(48,209,88,0.14)", border: "none", color: green, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Yes</button>
              <button onClick={() => setFeedback("no")} style={{ padding: "6px 16px", borderRadius: 8, background: g2, border: "none", color: t2, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>No</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: "32px 16px 120px", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif", WebkitFontSmoothing: "antialiased" }}>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 13, color: t3, marginBottom: 2 }}>PRV OS</p>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: "rgba(255,255,255,0.95)" }}>Knowledge</h1>
        </div>
        <div style={{ padding: "6px 12px", borderRadius: 10, background: g1, border: `1px solid ${bds}`, fontSize: 12, fontWeight: 500, color: t2 }}>
          248 articles
        </div>
      </div>

      {/* Search */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: g1, border: `1px solid ${bds}`, borderRadius: 14, marginBottom: 18 }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search procedures, guides, SOPs…" style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 15, color: "rgba(255,255,255,0.95)", fontFamily: "inherit" }} />
        {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: t3, cursor: "pointer", fontSize: 16 }}>×</button>}
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <>
          <p style={{ fontSize: 11, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 2px 10px" }}>{searchResults.length} results</p>
          <div style={card}>
            <TopEdge />
            {searchResults.map((art, i) => (
              <button key={art.id} onClick={() => setSelected(art)} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", borderBottom: i < searchResults.length - 1 ? `1px solid ${bds}` : "none", width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                <ArticleIcon type={art.type} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.95)" }}>{art.title}</span>
                    <TypePill type={art.type} />
                  </div>
                  <div style={{ fontSize: 11, color: t3 }}>{art.category} · {art.readMin} min read</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {search === "" && (
        <>
          {/* Category grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 18 }}>
            {CATEGORIES.map(cat => (
              <div key={cat.label} style={{ padding: 16, borderRadius: 16, background: g1, border: `1px solid ${bds}`, position: "relative", overflow: "hidden", cursor: "pointer" }}>
                <div style={{ position: "absolute", inset: "0 0 auto", height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.09),transparent)" }} />
                <div style={{ width: 36, height: 36, borderRadius: 10, background: cat.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={cat.stroke} strokeWidth="1.8" strokeLinecap="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
                  </svg>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.95)", marginBottom: 3 }}>{cat.label}</div>
                <div style={{ fontSize: 11, color: t3 }}>{cat.count} {cat.label === "FAQs" ? "answers" : cat.label === "Onboarding" ? "guides" : "documents"}</div>
              </div>
            ))}
          </div>

          {/* Recently viewed */}
          <p style={{ fontSize: 11, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 2px 10px" }}>Recently Viewed</p>
          <div style={card}>
            <TopEdge />
            {RECENT.map((art, i) => (
              <button key={art.id} onClick={() => setSelected(art)} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", borderBottom: i < RECENT.length - 1 ? `1px solid ${bds}` : "none", width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                <ArticleIcon type={art.type} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.95)" }}>{art.title}</span>
                    <TypePill type={art.type} />
                  </div>
                  <div style={{ fontSize: 11, color: t3 }}>{art.category} · Updated {art.updated} · {art.readMin} min read</div>
                </div>
              </button>
            ))}
          </div>

          {/* Popular */}
          <p style={{ fontSize: 11, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: "0.07em", margin: "18px 2px 10px" }}>Most Viewed This Month</p>
          <div style={card}>
            <TopEdge />
            {POPULAR.map((art, i) => (
              <button key={art.id} onClick={() => setSelected(art)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: i < POPULAR.length - 1 ? `1px solid ${bds}` : "none", width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                <div style={{ width: 28, textAlign: "center", fontSize: 16, fontWeight: 800, color: t3, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.95)" }}>{art.title}</div>
                  <div style={{ fontSize: 11, color: t3, marginTop: 2 }}>{art.category} · <span style={{ color: green }}>{art.views?.toLocaleString()} views</span></div>
                </div>
                <TypePill type={art.type} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
