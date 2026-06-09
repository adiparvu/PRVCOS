"use client"

import { useState } from "react"
import { useDocuments } from "@/lib/api-hooks"
import type { DocumentRecord, DocStatus, DocCategory } from "@/app/api/documents/route"

type FilterType = "Recent" | "Shared" | "Signed" | "Pending"

const FILTERS: FilterType[] = ["Recent", "Shared", "Signed", "Pending"]

const CATEGORY_STYLES: Record<DocCategory, { bg: string; stroke: string }> = {
  contracts: { bg: "rgba(10,132,255,0.12)", stroke: "rgba(10,132,255,0.9)" },
  invoices: { bg: "rgba(48,209,88,0.10)", stroke: "rgba(48,209,88,0.85)" },
  projects: { bg: "rgba(255,159,10,0.10)", stroke: "rgba(255,159,10,0.9)" },
  hr: { bg: "rgba(191,90,242,0.10)", stroke: "rgba(191,90,242,0.85)" },
  fleet: { bg: "rgba(255,69,58,0.10)", stroke: "rgba(255,69,58,0.85)" },
}

const CATEGORY_LABELS: Record<DocCategory, string> = {
  contracts: "Contracts",
  invoices: "Invoices",
  projects: "Projects",
  hr: "HR",
  fleet: "Fleet",
}

const DISPLAY_CATEGORIES: DocCategory[] = ["contracts", "invoices", "projects", "hr"]

const EXT_COLORS: Record<string, { bg: string; color: string }> = {
  PDF_contracts: { bg: "rgba(10,132,255,0.12)", color: "rgba(10,132,255,0.9)" },
  PDF_invoices: { bg: "rgba(48,209,88,0.10)", color: "rgba(48,209,88,0.85)" },
  PDF_hr: { bg: "rgba(191,90,242,0.10)", color: "rgba(191,90,242,0.85)" },
  PDF_fleet: { bg: "rgba(255,69,58,0.10)", color: "rgba(255,69,58,0.85)" },
  PDF_default: { bg: "var(--prv-border)", color: "var(--prv-text-2)" },
  DOC_default: { bg: "var(--prv-border)", color: "var(--prv-text-2)" },
  XLS_default: { bg: "rgba(48,209,88,0.10)", color: "rgba(48,209,88,0.85)" },
}

function docIconStyle(doc: DocumentRecord): { bg: string; color: string } {
  const key = `${doc.ext}_${doc.category}`
  return (
    EXT_COLORS[key] ??
    EXT_COLORS[`${doc.ext}_default`] ??
    EXT_COLORS["PDF_default"] ?? { bg: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }
  )
}

const g1 = "var(--prv-g1)"
const g2 = "var(--prv-g2)"
const bds = "var(--prv-border-subtle)"
const t2 = "var(--prv-text-2)"
const t3 = "var(--prv-text-3)"
const green = "rgba(48,209,88,0.95)"
const red = "rgba(255,69,58,0.95)"
const amber = "rgba(255,159,10,0.95)"

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

const STATUS_DISPLAY: Record<DocStatus, string> = {
  signed: "Signed",
  pending: "Pending",
  draft: "Draft",
  expired: "Expired",
}

function StatusPill({ status }: { status: DocStatus }) {
  const styles: Record<DocStatus, React.CSSProperties> = {
    signed: { background: "rgba(48,209,88,0.13)", color: green },
    pending: { background: "rgba(255,159,10,0.13)", color: amber },
    draft: { background: "var(--prv-border)", color: t2 },
    expired: { background: "rgba(255,69,58,0.12)", color: red },
  }
  return (
    <span
      style={{
        ...styles[status],
        fontSize: 10,
        fontWeight: 600,
        padding: "3px 8px",
        borderRadius: 6,
      }}
    >
      {STATUS_DISPLAY[status]}
    </span>
  )
}

