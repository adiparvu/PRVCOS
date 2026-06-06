"use client"

import { useState } from "react"

type FilterType = "All" | "In Progress" | "Completed" | "Saved"
type CourseStatus = "In Progress" | "Completed" | "New" | "Saved"

interface Course {
  id: string
  title: string
  subtitle: string
  modules: number
  totalModules: number
  duration: string
  status: CourseStatus
  progress: number
  category: string
  hasCert?: boolean
}

interface Category {
  label: string
  count: number
  icon: React.ReactNode
}

interface Achievement {
  id: string
  label: string
  detail: string
  date: string
  color: string
}

// ── Data ─────────────────────────────────────────────────────────────────────

const FEATURED: Course = {
  id: "c0",
  title: "Health & Safety on Construction Sites",
  subtitle: "Module 3 of 6 · Safety Certification",
  modules: 3,
  totalModules: 6,
  duration: "45 min left",
  status: "In Progress",
  progress: 48,
  category: "Safety",
  hasCert: true,
}

const COURSES: Course[] = [
  { id: "c1", title: "Fire Safety & Emergency Procedures",     subtitle: "Module 2 of 4 · 20 min left",   modules: 2, totalModules: 4, duration: "20 min", status: "In Progress", progress: 40,  category: "Safety"  },
  { id: "c2", title: "GDPR & Data Protection Basics",          subtitle: "Module 4 of 5 · 12 min left",   modules: 4, totalModules: 5, duration: "12 min", status: "In Progress", progress: 72,  category: "Compliance" },
  { id: "c3", title: "Project Management Fundamentals",        subtitle: "6 modules · 2h 30min · Cert",   modules: 0, totalModules: 6, duration: "2h 30m", status: "New",         progress: 0,   category: "Leadership", hasCert: true },
  { id: "c4", title: "Customer Communication Skills",          subtitle: "4 modules · 1h 45min · Quiz",   modules: 0, totalModules: 4, duration: "1h 45m", status: "New",         progress: 0,   category: "Leadership" },
  { id: "c5", title: "Advanced Excel for Operations",          subtitle: "8 modules · 3h 10min · Assess", modules: 0, totalModules: 8, duration: "3h 10m", status: "New",         progress: 0,   category: "Digital Skills" },
  { id: "c6", title: "Renovation Safety Standards 2026",       subtitle: "Completed · Jun 4",             modules: 5, totalModules: 5, duration: "2h 00m", status: "Completed",   progress: 100, category: "Renovation", hasCert: true },
  { id: "c7", title: "Workplace Ergonomics",                   subtitle: "Completed · May 28",            modules: 3, totalModules: 3, duration: "1h 20m", status: "Completed",   progress: 100, category: "Safety" },
]

const ACHIEVEMENTS: Achievement[] = [
  { id: "a1", label: "Safety Champion",       detail: "Completed all Safety module tracks",    date: "Jun 4",  color: "rgba(255,159,10,0.90)"  },
  { id: "a2", label: "10 Courses Milestone",  detail: "Completed 10 courses this quarter",     date: "May 28", color: "rgba(48,209,88,0.90)"   },
]

// ── CSS tokens ────────────────────────────────────────────────────────────────

const g1  = "var(--prv-g1)"
const g2  = "var(--prv-g2)"
const bds = "var(--prv-border-subtle)"
const bd  = "var(--prv-border)"
const t1  = "var(--prv-text-1)"
const t2  = "var(--prv-text-2)"
const t3  = "var(--prv-text-3)"

// ── Helpers ───────────────────────────────────────────────────────────────────

function Specular() {
  return <div style={{ position: "absolute", inset: "0 0 auto", height: 1, background: `linear-gradient(90deg,transparent,${bd},transparent)` }} />
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 4, background: bd, borderRadius: 2, overflow: "hidden", marginTop: 8 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: t2, borderRadius: 2 }} />
    </div>
  )
}

