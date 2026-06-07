"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSheetStack } from "@prv/ui"
import type { KnowledgeArticleDetail } from "@/app/api/knowledge/[id]/route"
import type { ArticleType } from "@/app/api/knowledge/route"
import Link from "next/link"

const g1 = "var(--prv-g1)"
const bds = "var(--prv-border-subtle)"
const t3 = "var(--prv-text-3)"
const green = "rgba(48,209,88,0.95)"
const blue = "rgba(10,132,255,0.9)"
const amber = "rgba(255,159,10,0.95)"

function typeConfig(type: ArticleType): {
  pillBg: string
  pillColor: string
  label: string
  iconBg: string
  iconStroke: string
} {
  if (type === "sop")
    return {
      pillBg: "rgba(10,132,255,0.13)",
      pillColor: blue,
      label: "SOP",
      iconBg: "rgba(10,132,255,0.10)",
      iconStroke: "rgba(10,132,255,0.85)",
    }
  if (type === "policy")
    return {
      pillBg: "rgba(191,90,242,0.13)",
      pillColor: "rgba(191,90,242,0.9)",
      label: "Politică",
      iconBg: "rgba(191,90,242,0.10)",
      iconStroke: "rgba(191,90,242,0.85)",
    }
  if (type === "guide")
    return {
      pillBg: "rgba(48,209,88,0.13)",
      pillColor: green,
      label: "Ghid",
      iconBg: "rgba(48,209,88,0.09)",
      iconStroke: "rgba(48,209,88,0.80)",
    }
  return {
    pillBg: "rgba(255,159,10,0.13)",
    pillColor: amber,
    label: "FAQ",
    iconBg: "rgba(255,159,10,0.10)",
    iconStroke: "rgba(255,159,10,0.85)",
  }
}

function RelatedIcon({ type }: { type: ArticleType }) {
  const cfg = typeConfig(type)
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 9,
        background: cfg.iconBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {type === "policy" ? (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke={cfg.iconStroke}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
      ) : type === "faq" ? (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke={cfg.iconStroke}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ) : (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke={cfg.iconStroke}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      )}
    </div>
  )
}