export function DocumentsWorkspace() {
  const [filter, setFilter] = useState<FilterType>("Recent")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<DocumentRecord | null>(null)

  const { data, isLoading } = useDocuments()
  const documents = data?.documents ?? []
  const meta = data?.meta ?? null

  // Compute category counts from loaded documents
  const categoryCounts = documents.reduce<Record<string, number>>((acc, doc) => {
    acc[doc.category] = (acc[doc.category] ?? 0) + 1
    return acc
  }, {})

  const filtered = documents.filter((d) => {
    const matchSearch = search === "" || d.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === "Recent"
        ? true
        : filter === "Shared"
          ? true
          : filter === "Signed"
            ? d.status === "signed"
            : filter === "Pending"
              ? d.status === "pending"
              : true
    return matchSearch && matchFilter
  })

  if (selected) {
    const doc = selected
    const { bg, color } = docIconStyle(doc)
    return (
      <div
        style={{
          padding: "32px 16px 120px",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <button
          onClick={() => setSelected(null)}
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
          Documents
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 800,
              color,
              flexShrink: 0,
            }}
          >
            {doc.ext}
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "var(--prv-text-1)",
                wordBreak: "break-all",
              }}
            >
              {doc.name.replace(/\.[^.]+$/, "")}
            </div>
            <div style={{ fontSize: 12, color: t3, marginTop: 2 }}>
              {doc.ext} · {doc.sizeLabel} · {CATEGORY_LABELS[doc.category]}
            </div>
          </div>
          <StatusPill status={doc.status} />
        </div>

        {/* Preview mockup */}
        <div
          style={{
            background: g2,
            border: `1px solid ${bds}`,
            borderRadius: 16,
            padding: 20,
            marginBottom: 12,
            position: "relative",
            overflow: "hidden",
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
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--prv-text-1)" }}>
              DOCUMENT PREVIEW
            </div>
            <div style={{ fontSize: 10, color: t3 }}>
              {doc.pages ? `p.1 / ${doc.pages}` : "p.1"}
            </div>
          </div>
          <div style={{ fontSize: 10, color: t3, marginBottom: 10 }}>{doc.name}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[100, 80, 60, 80, 100, 60, 80].map((w, i) => (
              <div
                key={i}
                style={{ height: 8, borderRadius: 3, background: "var(--prv-g2)", width: `${w}%` }}
              />
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {[
            {
              label: "Download",
              icon: (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--prv-text-2)"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              ),
            },
            {
              label: "Share",
              icon: (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--prv-text-2)"
                  strokeWidth="1.7"
                  strokeLinecap="round"
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
              label: "Sign",
              icon: (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--prv-text-2)"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              ),
            },
            {
              label: "More",
              icon: (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--prv-text-2)"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="19" cy="12" r="1" />
                  <circle cx="5" cy="12" r="1" />
                </svg>
              ),
            },
          ].map((a) => (
            <div
              key={a.label}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 5,
                padding: "12px 8px",
                borderRadius: 14,
                background: g1,
                border: `1px solid ${bds}`,
                cursor: "pointer",
              }}
            >
              {a.icon}
              <div style={{ fontSize: 11, fontWeight: 600, color: t2 }}>{a.label}</div>
            </div>
          ))}
        </div>

        {/* Details */}
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
          Details
        </p>
        <div style={card}>
          <TopEdge />
          {[
            { label: "Uploaded by", val: doc.author },
            { label: "Project", val: doc.project ?? "—" },
            { label: "Category", val: CATEGORY_LABELS[doc.category] },
            { label: "Expires", val: doc.expiresAt ?? "—" },
            { label: "Version", val: doc.version ?? "—" },
            { label: "Last modified", val: doc.date },
          ].map((row, i, arr) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "11px 16px",
                borderBottom: i < arr.length - 1 ? `1px solid ${bds}` : "none",
              }}
            >
              <span style={{ fontSize: 13, color: t2 }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--prv-text-1)" }}>
                {row.val}
              </span>
            </div>
          ))}
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
            Documents
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
          {meta ? `${meta.total.toLocaleString()} files` : isLoading ? "Loading…" : "—"}
        </div>
      </div>

      {/* Search */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          background: g1,
          border: `1px solid ${bds}`,
          borderRadius: 12,
          marginBottom: 14,
        }}
      >
        <svg
          width="16"
          height="16"
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
          placeholder="Search documents…"
          style={{
            flex: 1,
            background: "none",
            border: "none",
            outline: "none",
            fontSize: 14,
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
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Category grid */}
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}
      >
        {DISPLAY_CATEGORIES.map((cat) => {
          const style = CATEGORY_STYLES[cat]
          return (
            <div
              key={cat}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: "12px 4px",
                borderRadius: 14,
                background: g1,
                border: `1px solid ${bds}`,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: style.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={style.stroke}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: t2, textAlign: "center" }}>
                {CATEGORY_LABELS[cat]}
              </div>
              <div style={{ fontSize: 10, color: t3 }}>
                {categoryCounts[cat] ?? 0}
              </div>
            </div>
          )
        })}
      </div>

      {/* Filter */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: 4,
          background: g1,
          border: `1px solid ${bds}`,
          borderRadius: 12,
          marginBottom: 14,
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              flex: 1,
              padding: "6px 0",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              color: filter === f ? "var(--prv-text-1)" : t3,
              background: filter === f ? g2 : "transparent",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Document list */}
      <div style={card}>
        <TopEdge />
        {isLoading ? (
          <div style={{ padding: "24px 16px", textAlign: "center", color: t3, fontSize: 13 }}>
            Loading documents…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "24px 16px", textAlign: "center", color: t3, fontSize: 13 }}>
            No documents found
          </div>
        ) : (
          filtered.map((doc, i) => {
            const { bg, color } = docIconStyle(doc)
            return (
              <button
                key={doc.id}
                onClick={() => setSelected(doc)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "13px 16px",
                  borderBottom: i < filtered.length - 1 ? `1px solid ${bds}` : "none",
                  width: "100%",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: 11,
                    fontWeight: 800,
                    color,
                  }}
                >
                  {doc.ext}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--prv-text-1)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {doc.name}
                  </div>
                  <div style={{ fontSize: 11, color: t3, marginTop: 2 }}>
                    {CATEGORY_LABELS[doc.category]} · {doc.author} · {doc.date}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <StatusPill status={doc.status} />
                  <div style={{ fontSize: 11, color: t3, marginTop: 4 }}>{doc.sizeLabel}</div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
