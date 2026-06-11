"use client"

import { useEffect, useMemo, useState } from "react"

// ── API Types ─────────────────────────────────────────────────────────────────

type ApiArticleType = "sop" | "policy" | "guide" | "faq"
type ApiArticleCategory = "operations" | "hr" | "finance" | "procurement" | "fleet" | "projects"

interface ApiArticle {
  id: string
  title: string
  type: ApiArticleType
  typeLabel: string
  category: ApiArticleCategory
  categoryLabel: string
  author: string
  updatedDate: string
  readMinutes: number
  views: number
  version: string | null
  isPinned: boolean
  readProgress: number
}

interface ApiMeta {
  total: number
  sopCount: number
  recentlyUpdated: number
}

// ── Local UI Types ────────────────────────────────────────────────────────────

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

// ── Mappers ───────────────────────────────────────────────────────────────────

const API_TYPE_MAP: Record<ApiArticleType, ArticleType> = {
  sop: "SOP",
  policy: "Policy",
  guide: "Guide",
  faq: "FAQ",
}

const API_CATEGORY_MAP: Record<ApiArticleCategory, ArticleCategory> = {
  operations: "Operations",
  hr: "HR",
  finance: "Finance",
  procurement: "Procurement",
  fleet: "Fleet",
  projects: "Projects",
}

const DEFAULT_TOC: Record<ArticleType, string[]> = {
  SOP: [
    "Scop și domeniu",
    "Resurse necesare",
    "Proceduri detaliate",
    "Măsuri de siguranță",
    "Raportare și înregistrare",
  ],
  Policy: [
    "Introducere",
    "Politică generală",
    "Reguli și excepții",
    "Responsabilități",
    "Revizuiri",
  ],
  Guide: ["Prezentare generală", "Pași de urmat", "Exemple practice", "Întrebări frecvente"],
  FAQ: ["Întrebări comune", "Răspunsuri detaliate", "Resurse suplimentare"],
}

function mapToArticle(a: ApiArticle): Article {
  const type = API_TYPE_MAP[a.type]
  const category = API_CATEGORY_MAP[a.category]
  return {
    id: a.id,
    title: a.title,
    type,
    category,
    updated: a.updatedDate,
    readMin: a.readMinutes,
    views: a.views || undefined,
    author: a.author !== "—" ? a.author : undefined,
    version: a.version ?? undefined,
    toc: DEFAULT_TOC[type],
  }
}

// ── Style vars ────────────────────────────────────────────────────────────────

const g1 = "var(--prv-g1)"
const g2 = "var(--prv-g2)"
const bds = "var(--prv-border-subtle)"
const t2 = "var(--prv-text-2)"
const t3 = "var(--prv-text-3)"
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
  return (
    <div
      style={{
        position: "absolute",
        inset: "0 0 auto",
        height: 1,
        background: "linear-gradient(90deg,transparent,var(--prv-border),transparent)",
      }}
    />
  )
}

