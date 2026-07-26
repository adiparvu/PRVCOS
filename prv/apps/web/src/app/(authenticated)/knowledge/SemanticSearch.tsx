"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

// Semantic search over the knowledge base (preview approved 2026-07).
// One field, two modes: typing filters article titles locally (the parent
// owns that via onQueryChange); Enter asks POST /api/knowledge/semantic-search
// and the fragment results replace the article grid while active.

export interface SemanticResult {
  articleId: string
  articleTitle: string | null
  chunkIndex: number
  excerpt: string
  similarity: number
}

type Mode = "idle" | "loading" | "results" | "empty" | "not_configured" | "error"

const t1 = "var(--prv-text-1)"
const t2 = "var(--prv-text-2)"
const t3 = "var(--prv-text-3)"

function SearchGlyph({ color }: { color: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function ResultCard({ result }: { result: SemanticResult }) {
  const pct = Math.round(result.similarity * 100)
  return (
    <li style={{ listStyle: "none" }}>
      <Link
        href={`/knowledge/${result.articleId}`}
        style={{
          display: "block",
          textDecoration: "none",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 20,
          padding: "16px 18px 14px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: "rgba(255,255,255,0.25)",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: t1 }}>
            {result.articleTitle ?? "Articol"}
          </span>
          <span
            style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}
            aria-label={`Relevanță ${pct} la sută`}
          >
            <span
              aria-hidden="true"
              style={{
                width: 56,
                height: 3,
                borderRadius: 2,
                background: "rgba(255,255,255,0.12)",
                overflow: "hidden",
                display: "inline-block",
              }}
            >
              <span
                style={{
                  display: "block",
                  height: "100%",
                  width: `${pct}%`,
                  background: "rgba(255,255,255,0.85)",
                  borderRadius: 2,
                }}
              />
            </span>
            <span style={{ fontSize: 12, color: t3, fontVariantNumeric: "tabular-nums" }}>
              {pct}%
            </span>
          </span>
        </div>
        <p style={{ fontSize: 13.5, lineHeight: 1.55, color: t2, margin: "8px 0 0" }}>
          …{result.excerpt}…
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 12,
          }}
        >
          <span style={{ fontSize: 12, color: t3 }}>fragmentul {result.chunkIndex + 1}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: t1 }}>Deschide articolul →</span>
        </div>
      </Link>
    </li>
  )
}

function StatePanel({
  glyph,
  title,
  description,
  cta,
}: {
  glyph: string
  title: string
  description: string
  cta?: { label: string; onClick: () => void }
}) {
  return (
    <div
      role="status"
      style={{
        textAlign: "center",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 20,
        padding: "28px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: "rgba(255,255,255,0.25)",
        }}
      />
      <div aria-hidden="true" style={{ fontSize: 22, color: t3 }}>
        {glyph}
      </div>
      <p style={{ fontSize: 15, fontWeight: 600, color: t1, margin: "10px 0 0" }}>{title}</p>
      <p
        style={{
          fontSize: 13,
          color: t2,
          margin: "6px auto 0",
          lineHeight: 1.5,
          maxWidth: 440,
        }}
      >
        {description}
      </p>
      {cta && (
        <button
          onClick={cta.onClick}
          style={{
            marginTop: 14,
            fontSize: 13,
            fontWeight: 700,
            background: "rgba(255,255,255,0.10)",
            color: t1,
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 100,
            padding: "8px 18px",
            cursor: "pointer",
          }}
        >
          {cta.label}
        </button>
      )}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div
      aria-hidden="true"
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 20,
        padding: "16px 18px",
      }}
    >
      {["60%", "90%", "40%"].map((w, i) => (
        <div
          key={i}
          style={{
            height: 12,
            width: w,
            borderRadius: 6,
            background: "rgba(255,255,255,0.08)",
            marginTop: i === 0 ? 0 : 10,
          }}
        />
      ))}
    </div>
  )
}