function SectionCard({
  title,
  children,
  badge,
}: {
  title: string
  children: React.ReactNode
  badge?: React.ReactNode
}) {
  return (
    <div
      style={{
        margin: "12px 0 0",
        background: g1,
        border: `1px solid ${bds}`,
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "0 0 auto",
          height: 1,
          background: "linear-gradient(90deg,transparent,var(--prv-border),transparent)",
        }}
      />
      <div
        style={{
          padding: "12px 16px 10px",
          fontSize: 13,
          fontWeight: 700,
          color: "rgba(255,255,255,0.75)",
          borderBottom: `1px solid rgba(255,255,255,0.06)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>{title}</span>
        {badge}
      </div>
      {children}
    </div>
  )
}

export function KnowledgeArticleClient({ id }: { id: string }) {
  const router = useRouter()
  const { openSheet } = useSheetStack()
  const [article, setArticle] = useState<KnowledgeArticleDetail | null>(null)
  const [checklist, setChecklist] = useState<KnowledgeArticleDetail["checklist"]>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/knowledge/${id}`)
      .then((r) => r.json())
      .then((data: KnowledgeArticleDetail) => {
        setArticle(data)
        setChecklist(data.checklist)
        setLoading(false)
      })
  }, [id])

  function toggleCheck(itemId: string) {
    setChecklist((prev) =>
      prev ? prev.map((c) => (c.id === itemId ? { ...c, checked: !c.checked } : c)) : prev
    )
  }

  function openFab() {
    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: "Acțiuni Articol",
      render: (onClose) => (
        <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            {
              label: "Salvează la Favorite",
              sub: "Acces rapid din profilul tău",
              iconBg: "rgba(255,255,255,0.10)",
              rowBg: "rgba(255,255,255,0.05)",
              rowBorder: "rgba(255,255,255,0.09)",
              color: "rgba(255,255,255,0.85)",
              icon: (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,255,255,0.75)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              ),
            },
            {
              label: "Partajează",
              sub: "Trimite unui coleg un link direct",
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
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              ),
            },
            {
              label: "Editează",
              sub: "Modifică conținut sau versiune",
              iconBg: "rgba(255,159,10,0.18)",
              rowBg: "rgba(255,159,10,0.10)",
              rowBorder: "rgba(255,159,10,0.2)",
              color: amber,
              icon: (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,159,10,0.9)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              ),
            },
            {
              label: "Export PDF",
              sub: "Descarcă articolul pentru uz offline",
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
            {
              label: "Arhivează",
              sub: "Retrage articolul din circulație",
              iconBg: "rgba(255,69,58,0.13)",
              rowBg: "rgba(255,69,58,0.07)",
              rowBorder: "rgba(255,69,58,0.15)",
              color: "rgba(255,69,58,0.9)",
              icon: (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,69,58,0.85)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="21 8 21 21 3 21 3 8" />
                  <rect x="1" y="3" width="22" height="5" />
                  <line x1="10" y1="12" x2="14" y2="12" />
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

  if (loading || !article) {
    return (
      <div style={{ padding: "16px 16px 120px" }}>
        {[
          { w: "40%", h: 12 },
          { w: "100%", h: 22 },
          { w: "70%", h: 14 },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              height: s.h,
              width: s.w,
              background: "rgba(255,255,255,0.07)",
              borderRadius: 6,
              marginBottom: 10,
            }}
          />
        ))}
        <div
          style={{
            height: 80,
            background: "rgba(255,255,255,0.05)",
            borderRadius: 12,
            marginTop: 12,
          }}
        />
      </div>
    )
  }

  const cfg = typeConfig(article.type)
  const checkedCount = checklist ? checklist.filter((c) => c.checked).length : 0
  const isRecent = article.updatedDate.includes("Iun") || article.updatedDate.includes("Mai")

  return (
    <div
      style={{
        padding: "0 0 120px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Back nav */}
      <div style={{ padding: "12px 16px 10px", display: "flex", alignItems: "center" }}>
        <button
          onClick={() => router.back()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "none",
            border: "none",
            color: blue,
            fontSize: 15,
            fontWeight: 500,
            cursor: "pointer",
            padding: 0,
          }}
        >
          <svg
            width="9"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(10,132,255,0.9)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Cunoștințe
        </button>
      </div>

      {/* Hero */}
      <div style={{ padding: "8px 16px 18px", borderBottom: `1px solid rgba(255,255,255,0.07)` }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          <span
            style={{
              background: cfg.pillBg,
              color: cfg.pillColor,
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 9px",
              borderRadius: 100,
            }}
          >
            {cfg.label}
          </span>
          <span
            style={{
              background: "rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.45)",
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 9px",
              borderRadius: 100,
            }}
          >
            {article.categoryLabel}
          </span>
          {article.version && (
            <span
              style={{
                background: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.45)",
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 9px",
                borderRadius: 100,
              }}
            >
              {article.version}
            </span>
          )}
          {isRecent && (
            <span
              style={{
                background: "rgba(48,209,88,0.10)",
                color: "rgba(48,209,88,0.80)",
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 9px",
                borderRadius: 100,
              }}
            >
              ● Actualizat
            </span>
          )}
        </div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1.25,
            color: "var(--prv-text-1)",
            margin: "0 0 8px",
          }}
        >
          {article.title}
        </h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: "0 0 12px" }}>
          {article.author} · Actualizat {article.updatedDate}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            {
              icon: (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              ),
              text: `${article.readMinutes} min citire`,
            },
            {
              icon: (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ),
              text: `${article.views >= 1000 ? `${(article.views / 1000).toFixed(1)}k` : article.views} viz.`,
            },
          ].map((m, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "rgba(255,255,255,0.05)",
                border: `1px solid rgba(255,255,255,0.08)`,
                borderRadius: 8,
                padding: "6px 10px",
              }}
            >
              {m.icon}
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>
                {m.text}
              </span>
            </div>
          ))}
        </div>
        {article.readProgress > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Progres citire</span>
              <span style={{ fontSize: 11, color: "rgba(10,132,255,0.8)", fontWeight: 600 }}>
                {article.readProgress}%
              </span>
            </div>
            <div
              style={{
                height: 3,
                background: "rgba(255,255,255,0.08)",
                borderRadius: 2,
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
          </div>
        )}
      </div>

      <div style={{ padding: "0 16px" }}>
        {/* Checklist */}
        {checklist && checklist.length > 0 && (
          <SectionCard
            title="Checklist"
            badge={
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 9px",
                  borderRadius: 100,
                  background:
                    checkedCount === checklist.length
                      ? "rgba(48,209,88,0.12)"
                      : "rgba(255,255,255,0.07)",
                  color:
                    checkedCount === checklist.length
                      ? "rgba(48,209,88,0.9)"
                      : "rgba(255,255,255,0.45)",
                }}
              >
                {checkedCount}/{checklist.length} completat
              </span>
            }
          >
            {checklist.map((item, i) => (
              <button
                key={item.id}
                onClick={() => toggleCheck(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "11px 16px",
                  borderBottom:
                    i < checklist.length - 1 ? `1px solid rgba(255,255,255,0.05)` : "none",
                  width: "100%",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: item.checked ? "rgba(48,209,88,0.15)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${item.checked ? "rgba(48,209,88,0.3)" : "rgba(255,255,255,0.12)"}`,
                  }}
                >
                  {item.checked && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="rgba(48,209,88,0.9)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 13,
                    color: item.checked ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.55)",
                  }}
                >
                  {item.label}
                </span>
              </button>
            ))}
          </SectionCard>
        )}

        {/* TOC */}
        {article.toc.length > 0 && (
          <SectionCard
            title="Cuprins"
            badge={
              <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.35)" }}>
                {article.toc.length} secțiuni
              </span>
            }
          >
            {article.toc.map((section, i) => (
              <div
                key={section.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "11px 16px",
                  borderBottom:
                    i < article.toc.length - 1 ? `1px solid rgba(255,255,255,0.05)` : "none",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.25)",
                    width: 18,
                    flexShrink: 0,
                  }}
                >
                  {section.index}
                </span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.80)", flex: 1 }}>
                  {section.title}
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            ))}
          </SectionCard>
        )}

        {/* Related */}
        {article.related.length > 0 && (
          <SectionCard title="Articole Corelate">
            {article.related.map((rel, i) => (
              <Link
                key={rel.id}
                href={`/knowledge/${rel.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 16px",
                  borderBottom:
                    i < article.related.length - 1 ? `1px solid rgba(255,255,255,0.05)` : "none",
                  textDecoration: "none",
                }}
              >
                <RelatedIcon type={rel.type} />
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.85)",
                      margin: 0,
                    }}
                  >
                    {rel.title}
                  </p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "2px 0 0" }}>
                    {rel.categoryLabel} · {rel.readMinutes} min
                  </p>
                </div>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            ))}
          </SectionCard>
        )}
      </div>

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
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
        </svg>
      </button>
    </div>
  )
}
