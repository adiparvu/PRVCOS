"use client"

import { useState } from "react"
import Link from "next/link"
import { useSheetStack } from "@prv/ui"
import type { KnowledgeArticle, KnowledgeMeta, ArticleType } from "@/app/api/knowledge/route"
import { useKnowledgeArticles } from "@/lib/api-hooks"

type FilterType = "Toate" | "SOP" | "Politici" | "Ghiduri" | "FAQ"

const FILTER_TO_TYPE: Record<FilterType, ArticleType | null> = {
  Toate: null,
  SOP: "sop",
  Politici: "policy",
  Ghiduri: "guide",
  FAQ: "faq",
}

const FILTERS: FilterType[] = ["Toate", "SOP", "Politici", "Ghiduri", "FAQ"]

const g1 = "var(--prv-g1)"
const bds = "var(--prv-border-subtle)"
const t3 = "var(--prv-text-3)"
const green = "rgba(48,209,88,0.95)"
const blue = "rgba(10,132,255,0.9)"
const amber = "rgba(255,159,10,0.95)"

function typeConfig(type: ArticleType): {
  bg: string
  stroke: string
  label: string
  pillBg: string
  pillColor: string
} {
  if (type === "sop")
    return {
      bg: "rgba(10,132,255,0.10)",
      stroke: "rgba(10,132,255,0.85)",
      label: "SOP",
      pillBg: "rgba(10,132,255,0.13)",
      pillColor: blue,
    }
  if (type === "policy")
    return {
      bg: "rgba(191,90,242,0.10)",
      stroke: "rgba(191,90,242,0.85)",
      label: "Politică",
      pillBg: "rgba(191,90,242,0.13)",
      pillColor: "rgba(191,90,242,0.9)",
    }
  if (type === "guide")
    return {
      bg: "rgba(48,209,88,0.09)",
      stroke: "rgba(48,209,88,0.80)",
      label: "Ghid",
      pillBg: "rgba(48,209,88,0.13)",
      pillColor: green,
    }
  return {
    bg: "rgba(255,159,10,0.10)",
    stroke: "rgba(255,159,10,0.85)",
    label: "FAQ",
    pillBg: "rgba(255,159,10,0.13)",
    pillColor: amber,
  }
}

function TypeIcon({ type }: { type: ArticleType }) {
  const cfg = typeConfig(type)
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: cfg.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {type === "sop" || type === "guide" ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={cfg.stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ) : type === "policy" ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={cfg.stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={cfg.stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )}
    </div>
  )
}

function ArticleRow({ article }: { article: KnowledgeArticle }) {
  const cfg = typeConfig(article.type)
  const isRecent = article.updatedDate.includes("Iun") || article.updatedDate.includes("Mai")
  return (
    <Link
      href={`/knowledge/${article.id}`}
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: "13px 14px",
        marginBottom: 8,
        background: g1,
        border: `1px solid ${bds}`,
        borderRadius: 14,
        textDecoration: "none",
      }}
    >
      <TypeIcon type={article.type} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--prv-text-1)",
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {article.title}
          </p>
          <span
            style={{
              background: cfg.pillBg,
              color: cfg.pillColor,
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 9px",
              borderRadius: 100,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {cfg.label}
          </span>
        </div>
        <p style={{ fontSize: 12, color: t3, margin: "2px 0 0" }}>
          {article.categoryLabel}
          {article.version ? ` · ${article.version}` : ""}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.30)" }}>
            {article.readMinutes} min ·{" "}
            {article.views >= 1000 ? `${(article.views / 1000).toFixed(1)}k` : article.views} viz.
          </span>
          {isRecent && (
            <span style={{ fontSize: 10, color: "rgba(48,209,88,0.75)", fontWeight: 600 }}>
              ● Actualizat
            </span>
          )}
          {article.readProgress > 0 && article.readProgress < 100 && (
            <span style={{ fontSize: 10, color: "rgba(10,132,255,0.8)", fontWeight: 600 }}>
              {article.readProgress}% citit
            </span>
          )}
          {article.readProgress === 100 && (
            <span style={{ fontSize: 10, color: "rgba(48,209,88,0.75)", fontWeight: 600 }}>
              ✓ Citit
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        color: t3,
        padding: "0 2px 8px",
        marginTop: 6,
      }}
    >
      {children}
    </p>
  )
}