export function SemanticSearch({
  onQueryChange,
  onActiveChange,
}: {
  /** fires on every keystroke — the parent filters article titles locally */
  onQueryChange: (query: string) => void
  /** true while semantic results (any post-Enter state) replace the grid */
  onActiveChange: (active: boolean) => void
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [mode, setMode] = useState<Mode>("idle")
  const [results, setResults] = useState<SemanticResult[]>([])
  const requestSeq = useRef(0)

  const active = mode !== "idle"
  useEffect(() => {
    onActiveChange(active)
  }, [active, onActiveChange])

  const reset = useCallback(() => {
    requestSeq.current++
    setMode("idle")
    setResults([])
  }, [])

  async function runSearch() {
    const q = query.trim()
    if (q.length < 2) return
    const seq = ++requestSeq.current
    setMode("loading")
    try {
      const res = await fetch("/api/knowledge/semantic-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query: q, limit: 5 }),
      })
      if (seq !== requestSeq.current) return // superseded by clear or a newer search
      if (!res.ok) {
        setMode("error")
        return
      }
      const body = (await res.json()) as { results: SemanticResult[]; reason?: string }
      if (seq !== requestSeq.current) return
      if (body.reason === "not_configured") setMode("not_configured")
      else if (body.results.length === 0) setMode("empty")
      else {
        setResults(body.results)
        setMode("results")
      }
    } catch {
      if (seq === requestSeq.current) setMode("error")
    }
  }

  return (
    <div role="search" aria-label="Căutare în Knowledge">
      {/* Floating pill search bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "rgba(255,255,255,0.10)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 100,
          padding: "12px 18px",
          backdropFilter: "blur(48px) saturate(180%)",
          position: "relative",
          overflow: "hidden",
          marginBottom: active ? 14 : 12,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: "rgba(255,255,255,0.32)",
          }}
        />
        <SearchGlyph color="rgba(255,255,255,0.50)" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            onQueryChange(e.target.value)
            if (e.target.value === "") reset()
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void runSearch()
            if (e.key === "Escape") {
              setQuery("")
              onQueryChange("")
              reset()
            }
          }}
          placeholder="Caută sau întreabă baza de cunoștințe…"
          aria-label="Caută în titluri sau întreabă baza de cunoștințe; Enter pornește căutarea semantică"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: 15,
            color: t1,
          }}
        />
        {query.trim().length >= 2 && !active && (
          <span
            aria-hidden="true"
            style={{
              fontSize: 11,
              color: t3,
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 6,
              padding: "2px 7px",
              whiteSpace: "nowrap",
            }}
          >
            ↵ caută în conținut
          </span>
        )}
        {active && (
          <button
            onClick={() => {
              setQuery("")
              onQueryChange("")
              reset()
            }}
            aria-label="Închide căutarea semantică"
            style={{
              background: "transparent",
              border: "none",
              color: t2,
              fontSize: 15,
              cursor: "pointer",
              padding: 2,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {mode === "loading" && (
        <div aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {mode === "results" && (
        <>
          <p style={{ fontSize: 12, color: t3, margin: "0 0 10px" }}>
            <span style={{ color: t2, fontWeight: 600 }}>
              {results.length}{" "}
              {results.length === 1 ? "potrivire semantică" : "potriviri semantice"}
            </span>
            {" · "}întrebarea e comparată cu înțelesul textului, nu cu titlurile
          </p>
          <ul style={{ display: "flex", flexDirection: "column", gap: 12, margin: 0, padding: 0 }}>
            {results.map((r) => (
              <ResultCard key={`${r.articleId}-${r.chunkIndex}`} result={r} />
            ))}
          </ul>
        </>
      )}

      {mode === "empty" && (
        <StatePanel
          glyph="◌"
          title="Nimic suficient de apropiat"
          description="Niciun articol nu se apropie de sensul întrebării. Încearcă o formulare diferită — sau scrie articolul care lipsește."
          cta={{ label: "Scrie un articol +", onClick: () => router.push("/knowledge/new") }}
        />
      )}

      {mode === "not_configured" && (
        <StatePanel
          glyph="◇"
          title="Căutarea semantică nu e activată"
          description="Filtrarea după titlu funcționează în continuare. Căutarea în înțelesul conținutului se activează la provizionarea serviciului de embeddings — un pas de configurare, nu o eroare."
        />
      )}

      {mode === "error" && (
        <StatePanel
          glyph="◍"
          title="Căutarea nu a reușit"
          description="A apărut o problemă temporară. Încearcă din nou — filtrarea după titlu rămâne disponibilă."
        />
      )}
    </div>
  )
}