function StatusPill({ status, progress }: { status: CourseStatus; progress: number }) {
  if (status === "In Progress") return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: "rgba(255,159,10,0.15)", color: "rgba(255,159,10,0.95)", whiteSpace: "nowrap", flexShrink: 0 }}>
      {progress}%
    </span>
  )
  if (status === "Completed") return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: "rgba(48,209,88,0.12)", color: "rgba(48,209,88,0.90)", whiteSpace: "nowrap", flexShrink: 0 }}>
      Done
    </span>
  )
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: g2, color: t1, whiteSpace: "nowrap", flexShrink: 0 }}>
      New
    </span>
  )
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Safety: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t2} strokeWidth="1.7" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  ),
  Leadership: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t2} strokeWidth="1.7" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  ),
  "Digital Skills": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t2} strokeWidth="1.7" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
  ),
  Finance: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t2} strokeWidth="1.7" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
  ),
  Renovation: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t2} strokeWidth="1.7" strokeLinecap="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  ),
  Compliance: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t2} strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
  ),
}

const CATEGORIES: Category[] = [
  { label: "Safety",        count: 8,  icon: CATEGORY_ICONS["Safety"] },
  { label: "Leadership",    count: 6,  icon: CATEGORY_ICONS["Leadership"] },
  { label: "Digital Skills",count: 11, icon: CATEGORY_ICONS["Digital Skills"] },
  { label: "Finance",       count: 5,  icon: CATEGORY_ICONS["Finance"] },
  { label: "Renovation",    count: 9,  icon: CATEGORY_ICONS["Renovation"] },
  { label: "Compliance",    count: 7,  icon: CATEGORY_ICONS["Compliance"] },
]

// ── Detail panel ──────────────────────────────────────────────────────────────

