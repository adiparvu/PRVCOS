"use client"
import { useRouter } from "next/navigation"

import { useState } from "react"
import Link from "next/link"
import { useSheetStack } from "@prv/ui"
import type { DocumentRecord, DocumentsMeta } from "@/app/api/documents/route"
import { useDocuments } from "@/lib/api-hooks"

type FilterType = "Recente" | "Contracte" | "Facturi" | "Proiecte" | "HR" | "Flotă"

const FILTER_TO_CATEGORY: Record<FilterType, string | null> = {
  Recente: null,
  Contracte: "contracts",
  Facturi: "invoices",
  Proiecte: "projects",
  HR: "hr",
  Flotă: "fleet",
}

const FILTERS: FilterType[] = ["Recente", "Contracte", "Facturi", "Proiecte", "HR", "Flotă"]

const bds = "var(--prv-border-subtle)"
const g1 = "var(--prv-g1)"
const t2 = "var(--prv-text-2)"
const t3 = "var(--prv-text-3)"
const green = "rgba(48,209,88,0.95)"
const amber = "rgba(255,159,10,0.95)"
const blue = "rgba(10,132,255,0.9)"
const red = "rgba(255,69,58,0.95)"

function extConfig(
  ext: DocumentRecord["ext"],
  status: DocumentRecord["status"]
): { bg: string; border: string; color: string } {
  if (status === "pending")
    return {
      bg: "rgba(255,159,10,0.10)",
      border: "rgba(255,159,10,0.18)",
      color: "rgba(255,159,10,0.9)",
    }
  if (status === "expired")
    return {
      bg: "rgba(255,69,58,0.08)",
      border: "rgba(255,69,58,0.16)",
      color: "rgba(255,69,58,0.8)",
    }
  if (ext === "XLS")
    return {
      bg: "rgba(48,209,88,0.08)",
      border: "rgba(48,209,88,0.16)",
      color: "rgba(48,209,88,0.8)",
    }
  if (ext === "DOC")
    return {
      bg: "rgba(10,132,255,0.08)",
      border: "rgba(10,132,255,0.16)",
      color: "rgba(10,132,255,0.8)",
    }
  return {
    bg: "rgba(48,209,88,0.08)",
    border: "rgba(48,209,88,0.16)",
    color: "rgba(48,209,88,0.8)",
  }
}

function StatusPill({ status }: { status: DocumentRecord["status"] }) {
  const cfg: Record<DocumentRecord["status"], { bg: string; color: string; label: string }> = {
    signed: { bg: "rgba(48,209,88,0.13)", color: green, label: "Semnat" },
    pending: { bg: "rgba(255,159,10,0.13)", color: amber, label: "Nesemnat" },
    draft: { bg: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)", label: "Ciornă" },
    expired: { bg: "rgba(255,69,58,0.13)", color: red, label: "Expirat" },
  }
  const c = cfg[status]
  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: 100,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {c.label}
    </span>
  )
}

function ExtBadge({
  ext,
  status,
}: {
  ext: DocumentRecord["ext"]
  status: DocumentRecord["status"]
}) {
  const cfg = extConfig(ext, status)
  return (
    <div
      style={{
        width: 38,
        height: 44,
        borderRadius: 8,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.04em", color: cfg.color }}>
        {ext}
      </span>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{ width: 18, height: 1.5, borderRadius: 1, background: cfg.color, opacity: 0.4 }}
        />
      ))}
    </div>
  )
}

