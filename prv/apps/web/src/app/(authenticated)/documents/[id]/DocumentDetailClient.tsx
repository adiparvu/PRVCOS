"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSheetStack } from "@prv/ui"
import type { DocumentDetail } from "@/app/api/documents/[id]/route"

const g1 = "var(--prv-g1)"
const bds = "var(--prv-border-subtle)"
const t3 = "var(--prv-text-3)"
const green = "rgba(48,209,88,0.95)"
const amber = "rgba(255,159,10,0.95)"
const blue = "rgba(10,132,255,0.9)"
const red = "rgba(255,69,58,0.95)"

function extConfig(
  ext: DocumentDetail["ext"],
  status: DocumentDetail["status"]
): { bg: string; stroke: string } {
  if (status === "pending") return { bg: "rgba(255,159,10,0.08)", stroke: "rgba(255,159,10,0.85)" }
  if (status === "expired") return { bg: "rgba(255,69,58,0.08)", stroke: "rgba(255,69,58,0.8)" }
  if (ext === "XLS") return { bg: "rgba(48,209,88,0.08)", stroke: "rgba(48,209,88,0.85)" }
  if (ext === "DOC") return { bg: "rgba(10,132,255,0.08)", stroke: "rgba(10,132,255,0.85)" }
  return { bg: "rgba(48,209,88,0.08)", stroke: "rgba(48,209,88,0.85)" }
}

function StatusConfig(status: DocumentDetail["status"]): {
  bg: string
  color: string
  label: string
} {
  if (status === "signed") return { bg: "rgba(48,209,88,0.13)", color: green, label: "Semnat" }
  if (status === "pending") return { bg: "rgba(255,159,10,0.13)", color: amber, label: "Nesemnat" }
  if (status === "draft")
    return { bg: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)", label: "Draft" }
  return { bg: "rgba(255,69,58,0.13)", color: red, label: "Expirat" }
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

function InfoRow({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "11px 16px",
        borderBottom: `1px solid rgba(255,255,255,0.05)`,
      }}
    >
      <span style={{ fontSize: 13, color: t3 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: valueColor ?? "var(--prv-text-1)" }}>
        {value}
      </span>
    </div>
  )
}