function CourseDetail({ course, onClose }: { course: Course; onClose: () => void }) {
  const modules = Array.from({ length: course.totalModules }, (_, i) => ({
    idx: i + 1,
    done: i < course.modules,
    active: i === course.modules && course.status === "In Progress",
  }))

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 0 0" }}>
      <div style={{ width: "100%", maxWidth: 480, background: g2, border: `1px solid ${bd}`, borderRadius: "28px 28px 0 0", overflow: "hidden", position: "relative", paddingBottom: 32 }}>
        <Specular />
        {/* drag handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 6 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: bd }} />
        </div>

        <div style={{ padding: "0 20px 0" }}>
          {/* header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: t3, marginBottom: 4 }}>{course.category}</div>
              <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.25, color: t1, marginBottom: 4 }}>{course.title}</div>
              <div style={{ fontSize: 13, color: t2 }}>{course.totalModules} modules · {course.duration}{course.hasCert ? " · Certificate" : ""}</div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: g1, border: `1px solid ${bds}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t3} strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* progress */}
          {course.status !== "New" && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: t3, marginBottom: 6 }}>
                <span>Progress</span>
                <span>{course.progress}%</span>
              </div>
              <div style={{ height: 6, background: bds, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${course.progress}%`, background: t2, borderRadius: 3 }} />
              </div>
            </div>
          )}

          {/* modules list */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: t3, marginBottom: 10 }}>Modules</div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
              {modules.map((m) => (
                <div key={m.idx} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, background: m.active ? g2 : g1, border: `1px solid ${m.active ? bd : bds}` }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: m.done ? "rgba(48,209,88,0.12)" : m.active ? g2 : bds, border: `1px solid ${m.done ? "rgba(48,209,88,0.25)" : bds}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {m.done
                      ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(48,209,88,0.90)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      : <span style={{ fontSize: 10, fontWeight: 700, color: m.active ? t1 : t3 }}>{m.idx}</span>
                    }
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: m.done ? t2 : m.active ? t1 : t3 }}>
                    Module {m.idx}{m.active ? " — Current" : m.done ? " — Completed" : ""}
                  </span>
                  {m.active && (
                    <div style={{ marginLeft: "auto" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t3} strokeWidth="1.7" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button style={{ width: "100%", padding: "14px", borderRadius: 16, background: t1, color: "var(--prv-bg)", fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer" }}>
            {course.status === "New" ? "Start Course" : course.status === "Completed" ? "Review Course" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function LearningWorkspace() {
  const [filter, setFilter] = useState<FilterType>("All")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Course | null>(null)

  const FILTERS: FilterType[] = ["All", "In Progress", "Completed", "Saved"]

  const inProgress = COURSES.filter(c => c.status === "In Progress")
  const recommended = COURSES.filter(c => c.status === "New")
  const completed = COURSES.filter(c => c.status === "Completed")

  const filtered = COURSES.filter(c => {
    const matchFilter =
      filter === "All" ||
      (filter === "In Progress" && c.status === "In Progress") ||
      (filter === "Completed" && c.status === "Completed") ||
      (filter === "Saved" && c.status === "Saved")
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const showAll = filter !== "All" || search

  return (
    <div style={{ paddingBottom: 120 }}>

      {/* ── Header ── */}
      <div style={{ padding: "6px 16px 4px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: t1 }}>Learning Center</h1>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: g1, border: `1px solid ${bds}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t2} strokeWidth="1.7" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
        </div>
        <p style={{ fontSize: 14, color: t2 }}>3 courses in progress · 12 completed</p>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "flex", gap: 8, padding: "16px 16px 0" }}>
        {[
          { val: "12",  lbl: "Completed"  },
          { val: "3",   lbl: "In Progress" },
          { val: "14h", lbl: "This Month" },
          { val: "86%", lbl: "Avg. Score" },
        ].map(s => (
          <div key={s.lbl} style={{ flex: 1, padding: "12px 8px", borderRadius: 14, background: g1, border: `1px solid ${bds}`, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: t1, marginBottom: 2 }}>{s.val}</div>
            <div style={{ fontSize: 10, color: t3 }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 14, background: "var(--prv-border-subtle)", border: `1px solid ${bds}`, margin: "14px 16px 0" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t3} strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search courses, guides, certifications…"
          style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 14, color: t1, fontFamily: "inherit" }}
        />
      </div>

      {/* ── Filter ── */}
      <div style={{ display: "flex", gap: 4, padding: "3px", background: g1, borderRadius: 10, margin: "12px 16px 0" }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ flex: 1, padding: "6px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, color: filter === f ? t1 : t3, background: filter === f ? g2 : "transparent", border: "none", cursor: "pointer", transition: "all 0.15s" }}>
            {f}
          </button>
        ))}
      </div>

      {showAll ? (
        /* ── Filtered list ── */
        <div style={{ padding: "20px 16px 0" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: t3, fontSize: 14 }}>No courses found</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map(c => (
                <div key={c.id} onClick={() => setSelected(c)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16, background: g1, border: `1px solid ${bds}`, cursor: "pointer", position: "relative" }}>
                  <Specular />
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: g2, border: `1px solid ${bd}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {CATEGORY_ICONS[c.category] ?? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={t2} strokeWidth="1.7" strokeLinecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: t1, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: t3 }}>{c.subtitle}</div>
                    {c.status === "In Progress" && <ProgressBar pct={c.progress} />}
                  </div>
                  <StatusPill status={c.status} progress={c.progress} />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* ── Featured course ── */}
          <div style={{ margin: "20px 16px 0", borderRadius: 20, background: g1, border: `1px solid ${bd}`, overflow: "hidden", position: "relative", cursor: "pointer" }} onClick={() => setSelected(FEATURED)}>
            <Specular />
            {/* thumbnail */}
            <div style={{ height: 110, background: `linear-gradient(135deg,${g1} 0%,${bds} 100%)`, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4, padding: 12, width: "100%" }}>
                {[1,0,1,0,0,1,0,1,1,0,0,1].map((a,i) => (
                  <div key={i} style={{ height: 20, borderRadius: 4, background: a ? bd : bds }} />
                ))}
              </div>
              <div style={{ position: "absolute", width: 44, height: 44, borderRadius: "50%", background: "var(--prv-border)", border: `1px solid ${bd}`, backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill={t1} stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
            </div>
            <div style={{ padding: "14px 16px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", padding: "3px 8px", borderRadius: 6, background: g2, color: t1, marginBottom: 8 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: t2, display: "inline-block" }} />
                Featured
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: t1, marginBottom: 4 }}>{FEATURED.title}</div>
              <div style={{ fontSize: 13, color: t2, marginBottom: 2 }}>{FEATURED.subtitle}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <span style={{ fontSize: 11, color: t3 }}>{FEATURED.duration}</span>
                  <span style={{ fontSize: 11, color: t3 }}>{FEATURED.modules} of {FEATURED.totalModules} modules</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: "rgba(255,159,10,0.15)", color: "rgba(255,159,10,0.95)" }}>In Progress</span>
              </div>
              <ProgressBar pct={FEATURED.progress} />
            </div>
          </div>

          {/* ── Continue Learning ── */}
          <div style={{ padding: "20px 16px 0" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: t3, marginBottom: 12 }}>Continue Learning</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {inProgress.map(c => (
                <div key={c.id} onClick={() => setSelected(c)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16, background: g1, border: `1px solid ${bds}`, cursor: "pointer", position: "relative" }}>
                  <Specular />
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: g2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {CATEGORY_ICONS[c.category]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: t1, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: t3 }}>{c.subtitle}</div>
                    <ProgressBar pct={c.progress} />
                  </div>
                  <StatusPill status={c.status} progress={c.progress} />
                </div>
              ))}
            </div>
          </div>

          {/* ── Categories ── */}
          <div style={{ padding: "20px 16px 0" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: t3, marginBottom: 12 }}>Browse by Category</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {CATEGORIES.map(cat => (
                <div key={cat.label} style={{ padding: 14, borderRadius: 16, background: g1, border: `1px solid ${bds}`, cursor: "pointer" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: g2, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                    {cat.icon}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t1 }}>{cat.label}</div>
                  <div style={{ fontSize: 11, color: t3, marginTop: 2 }}>{cat.count} courses</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Recommended ── */}
          <div style={{ padding: "20px 16px 0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: t3 }}>Recommended for You</div>
              <span style={{ fontSize: 12, color: t3, cursor: "pointer" }}>See all</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recommended.map(c => (
                <div key={c.id} onClick={() => setSelected(c)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16, background: g1, border: `1px solid ${bds}`, cursor: "pointer", position: "relative" }}>
                  <Specular />
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: g2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {CATEGORY_ICONS[c.category]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: t1, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: t3 }}>{c.subtitle}</div>
                  </div>
                  <StatusPill status={c.status} progress={c.progress} />
                </div>
              ))}
            </div>
          </div>

          {/* ── Achievements ── */}
          <div style={{ padding: "20px 16px 0" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: t3, marginBottom: 12 }}>Recent Achievements</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ACHIEVEMENTS.map(a => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 14, background: g1, border: `1px solid ${bds}` }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: g2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a.color} strokeWidth="1.7" strokeLinecap="round">
                      {a.color.includes("255,159") ? (
                        <>
                          <circle cx="12" cy="8" r="6"/>
                          <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
                        </>
                      ) : (
                        <>
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                          <polyline points="22 4 12 14.01 9 11.01"/>
                        </>
                      )}
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: t1, marginBottom: 2 }}>{a.label}</div>
                    <div style={{ fontSize: 12, color: t3 }}>{a.detail}</div>
                  </div>
                  <div style={{ fontSize: 11, color: t3 }}>{a.date}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Completed ── */}
          <div style={{ padding: "20px 16px 0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: t3 }}>Completed</div>
              <span style={{ fontSize: 12, color: t3, cursor: "pointer" }}>See all 12</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {completed.map(c => (
                <div key={c.id} onClick={() => setSelected(c)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16, background: g1, border: `1px solid ${bds}`, cursor: "pointer", position: "relative" }}>
                  <Specular />
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: g2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {CATEGORY_ICONS[c.category]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: t1, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: t3 }}>{c.subtitle}</div>
                  </div>
                  <StatusPill status={c.status} progress={c.progress} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Course detail sheet ── */}
      {selected && <CourseDetail course={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