function DocRow({ doc }: { doc: DocumentRecord }) {
  const isPending = doc.status === "pending"
  const isExpired = doc.status === "expired"
  const borderStyle: React.CSSProperties = isPending
    ? {
        borderLeft: "3px solid transparent",
        borderImage: "linear-gradient(180deg,rgba(255,159,10,.7),rgba(255,159,10,.3)) 1",
        paddingLeft: 13,
      }
    : isExpired
      ? {
          borderLeft: "3px solid transparent",
          borderImage: "linear-gradient(180deg,rgba(255,69,58,.7),rgba(255,69,58,.3)) 1",
          paddingLeft: 13,
        }
      : {}

  return (
    <Link
      href={`/documents/${doc.id}`}
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
        ...borderStyle,
      }}
    >
      <ExtBadge ext={doc.ext} status={doc.status} />
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
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 190,
            }}
          >
            {doc.name}
          </p>
          <StatusPill status={doc.status} />
        </div>
        <p style={{ fontSize: 12, color: t3, margin: "2px 0 0" }}>
          {doc.categoryLabel} · {doc.author}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
            {doc.date} · {doc.sizeLabel}
          </span>
          {isPending && doc.expiresAt && (
            <span style={{ fontSize: 10, color: "rgba(255,159,10,0.75)", fontWeight: 600 }}>
              Expiră {doc.expiresAt}
            </span>
          )}
          {isExpired && doc.expiresAt && (
            <span style={{ fontSize: 10, color: "rgba(255,69,58,0.7)", fontWeight: 600 }}>
              Expirat {doc.expiresAt}
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

export function DocumentsListClient() {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterType>("Recente")
  const { openSheet } = useSheetStack()
  const category = FILTER_TO_CATEGORY[filter]
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useDocuments(category)
  const documents = data?.documents ?? []
  const meta = data?.meta ?? null

  const pendingDocs = documents.filter((d) => d.status === "pending")
  const recentDocs = documents.filter((d) => d.status === "signed" || d.status === "draft")
  const expiredDocs = documents.filter((d) => d.status === "expired")
  const showSections = filter === "Recente"
  const hasExpiring = pendingDocs.some((d) => d.expiresAt)

  function openFab() {
    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: "Acțiuni Documente",
      render: (onClose) => (
        <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            {
              label: "Încarcă Document",
              sub: "Adaugă un fișier PDF, DOC sau XLS",
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
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              ),
            },
            {
              label: "Document Nou",
              sub: "Creează un document din șablon",
              onClick: () => { router.push("/documents/new") },
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
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              ),
            },
            {
              label: "Export Listă",
              sub: "Exportă inventarul documentelor",
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
              onClick={() => { onClose(); btn.onClick?.() }}
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
          <p style={{ fontSize: 13, color: t3, margin: 0 }}>Operațiuni</p>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--prv-text-1)",
              margin: "2px 0 0",
            }}
          >
            Documente
          </h1>
        </div>
        <button
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
        style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}
      >
        {[
          { val: String(meta?.total ?? 47), label: "Total", color: undefined },
          { val: String(meta?.pendingCount ?? 4), label: "Nesemnate", color: amber },
          { val: String(meta?.expiredCount ?? 2), label: "Expirate", color: red },
          { val: String(meta?.recentCount ?? 8), label: "Recente", color: green },
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

      {/* Amber alert */}
      {hasExpiring && (
        <div
          style={{
            marginBottom: 12,
            background: "rgba(255,159,10,0.08)",
            border: "1px solid rgba(255,159,10,0.22)",
            borderRadius: 12,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,159,10,0.9)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span style={{ fontSize: 13, color: amber, fontWeight: 500 }}>
            Contract A4 Brașov expiră în 3 zile
          </span>
        </div>
      )}

      {/* Filter chips */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 14,
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

      {/* Sections */}
      {showSections ? (
        <>
          {pendingDocs.length > 0 && (
            <>
              <SectionLabel>{`Necesită Semnătură · ${pendingDocs.length}`}</SectionLabel>
              {pendingDocs.map((d) => (
                <DocRow key={d.id} doc={d} />
              ))}
            </>
          )}
          {recentDocs.length > 0 && (
            <>
              <SectionLabel>Recente</SectionLabel>
              {recentDocs.map((d) => (
                <DocRow key={d.id} doc={d} />
              ))}
            </>
          )}
          {expiredDocs.length > 0 && (
            <>
              <SectionLabel>{`Expirate · ${expiredDocs.length}`}</SectionLabel>
              {expiredDocs.map((d) => (
                <DocRow key={d.id} doc={d} />
              ))}
            </>
          )}
        </>
      ) : (
        documents.map((d) => <DocRow key={d.id} doc={d} />)
      )}

      {documents.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 16px", color: t3, fontSize: 14 }}>
          Niciun document găsit
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
            marginBottom: 12,
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
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  )
}