export function DocumentDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const { openSheet } = useSheetStack()
  const [doc, setDoc] = useState<DocumentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const loadDoc = useCallback(() => {
    return fetch(`/api/documents/${id}`)
      .then((r) => r.json())
      .then((data: DocumentDetail) => setDoc(data))
  }, [id])

  useEffect(() => {
    loadDoc().finally(() => setLoading(false))
  }, [loadDoc])

  const archiveDoc = useCallback(() => {
    setBusy(true)
    fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Archive failed")
        await loadDoc()
      })
      .finally(() => setBusy(false))
  }, [id, loadDoc])

  const deleteDoc = useCallback(() => {
    setBusy(true)
    fetch(`/api/documents/${id}`, { method: "DELETE" })
      .then((r) => {
        if (!r.ok) throw new Error("Delete failed")
        router.push("/documents")
      })
      .catch(() => setBusy(false))
  }, [id, router])

  function openFab() {
    if (!doc) return
    const isSigable = doc.status === "pending" || doc.status === "draft"
    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: "Document Actions",
      render: (onClose) => (
        <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
          {isSigable && (
            <button
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                borderRadius: 14,
                background: "rgba(48,209,88,0.10)",
                border: "1px solid rgba(48,209,88,0.2)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "rgba(48,209,88,0.18)",
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
                  stroke="rgba(48,209,88,0.9)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: green, margin: 0 }}>
                  Sign Document
                </p>
                <p style={{ fontSize: 12, color: t3, margin: "2px 0 0" }}>
                  Electronic signature with Face ID
                </p>
              </div>
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 16px",
              borderRadius: 14,
              background: "rgba(10,132,255,0.10)",
              border: "1px solid rgba(10,132,255,0.2)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(10,132,255,0.18)",
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
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: blue, margin: 0 }}>Share</p>
              <p style={{ fontSize: 12, color: t3, margin: "2px 0 0" }}>
                Trimite unui coleg sau client
              </p>
            </div>
          </button>
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 16px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(255,255,255,0.10)",
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
                stroke="rgba(255,255,255,0.7)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <div>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.75)",
                  margin: 0,
                }}
              >
                Download
              </p>
              <p style={{ fontSize: 12, color: t3, margin: "2px 0 0" }}>Save locally as PDF</p>
            </div>
          </button>
          <button
            disabled={busy}
            onClick={() => {
              onClose()
              archiveDoc()
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 16px",
              borderRadius: 14,
              background: "rgba(255,159,10,0.08)",
              border: "1px solid rgba(255,159,10,0.18)",
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.6 : 1,
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(255,159,10,0.15)",
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
                stroke="rgba(255,159,10,0.85)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="21 8 21 21 3 21 3 8" />
                <rect x="1" y="3" width="22" height="5" />
                <line x1="10" y1="12" x2="14" y2="12" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: amber, margin: 0 }}>Archive</p>
              <p style={{ fontSize: 12, color: t3, margin: "2px 0 0" }}>
                Move to archive, no deletion
              </p>
            </div>
          </button>
          <button
            disabled={busy}
            onClick={() => {
              onClose()
              deleteDoc()
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 16px",
              borderRadius: 14,
              background: "rgba(255,69,58,0.07)",
              border: "1px solid rgba(255,69,58,0.15)",
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.6 : 1,
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(255,69,58,0.13)",
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
                stroke="rgba(255,69,58,0.85)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: red, margin: 0 }}>Delete</p>
              <p style={{ fontSize: 12, color: t3, margin: "2px 0 0" }}>
                Permanently delete document
              </p>
            </div>
          </button>
        </div>
      ),
    })
  }

  if (loading || !doc) {
    return (
      <div style={{ padding: "16px 16px 120px" }}>
        {[
          { w: "60%", h: 14 },
          { w: "100%", h: 22 },
          { w: "80%", h: 14 },
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

  const cfg = StatusConfig(doc.status)
  const extCfg = extConfig(doc.ext, doc.status)
  const isSigable = doc.status === "pending" || doc.status === "draft"
  const isExpired = doc.status === "expired"
  const isPending = doc.status === "pending"

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
          Documente
        </button>
      </div>

      {/* Hero */}
      <div style={{ padding: "8px 16px 16px", borderBottom: `1px solid rgba(255,255,255,0.07)` }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 14 }}>
          {/* File icon */}
          <div
            style={{
              width: 64,
              height: 76,
              borderRadius: 12,
              background: extCfg.bg,
              border: `1px solid rgba(255,255,255,0.10)`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              flexShrink: 0,
              position: "relative",
            }}
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              style={{ position: "absolute", top: 0, right: 0, width: 16, height: 16 }}
            >
              <path d="M10 0v6h6" fill={extCfg.bg} stroke={extCfg.stroke} strokeWidth="1" />
            </svg>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke={extCfg.stroke}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginTop: 4 }}
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                color: extCfg.stroke,
                letterSpacing: "0.04em",
              }}
            >
              {doc.ext}
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: t3,
                margin: "0 0 4px",
              }}
            >
              {doc.categoryLabel}
            </p>
            <p
              style={{
                fontSize: 19,
                fontWeight: 700,
                lineHeight: 1.2,
                margin: 0,
                color: "var(--prv-text-1)",
                wordBreak: "break-word",
              }}
            >
              {doc.name}
            </p>
            <p style={{ fontSize: 13, color: "var(--prv-text-2)", margin: "4px 0 0" }}>
              {doc.author} · {doc.date}
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              <span
                style={{
                  ...cfg,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 9px",
                  borderRadius: 100,
                }}
              >
                {cfg.label}
              </span>
              {doc.version && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 9px",
                    borderRadius: 100,
                    background: "rgba(255,255,255,0.07)",
                    color: "rgba(255,255,255,0.45)",
                  }}
                >
                  {doc.version}
                </span>
              )}
              {doc.project && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 9px",
                    borderRadius: 100,
                    background: "rgba(255,255,255,0.07)",
                    color: "rgba(255,255,255,0.45)",
                  }}
                >
                  {doc.project}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stat tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {[
            { val: doc.sizeLabel, label: "Size", color: undefined },
            { val: doc.pages ? String(doc.pages) : "—", label: "Pagini", color: undefined },
            { val: doc.version ?? "—", label: "Versiune", color: isPending ? amber : undefined },
          ].map((t) => (
            <div
              key={t.label}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: `1px solid rgba(255,255,255,0.08)`,
                borderRadius: 12,
                padding: "10px 12px",
              }}
            >
              <p
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: t.color ?? "var(--prv-text-1)",
                  margin: 0,
                }}
              >
                {t.val}
              </p>
              <p style={{ fontSize: 11, color: t3, margin: "2px 0 0" }}>{t.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTAs */}
      {isSigable && (
        <div style={{ display: "flex", gap: 10, margin: "14px 16px 0" }}>
          <button
            style={{
              flex: 1,
              padding: "14px 0",
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 700,
              textAlign: "center",
              cursor: "pointer",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.70)",
              border: `1px solid rgba(255,255,255,0.09)`,
            }}
          >
            Download
          </button>
          <button
            style={{
              flex: 2,
              padding: "14px 0",
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 700,
              textAlign: "center",
              cursor: "pointer",
              background: "rgba(48,209,88,0.15)",
              color: green,
              border: "1px solid rgba(48,209,88,0.25)",
            }}
          >
            Sign
          </button>
        </div>
      )}

      {/* Expiry alert */}
      {(isExpired || (isPending && doc.expiresAt)) && (
        <div
          style={{
            margin: "14px 16px 0",
            background: "rgba(255,69,58,0.08)",
            border: "1px solid rgba(255,69,58,0.2)",
            borderRadius: 12,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,69,58,0.9)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ fontSize: 13, color: red, fontWeight: 500 }}>
            {isExpired
              ? `Document expirat pe ${doc.expiresAt}`
              : `Document expires on ${doc.expiresAt}`}
          </span>
        </div>
      )}

      <div style={{ padding: "0 16px" }}>
        {/* Details card */}
        <SectionCard title="Detalii Document">
          {doc.project && <InfoRow label="Proiect" value={doc.project} />}
          <InfoRow label="Creat de" value={doc.author} />
          <InfoRow label="Created on" value={doc.date} />
          {doc.expiresAt && (
            <InfoRow
              label="Valid until"
              value={doc.expiresAt}
              valueColor={isExpired ? red : isPending ? amber : green}
            />
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "11px 16px",
            }}
          >
            <span style={{ fontSize: 13, color: t3 }}>Semnat de</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: doc.signedBy ? "var(--prv-text-1)" : "rgba(255,255,255,0.35)",
              }}
            >
              {doc.signedBy ?? "—"}
            </span>
          </div>
        </SectionCard>

        {/* Activity timeline */}
        <SectionCard title="Activitate">
          {doc.activity.map((event, i) => (
            <div
              key={event.id}
              style={{ display: "flex", gap: 12, padding: "10px 16px", position: "relative" }}
            >
              {i < doc.activity.length - 1 && (
                <div
                  style={{
                    position: "absolute",
                    left: 19,
                    top: 22,
                    bottom: -10,
                    width: 1,
                    background: "rgba(255,255,255,0.08)",
                  }}
                />
              )}
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: event.color,
                  marginTop: 5,
                  flexShrink: 0,
                }}
              />
              <div>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: event.done ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.55)",
                    margin: 0,
                  }}
                >
                  {event.label}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: event.done ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.25)",
                    margin: "1px 0 0",
                  }}
                >
                  {event.actor} · {event.timestamp}
                </p>
              </div>
            </div>
          ))}
        </SectionCard>
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