function FeaturedCard({ article }: { article: KnowledgeArticle }) {
  return (
    <Link
      href={`/knowledge/${article.id}`}
      style={{
        display: "block",
        margin: "0 0 12px",
        background: "rgba(255,255,255,0.06)",
        border: `1px solid rgba(255,255,255,0.10)`,
        borderRadius: 18,
        padding: 16,
        textDecoration: "none",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "0 0 auto",
          height: 1,
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)",
        }}
      />
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          background: "rgba(10,132,255,0.12)",
          border: "1px solid rgba(10,132,255,0.22)",
          color: "rgba(10,132,255,0.9)",
          fontSize: 11,
          fontWeight: 700,
          padding: "3px 9px",
          borderRadius: 100,
          marginBottom: 8,
        }}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        SOP · {article.categoryLabel}
      </div>
      <p
        style={{
          fontSize: 16,
          fontWeight: 700,
          lineHeight: 1.3,
          color: "var(--prv-text-1)",
          margin: "0 0 8px",
        }}
      >
        {article.title}
      </p>
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", margin: 0 }}>
        {article.version} · {article.author} · {article.readMinutes} min citire · {article.views}{" "}
        vizualizări
      </p>
      {article.readProgress > 0 && (
        <>
          <div
            style={{
              height: 3,
              background: "rgba(255,255,255,0.08)",
              borderRadius: 2,
              marginTop: 10,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${article.readProgress}%`,
                height: "100%",
                background: "rgba(10,132,255,0.8)",
                borderRadius: 2,
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 11, color: "rgba(10,132,255,0.75)", fontWeight: 600 }}>
              {article.readProgress}% citit
            </span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
              Actualizat {article.updatedDate}
            </span>
          </div>
        </>
      )}
    </Link>
  )
}

export function KnowledgeListClient() {
  const [filter, setFilter] = useState<FilterType>("Toate")
  const { openSheet } = useSheetStack()
  const type = FILTER_TO_TYPE[filter]
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } = useKnowledgeArticles(type)
  const articles: KnowledgeArticle[] = data?.articles ?? []
  const meta: KnowledgeMeta | null = data?.meta ?? null

  const pinned = articles.find((a) => a.isPinned)
  const sops = articles.filter((a) => a.type === "sop" && !a.isPinned)
  const policies = articles.filter((a) => a.type === "policy")
  const guides = articles.filter((a) => a.type === "guide")
  const faqs = articles.filter((a) => a.type === "faq")
  const showSections = filter === "Toate"

  function openFab() {
    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: "Caută în Cunoștințe",
      render: (onClose) => (
        <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 12,
              marginBottom: 8,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span style={{ fontSize: 15, color: "rgba(255,255,255,0.35)" }}>Caută un articol…</span>
          </div>
          {[
            {
              label: "Articol Nou",
              sub: "Creează un SOP, Politică sau Ghid",
              iconBg: "rgba(48,209,88,0.18)",
              rowBg: "rgba(48,209,88,0.10)",
              rowBorder: "rgba(48,209,88,0.2)",
              color: green,
              icon: (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(48,209,88,0.9)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              ),
            },
            {
              label: "Favorite",
              sub: "Articolele salvate de tine",
              iconBg: "rgba(10,132,255,0.18)",
              rowBg: "rgba(10,132,255,0.10)",
              rowBorder: "rgba(10,132,255,0.2)",
              color: blue,
              icon: (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(10,132,255,0.9)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              ),
            },
            {
              label: "Export",
              sub: "Exportă baza de cunoștințe ca PDF",
              iconBg: "rgba(255,255,255,0.10)",
              rowBg: "rgba(255,255,255,0.04)",
              rowBorder: "rgba(255,255,255,0.09)",
              color: "rgba(255,255,255,0.75)",
              icon: (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              ),
            },
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                borderRadius: 14,
                background: btn.rowBg,
                border: `1px solid ${btn.rowBorder}`,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: btn.iconBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {btn.icon}
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: btn.color, margin: 0 }}>
                  {btn.label}
                </p>
                <p style={{ fontSize: 12, color: t3, margin: "2px 0 0" }}>{btn.sub}</p>
              </div>
            </button>
          ))}
        </div>
      ),
    })
  }

  return (
    <div
      style={{
        padding: "16px 16px 120px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div>
          <p style={{ fontSize: 13, color: t3, margin: 0 }}>Companie</p>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--prv-text-1)",
              margin: "2px 0 0",
            }}
          >
            Cunoștințe
          </h1>
        </div>
        <button
          onClick={openFab}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: g1,
            border: `1px solid ${bds}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(10,132,255,0.9)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </div>

      {/* KPI strip */}
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}
      >
        {[
          { val: String(meta?.total ?? 34), label: "Articole", color: undefined },
          { val: String(meta?.sopCount ?? 8), label: "SOP-uri", color: blue },
          { val: String(meta?.recentlyUpdated ?? 6), label: "Actualizate", color: green },
        ].map((k) => (
          <div
            key={k.label}
            style={{
              padding: "10px 8px 9px",
              borderRadius: 12,
              background: g1,
              border: `1px solid ${bds}`,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 700, color: k.color ?? "var(--prv-text-1)" }}>
              {k.val}
            </div>
            <div style={{ fontSize: 10, fontWeight: 500, color: t3, marginTop: 3 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 14px",
              borderRadius: 100,
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
              flexShrink: 0,
              cursor: "pointer",
              border:
                filter === f
                  ? "1px solid rgba(255,255,255,0.22)"
                  : "1px solid rgba(255,255,255,0.09)",
              background: filter === f ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
              color: filter === f ? "var(--prv-text-1)" : t3,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Content */}
      {showSections ? (
        <>
          {pinned && (
            <>
              <SectionLabel>Recomandat</SectionLabel>
              <FeaturedCard article={pinned} />
            </>
          )}
          {sops.length > 0 && (
            <>
              <SectionLabel>{`SOP-uri · ${sops.length}`}</SectionLabel>
              {sops.map((a) => (
                <ArticleRow key={a.id} article={a} />
              ))}
            </>
          )}
          {policies.length > 0 && (
            <>
              <SectionLabel>{`Politici · ${policies.length}`}</SectionLabel>
              {policies.map((a) => (
                <ArticleRow key={a.id} article={a} />
              ))}
            </>
          )}
          {guides.length > 0 && (
            <>
              <SectionLabel>{`Ghiduri · ${guides.length}`}</SectionLabel>
              {guides.map((a) => (
                <ArticleRow key={a.id} article={a} />
              ))}
            </>
          )}
          {faqs.length > 0 && (
            <>
              <SectionLabel>{`FAQ · ${faqs.length}`}</SectionLabel>
              {faqs.map((a) => (
                <ArticleRow key={a.id} article={a} />
              ))}
            </>
          )}
        </>
      ) : (
        articles.map((a) => <ArticleRow key={a.id} article={a} />)
      )}

      {articles.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 16px", color: t3, fontSize: 14 }}>
          Niciun articol găsit
        </div>
      )}


      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          style={{
            width: "100%",
            padding: "12px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            color: "rgba(255,255,255,0.65)",
            fontSize: 13,
            fontWeight: 500,
            cursor: isFetchingNextPage ? "default" : "pointer",
            marginTop: 8,
          }}
        >
          {isFetchingNextPage ? "Se încarcă..." : "Încarcă mai mult"}
        </button>
      )}

      {/* FAB */}
      <button
        onClick={openFab}
        style={{
          position: "fixed",
          bottom: 88,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.14)",
          border: "1px solid rgba(255,255,255,0.22)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.25)",
          backdropFilter: "blur(20px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 50,
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>
    </div>
  )
}