function TypePill({ type }: { type: ArticleType }) {
  const styles: Record<ArticleType, React.CSSProperties> = {
    SOP: { background: "rgba(10,132,255,0.12)", color: "rgba(10,132,255,0.9)" },
    Policy: { background: "rgba(191,90,242,0.12)", color: "rgba(191,90,242,0.95)" },
    Guide: { background: "rgba(48,209,88,0.12)", color: green },
    FAQ: { background: "rgba(255,159,10,0.12)", color: "rgba(255,159,10,0.95)" },
  }
  return (
    <span
      style={{
        ...styles[type],
        fontSize: 10,
        fontWeight: 600,
        padding: "3px 8px",
        borderRadius: 6,
      }}
    >
      {type}
    </span>
  )
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
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function KnowledgeWorkspace() {
  const [articles, setArticles] = useState<Article[]>([])
  const [meta, setMeta] = useState<ApiMeta>({ total: 0, sopCount: 0, recentlyUpdated: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Article | null>(null)
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null)
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch("/api/knowledge/")
        if (!res.ok) return
        const data = (await res.json()) as { articles: ApiArticle[]; meta: ApiMeta }
        if (cancelled) return
        setArticles(data.articles.map(mapToArticle))
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

  function toggleCheck(artId: string, idx: number) {
    const key = `${artId}-${idx}`
    setChecklist((c) => ({ ...c, [key]: !c[key] }))
  }

  function isChecked(art: Article, idx: number) {
    const key = `${art.id}-${idx}`
    return key in checklist ? checklist[key] : (art.checklist?.[idx]?.checked ?? false)
  }

  const recent = useMemo(() => articles.slice(0, 3), [articles])
  const popular = useMemo(
    () =>
      [...articles]
        .filter((a) => a.views)
        .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
        .slice(0, 4),
    [articles]
  )

  const catCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const a of articles) counts[a.type] = (counts[a.type] ?? 0) + 1
    return counts
  }, [articles])

  const categories = useMemo(
    () => [
      {
        label: "SOPs",
        count: catCounts["SOP"] ?? 0,
        bg: "rgba(10,132,255,0.12)",
        stroke: "rgba(10,132,255,0.9)",
      },
      {
        label: "Ghiduri",
        count: catCounts["Guide"] ?? 0,
        bg: "rgba(48,209,88,0.10)",
        stroke: "rgba(48,209,88,0.85)",
      },
      {
        label: "Politici",
        count: catCounts["Policy"] ?? 0,
        bg: "rgba(191,90,242,0.10)",
        stroke: "rgba(191,90,242,0.85)",
      },
      {
        label: "FAQs",
        count: catCounts["FAQ"] ?? 0,
        bg: "rgba(255,159,10,0.10)",
        stroke: "rgba(255,159,10,0.9)",
      },
    ],
    [catCounts]
  )

  const searchResults = useMemo(
    () =>
      search.length > 0
        ? articles.filter(
            (a) =>
              a.title.toLowerCase().includes(search.toLowerCase()) ||
              a.category.toLowerCase().includes(search.toLowerCase())
          )
        : [],
    [articles, search]
  )

  if (selected) {
    const art = selected
    return (
      <div
        style={{
          padding: "32px 16px 120px",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <button
          onClick={() => {
            setSelected(null)
            setFeedback(null)
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            color: t2,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            marginBottom: 20,
            padding: 0,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Baza de cunoștințe
        </button>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
            <TypePill type={art.type} />
            <span style={{ fontSize: 11, color: t3 }}>
              {art.category} · {art.readMin} min citire
            </span>
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
              color: "var(--prv-text-1)",
              marginBottom: 8,
            }}
          >
            {art.title}
          </h1>
          <p style={{ fontSize: 12, color: t3 }}>
            Actualizat {art.updated}
            {art.author ? ` · de ${art.author}` : ""} {art.version ? ` · ${art.version}` : ""}
          </p>
        </div>

        {/* TOC */}
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: t3,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            margin: "0 2px 10px",
          }}
        >
          Cuprins
        </p>
        <div style={card}>
          <TopEdge />
          {art.toc.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 16px",
                borderBottom: i < art.toc.length - 1 ? `1px solid ${bds}` : "none",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: t3, width: 20 }}>{i + 1}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--prv-text-1)" }}>
                {item}
              </div>
            </div>
          ))}
        </div>

        {/* Article body */}
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: t3,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            margin: "18px 2px 10px",
          }}
        >
          Articol
        </p>
        <div style={{ ...card, padding: 16 }}>
          <TopEdge />
          {art.toc.slice(0, 2).map((section, si) => (
            <div key={si}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--prv-text-1)",
                  margin: si > 0 ? "18px 0 10px" : "0 0 10px",
                }}
              >
                {si + 1}. {section}
              </div>
              {si === 1 && art.checklist ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 8 }}>
                  {art.checklist.map((item, idx) => {
                    const done = isChecked(art, idx)
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleCheck(art.id, idx)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 12px",
                          borderRadius: 10,
                          background: done ? "rgba(48,209,88,0.07)" : "var(--prv-border-subtle)",
                          border: `1px solid ${done ? "rgba(48,209,88,0.12)" : bds}`,
                          cursor: "pointer",
                          textAlign: "left",
                          width: "100%",
                        }}
                      >
                        {done ? (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="rgba(48,209,88,0.85)"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <div
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: 3,
                              border: `1.5px solid ${bds}`,
                            }}
                          />
                        )}
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: done ? "var(--prv-text-1)" : t2,
                          }}
                        >
                          {item.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                [100, 90, 95, 70].slice(0, si === 0 ? 4 : 3).map((w, i) => (
                  <div
                    key={i}
                    style={{
                      height: 9,
                      borderRadius: 3,
                      background: "var(--prv-border)",
                      width: `${w}%`,
                      marginBottom: 7,
                    }}
                  />
                ))
              )}
            </div>
          ))}
        </div>

        {/* Feedback */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderRadius: 16,
            background: g1,
            border: `1px solid ${bds}`,
            marginTop: 4,
          }}
        >
          <span style={{ fontSize: 13, color: t2 }}>
            {feedback
              ? feedback === "yes"
                ? "Mulțumim pentru feedback!"
                : "Vom îmbunătăți articolul."
              : "A fost util?"}
          </span>
          {!feedback && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setFeedback("yes")}
                style={{
                  padding: "6px 16px",
                  borderRadius: 8,
                  background: "rgba(48,209,88,0.14)",
                  border: "none",
                  color: green,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Da
              </button>
              <button
                onClick={() => setFeedback("no")}
                style={{
                  padding: "6px 16px",
                  borderRadius: 8,
                  background: g2,
                  border: "none",
                  color: t2,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Nu
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        padding: "32px 16px 120px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <p style={{ fontSize: 13, color: t3, marginBottom: 2 }}>PRV OS</p>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--prv-text-1)",
            }}
          >
            Cunoștințe
          </h1>
        </div>
        <div
          style={{
            padding: "6px 12px",
            borderRadius: 10,
            background: g1,
            border: `1px solid ${bds}`,
            fontSize: 12,
            fontWeight: 500,
            color: t2,
          }}
        >
          {loading ? "…" : `${meta.total} articole`}
        </div>
      </div>

      {/* Search */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "11px 14px",
          background: g1,
          border: `1px solid ${bds}`,
          borderRadius: 14,
          marginBottom: 18,
        }}
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--prv-text-3)"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Caută proceduri, ghiduri, SOPs…"
          style={{
            flex: 1,
            background: "none",
            border: "none",
            outline: "none",
            fontSize: 15,
            color: "var(--prv-text-1)",
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

      {/* Search results */}
      {searchResults.length > 0 && (
        <>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: t3,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              margin: "0 2px 10px",
            }}
          >
            {searchResults.length} rezultate
          </p>
          <div style={card}>
            <TopEdge />
            {searchResults.map((art, i) => (
              <button
                key={art.id}
                onClick={() => setSelected(art)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "14px 16px",
                  borderBottom: i < searchResults.length - 1 ? `1px solid ${bds}` : "none",
                  width: "100%",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <ArticleIcon type={art.type} />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                      marginBottom: 2,
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--prv-text-1)" }}>
                      {art.title}
                    </span>
                    <TypePill type={art.type} />
                  </div>
                  <div style={{ fontSize: 11, color: t3 }}>
                    {art.category} · {art.readMin} min citire
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {search === "" && (
        <>
          {/* Category grid */}
          {loading ? (
            <div
              style={{
                height: 140,
                borderRadius: 16,
                background: g1,
                border: `1px solid ${bds}`,
                marginBottom: 18,
              }}
            />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2,1fr)",
                gap: 10,
                marginBottom: 18,
              }}
            >
              {categories.map((cat) => (
                <div
                  key={cat.label}
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    background: g1,
                    border: `1px solid ${bds}`,
                    position: "relative",
                    overflow: "hidden",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: "0 0 auto",
                      height: 1,
                      background:
                        "linear-gradient(90deg,transparent,var(--prv-border),transparent)",
                    }}
                  />
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: cat.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 10,
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={cat.stroke}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                    </svg>
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--prv-text-1)",
                      marginBottom: 3,
                    }}
                  >
                    {cat.label}
                  </div>
                  <div style={{ fontSize: 11, color: t3 }}>
                    {cat.count}{" "}
                    {cat.label === "FAQs"
                      ? "răspunsuri"
                      : cat.label === "Ghiduri"
                        ? "ghiduri"
                        : "documente"}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recently viewed */}
          {recent.length > 0 && (
            <>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: t3,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  margin: "0 2px 10px",
                }}
              >
                Recente
              </p>
              <div style={card}>
                <TopEdge />
                {recent.map((art, i) => (
                  <button
                    key={art.id}
                    onClick={() => setSelected(art)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "14px 16px",
                      borderBottom: i < recent.length - 1 ? `1px solid ${bds}` : "none",
                      width: "100%",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <ArticleIcon type={art.type} />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                          marginBottom: 2,
                        }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--prv-text-1)" }}>
                          {art.title}
                        </span>
                        <TypePill type={art.type} />
                      </div>
                      <div style={{ fontSize: 11, color: t3 }}>
                        {art.category} · Actualizat {art.updated} · {art.readMin} min
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Popular */}
          {popular.length > 0 && (
            <>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: t3,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  margin: "18px 2px 10px",
                }}
              >
                Cele mai vizualizate
              </p>
              <div style={card}>
                <TopEdge />
                {popular.map((art, i) => (
                  <button
                    key={art.id}
                    onClick={() => setSelected(art)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 16px",
                      borderBottom: i < popular.length - 1 ? `1px solid ${bds}` : "none",
                      width: "100%",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        textAlign: "center",
                        fontSize: 16,
                        fontWeight: 800,
                        color: t3,
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--prv-text-1)" }}>
                        {art.title}
                      </div>
                      <div style={{ fontSize: 11, color: t3, marginTop: 2 }}>
                        {art.category} ·{" "}
                        <span style={{ color: green }}>
                          {art.views?.toLocaleString()} vizualizări
                        </span>
                      </div>
                    </div>
                    <TypePill type={art.type} />
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Empty state */}
          {!loading && articles.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 0", color: t3, fontSize: 14 }}>
              Niciun articol disponibil momentan.
            </div>
          )}
        </>
      )}
    </div>
  )
}
