"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useSheetStack } from "@prv/ui"
import type {
  QuoteDetail,
  ApprovalStepStatus,
  QuoteActivityType,
} from "@/app/api/crm/quotes/[id]/route"
import type { QuoteStatus } from "@/app/api/crm/quotes/route"

// ── Icons (SF Symbol style — stroke only) ─────────────────────────────────────

function IconChevronLeft() {
  return (
    <svg
      width="9"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg
      width="7"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

function IconPhone() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.39 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 3.12 4.18 2 2 0 0 1 5.09 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function IconMail() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function IconSend() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconConvert() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  )
}

function IconDownload() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function IconXCircle() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}

function IconApproval() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function IconCheckCircle() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number) {
  return "€" + amount.toLocaleString("ro-RO")
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return "Azi"
  if (d === 1) return "Ieri"
  return `${d}z în urmă`
}

const STATUS_CONFIG: Record<
  QuoteStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  draft: {
    label: "Ciornă",
    color: "rgba(255,255,255,0.45)",
    bg: "rgba(255,255,255,0.07)",
    border: "rgba(255,255,255,0.14)",
  },
  sent: {
    label: "Trimisă",
    color: "#7eb8ff",
    bg: "rgba(100,160,255,0.12)",
    border: "rgba(100,160,255,0.24)",
  },
  accepted: {
    label: "Acceptată",
    color: "#5affa0",
    bg: "rgba(80,255,140,0.10)",
    border: "rgba(80,255,140,0.20)",
  },
  rejected: {
    label: "Respinsă",
    color: "#ff6b6b",
    bg: "rgba(255,80,80,0.12)",
    border: "rgba(255,80,80,0.22)",
  },
  expired: {
    label: "Expirată",
    color: "rgba(255,255,255,0.30)",
    bg: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.10)",
  },
}

const APPROVAL_DOT: Record<ApprovalStepStatus, { bg: string; border: string; color: string }> = {
  approved: { bg: "rgba(90,255,160,0.18)", border: "rgba(90,255,160,0.30)", color: "#5affa0" },
  pending: { bg: "rgba(255,180,0,0.12)", border: "rgba(255,180,0,0.22)", color: "#ffcc44" },
  waiting: {
    bg: "rgba(255,255,255,0.07)",
    border: "rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.35)",
  },
  rejected: { bg: "rgba(255,60,60,0.14)", border: "rgba(255,80,80,0.22)", color: "#ff6b6b" },
}

const APPROVAL_STATUS_LABEL: Record<ApprovalStepStatus, string> = {
  approved: "Aprobat",
  pending: "În așteptare",
  waiting: "Blocat",
  rejected: "Respins",
}

const APPROVAL_STATUS_COLOR: Record<ApprovalStepStatus, string> = {
  approved: "#5affa0",
  pending: "#ffcc44",
  waiting: "rgba(255,255,255,0.25)",
  rejected: "#ff6b6b",
}

const ACTIVITY_DOT: Record<QuoteActivityType, string> = {
  created: "rgba(255,255,255,0.28)",
  updated: "rgba(255,255,255,0.45)",
  sent: "#7eb8ff",
  approved: "#5affa0",
  rejected: "#ff6b6b",
  accepted: "#5affa0",
  converted: "#b08fff",
}

const ACTIVITY_GLOW: Partial<Record<QuoteActivityType, string>> = {
  sent: "rgba(100,160,255,0.5)",
  approved: "rgba(80,255,140,0.5)",
  accepted: "rgba(80,255,140,0.5)",
  rejected: "rgba(255,80,80,0.5)",
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      <div
        style={{
          height: 14,
          width: 80,
          background: "var(--prv-g2)",
          borderRadius: 6,
          marginBottom: 16,
        }}
        className="animate-pulse"
      />
      {[140, 60, 170, 120, 100].map((h, i) => (
        <div
          key={i}
          style={{
            height: h,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            borderRadius: 18,
            marginBottom: 10,
          }}
          className="animate-pulse"
        />
      ))}
    </div>
  )
}

// ── SnapSheet ─────────────────────────────────────────────────────────────────

type SheetView = "menu" | "send" | "accept" | "reject" | "convert" | "done"

function QuoteActionsSheet({ quote, onClose }: { quote: QuoteDetail; onClose: () => void }) {
  const [view, setView] = useState<SheetView>("menu")
  const [rejectNote, setRejectNote] = useState("")
  const [convertName, setConvertName] = useState(quote.projectName)
  const [submitting, setSubmitting] = useState(false)

  const cfg = STATUS_CONFIG[quote.status]
  const canAct =
    quote.status !== "accepted" && quote.status !== "rejected" && quote.status !== "expired"

  async function post(path: string, body: object) {
    setSubmitting(true)
    await fetch(`/api/crm/quotes/${quote.id}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    setSubmitting(false)
    setView("done")
    setTimeout(onClose, 1100)
  }

  if (view === "done") {
    return (
      <div
        style={{
          padding: "32px 0 8px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 100,
            background: "rgba(90,255,160,0.15)",
            border: "1px solid rgba(90,255,160,0.30)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#5affa0",
          }}
        >
          <IconCheckCircle />
        </div>
        <p style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
          Acțiune înregistrată
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Quote summary */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          paddingBottom: 14,
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.90)" }}>
            {quote.ref} · {quote.version}
          </p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", marginTop: 2 }}>
            {quote.clientName}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p
            style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "-0.4px",
              color: "rgba(255,255,255,0.95)",
            }}
          >
            {fmt(quote.amount)}
          </p>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              padding: "2px 7px",
              borderRadius: 100,
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              color: cfg.color,
            }}
          >
            {cfg.label}
          </span>
        </div>
      </div>

      {/* ── Send sub-view ── */}
      {view === "send" && (
        <>
          <div
            style={{
              padding: "12px 14px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              marginBottom: 14,
            }}
          >
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", marginBottom: 4 }}>
              Destinatar
            </p>
            <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
              {quote.clientContactName}
            </p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", marginTop: 2 }}>
              {quote.clientEmail}
            </p>
          </div>
          <div
            style={{
              padding: "10px 12px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 10,
              marginBottom: 14,
              fontSize: 12,
              color: "rgba(255,255,255,0.50)",
              lineHeight: 1.5,
            }}
          >
            Subiect: Ofertă {quote.ref} — {fmt(quote.amount)} · {quote.projectName}
          </div>
          <button
            onClick={() => post("send", { channel: "email" })}
            disabled={submitting}
            style={{
              width: "100%",
              height: 46,
              background: "rgba(255,255,255,0.92)",
              borderRadius: 14,
              border: "none",
              fontSize: 14,
              fontWeight: 700,
              color: "#000",
              cursor: "pointer",
              marginBottom: 8,
            }}
          >
            {submitting ? "Se trimite…" : "Trimite Email"}
          </button>
          <button
            onClick={() => setView("menu")}
            style={{
              width: "100%",
              height: 40,
              background: "transparent",
              border: "none",
              fontSize: 13,
              color: "rgba(255,255,255,0.40)",
              cursor: "pointer",
            }}
          >
            Înapoi
          </button>
        </>
      )}

      {/* ── Accept sub-view ── */}
      {view === "accept" && (
        <>
          <div
            style={{
              padding: "10px 12px",
              background: "rgba(90,255,160,0.06)",
              border: "1px solid rgba(90,255,160,0.18)",
              borderRadius: 12,
              marginBottom: 14,
            }}
          >
            <p style={{ fontSize: 12, color: "rgba(140,255,180,0.80)", lineHeight: 1.45 }}>
              Oferta va fi marcată ca acceptată. Ulterior poți converti în proiect.
            </p>
          </div>
          <button
            onClick={() => post("decision", { decision: "accepted" })}
            disabled={submitting}
            style={{
              width: "100%",
              height: 46,
              background: "rgba(255,255,255,0.92)",
              borderRadius: 14,
              border: "none",
              fontSize: 14,
              fontWeight: 700,
              color: "#000",
              cursor: "pointer",
              marginBottom: 8,
            }}
          >
            {submitting ? "Se procesează…" : `Confirmă Acceptarea — ${fmt(quote.amount)}`}
          </button>
          <button
            onClick={() => setView("menu")}
            style={{
              width: "100%",
              height: 40,
              background: "transparent",
              border: "none",
              fontSize: 13,
              color: "rgba(255,255,255,0.40)",
              cursor: "pointer",
            }}
          >
            Înapoi
          </button>
        </>
      )}

      {/* ── Reject sub-view ── */}
      {view === "reject" && (
        <>
          <div
            style={{
              padding: "10px 12px",
              background: "rgba(255,60,60,0.08)",
              border: "1px solid rgba(255,80,80,0.18)",
              borderRadius: 12,
              marginBottom: 14,
            }}
          >
            <p style={{ fontSize: 12, color: "rgba(255,100,100,0.80)", lineHeight: 1.45 }}>
              Oferta va fi marcată ca respinsă. Specifică motivul pentru a îmbunătăți viitoarele
              oferte.
            </p>
          </div>
          <textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Motiv respingere (opțional)…"
            maxLength={500}
            style={{
              width: "100%",
              minHeight: 80,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: "10px 12px",
              fontSize: 13,
              color: "rgba(255,255,255,0.85)",
              resize: "none",
              marginBottom: 14,
              boxSizing: "border-box",
            }}
          />
          <button
            onClick={() => post("decision", { decision: "rejected", note: rejectNote })}
            disabled={submitting}
            style={{
              width: "100%",
              height: 46,
              background: "rgba(255,60,60,0.80)",
              borderRadius: 14,
              border: "none",
              fontSize: 14,
              fontWeight: 700,
              color: "#fff",
              cursor: "pointer",
              marginBottom: 8,
            }}
          >
            {submitting ? "Se procesează…" : "Marchează Respinsă"}
          </button>
          <button
            onClick={() => setView("menu")}
            style={{
              width: "100%",
              height: 40,
              background: "transparent",
              border: "none",
              fontSize: 13,
              color: "rgba(255,255,255,0.40)",
              cursor: "pointer",
            }}
          >
            Înapoi
          </button>
        </>
      )}

      {/* ── Convert sub-view ── */}
      {view === "convert" && (
        <>
          <div style={{ marginBottom: 14 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: "rgba(255,255,255,0.40)",
                marginBottom: 8,
              }}
            >
              Nume proiect
            </p>
            <input
              value={convertName}
              onChange={(e) => setConvertName(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 12,
                padding: "10px 12px",
                fontSize: 13,
                color: "rgba(255,255,255,0.85)",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div
            style={{
              padding: "10px 12px",
              background: "rgba(176,143,255,0.08)",
              border: "1px solid rgba(176,143,255,0.18)",
              borderRadius: 12,
              marginBottom: 14,
              fontSize: 12,
              color: "rgba(176,143,255,0.80)",
              lineHeight: 1.45,
            }}
          >
            Se va crea un proiect nou legat de oferta {quote.ref} · {fmt(quote.amount)}.
          </div>
          <button
            onClick={() => post("convert", { projectName: convertName })}
            disabled={submitting || !convertName.trim()}
            style={{
              width: "100%",
              height: 46,
              background: "rgba(255,255,255,0.92)",
              borderRadius: 14,
              border: "none",
              fontSize: 14,
              fontWeight: 700,
              color: "#000",
              cursor: convertName.trim() ? "pointer" : "default",
              marginBottom: 8,
            }}
          >
            {submitting ? "Se creează…" : "Creează Proiect"}
          </button>
          <button
            onClick={() => setView("menu")}
            style={{
              width: "100%",
              height: 40,
              background: "transparent",
              border: "none",
              fontSize: 13,
              color: "rgba(255,255,255,0.40)",
              cursor: "pointer",
            }}
          >
            Înapoi
          </button>
        </>
      )}

      {/* ── Menu ── */}
      {view === "menu" && (
        <>
          {/* Primary CTA */}
          {quote.status === "draft" && (
            <button
              onClick={() => setView("send")}
              style={{
                width: "100%",
                height: 46,
                background: "rgba(255,255,255,0.92)",
                borderRadius: 14,
                border: "none",
                fontSize: 14,
                fontWeight: 700,
                color: "#000",
                cursor: "pointer",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <IconSend />
              Trimite Clientului
            </button>
          )}
          {quote.status === "sent" && (
            <button
              onClick={() => post("approval", {})}
              style={{
                width: "100%",
                height: 46,
                background: "rgba(255,255,255,0.92)",
                borderRadius: 14,
                border: "none",
                fontSize: 14,
                fontWeight: 700,
                color: "#000",
                cursor: "pointer",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <IconApproval />
              Solicită Aprobare
            </button>
          )}
          {quote.status === "accepted" && (
            <button
              onClick={() => setView("convert")}
              style={{
                width: "100%",
                height: 46,
                background: "rgba(255,255,255,0.92)",
                borderRadius: 14,
                border: "none",
                fontSize: 14,
                fontWeight: 700,
                color: "#000",
                cursor: "pointer",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <IconConvert />
              Convertește în Proiect
            </button>
          )}

          {/* Action list */}
          {[
            quote.status === "sent" && {
              id: "send",
              icon: <IconSend />,
              iconStyle: "blue",
              label: "Retrimite Clientului",
              sub: `Email · ${quote.clientContactName}`,
              action: () => setView("send"),
            },
            canAct && {
              id: "accept",
              icon: <IconCheck />,
              iconStyle: "green",
              label: "Marchează Acceptată",
              sub: "Confirmat de client",
              action: () => setView("accept"),
            },
            {
              id: "download",
              icon: <IconDownload />,
              iconStyle: "neutral",
              label: "Descarcă PDF",
              sub: `${quote.ref}-${quote.version}.pdf`,
              action: () => {},
            },
            canAct && {
              id: "reject",
              icon: <IconXCircle />,
              iconStyle: "red",
              label: "Marchează Respinsă",
              sub: "Necesită motiv",
              action: () => setView("reject"),
            },
            quote.status === "accepted" && {
              id: "convert",
              icon: <IconConvert />,
              iconStyle: "neutral",
              label: "Convertește în Proiect",
              sub: "Creează proiect din ofertă",
              action: () => setView("convert"),
            },
          ]
            .filter(Boolean)
            .map((item: any) => (
              <button
                key={item.id}
                onClick={item.action}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 0",
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      item.iconStyle === "blue"
                        ? "rgba(100,160,255,0.12)"
                        : item.iconStyle === "green"
                          ? "rgba(90,255,160,0.12)"
                          : item.iconStyle === "red"
                            ? "rgba(255,60,60,0.14)"
                            : "rgba(255,255,255,0.08)",
                    color:
                      item.iconStyle === "blue"
                        ? "#7eb8ff"
                        : item.iconStyle === "green"
                          ? "#5affa0"
                          : item.iconStyle === "red"
                            ? "#ff6b6b"
                            : "rgba(255,255,255,0.65)",
                  }}
                >
                  {item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color:
                        item.iconStyle === "red"
                          ? "#ff6b6b"
                          : item.iconStyle === "green"
                            ? "#5affa0"
                            : "rgba(255,255,255,0.85)",
                    }}
                  >
                    {item.label}
                  </p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
                    {item.sub}
                  </p>
                </div>
                <span style={{ color: "rgba(255,255,255,0.20)" }}>
                  <IconChevronRight />
                </span>
              </button>
            ))}
        </>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function QuoteDetailClient({ id }: { id: string }) {
  const [quote, setQuote] = useState<QuoteDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const { openSheet } = useSheetStack()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/crm/quotes/${id}`)
      const data = await res.json()
      setQuote(data.quote ?? null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  function openActions() {
    if (!quote) return
    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: `${quote.ref} · Acțiuni`,
      render: (onClose) => <QuoteActionsSheet quote={quote} onClose={onClose} />,
    })
  }

  if (loading) return <Skeleton />
  if (!quote)
    return (
      <div
        className="px-4 pt-14 pb-28 max-w-2xl mx-auto"
        style={{ textAlign: "center", paddingTop: 80 }}
      >
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14 }}>Oferta nu a fost găsită.</p>
        <Link
          href="/crm/quotes"
          style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: 13,
            marginTop: 12,
            display: "inline-block",
          }}
        >
          Înapoi la oferte
        </Link>
      </div>
    )

  const cfg = STATUS_CONFIG[quote.status]
  const isSent = quote.status === "sent"
  const isUrgent = isSent && quote.daysUntilExpiry !== null && quote.daysUntilExpiry <= 5

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Back */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
        <Link
          href="/crm/quotes"
          style={{
            display: "flex",
            alignItems: "center",
            color: "rgba(255,255,255,0.40)",
            textDecoration: "none",
          }}
        >
          <IconChevronLeft />
        </Link>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.40)" }}>Oferte</span>
      </div>

      {/* Hero card */}
      <div
        style={{
          background: "var(--prv-g1)",
          border: `1px solid ${isUrgent ? "rgba(255,180,0,0.22)" : "var(--prv-border-subtle)"}`,
          borderRadius: 20,
          padding: 16,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(255,255,255,0.40)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                marginBottom: 3,
              }}
            >
              {quote.ref} · {quote.version}
            </p>
            <p
              style={{
                fontSize: 19,
                fontWeight: 700,
                letterSpacing: "-0.4px",
                color: "rgba(255,255,255,0.95)",
              }}
            >
              {quote.clientName}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p
              style={{
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: "-0.8px",
                color: quote.status === "accepted" ? "#5affa0" : "rgba(255,255,255,0.95)",
                lineHeight: 1,
              }}
            >
              {fmt(quote.amount)}
            </p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>
              incl. TVA {quote.vatRate}%
            </p>
            <div style={{ marginTop: 5 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  padding: "3px 8px",
                  borderRadius: 100,
                  background: cfg.bg,
                  border: `1px solid ${cfg.border}`,
                  color: cfg.color,
                }}
              >
                {cfg.label}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { label: "Emisă", value: fmtDate(quote.issuedDate), red: false },
            {
              label: "Expiră",
              value:
                quote.daysUntilExpiry !== null
                  ? `${fmtDate(quote.expiryDate)} · ${quote.daysUntilExpiry}z`
                  : fmtDate(quote.expiryDate),
              red: isUrgent,
            },
            { label: "Proiect", value: quote.projectName, red: false },
            { label: "Versiune", value: quote.version, red: false },
          ].map(({ label, value, red }) => (
            <div key={label}>
              <p
                style={{
                  fontSize: 9,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "rgba(255,255,255,0.35)",
                }}
              >
                {label}
              </p>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: red ? "#ffcc44" : "rgba(255,255,255,0.80)",
                  marginTop: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {red && <IconClock />}
                {value}
              </p>
            </div>
          ))}
        </div>

        {quote.notes && (
          <div
            style={{
              marginTop: 12,
              padding: "8px 10px",
              background: "rgba(255,255,255,0.04)",
              borderRadius: 10,
              borderLeft: "2px solid rgba(255,255,255,0.12)",
            }}
          >
            <p
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.55)",
                fontStyle: "italic",
                lineHeight: 1.4,
              }}
            >
              {quote.notes}
            </p>
          </div>
        )}
      </div>

      {/* Client block */}
      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding: "11px 13px",
          display: "flex",
          alignItems: "center",
          gap: 11,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            background: "rgba(255,255,255,0.10)",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {quote.clientInitials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.90)" }}>
            {quote.clientName}
          </p>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.40)", marginTop: 1 }}>
            {quote.clientContactName} · {quote.clientEmail}
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <a
            href={`tel:${quote.clientPhone}`}
            style={{
              width: 32,
              height: 32,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.70)",
              textDecoration: "none",
            }}
          >
            <IconPhone />
          </a>
          <button
            style={{
              width: 32,
              height: 32,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.70)",
              cursor: "pointer",
            }}
          >
            <IconMail />
          </button>
        </div>
      </div>

      {/* Line items */}
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "rgba(255,255,255,0.40)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: 6,
        }}
      >
        Articole ofertă
      </p>
      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          overflow: "hidden",
          marginBottom: 10,
        }}
      >
        {quote.lineItems.map((item, idx) => (
          <div
            key={item.id}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 13px",
              gap: 10,
              borderBottom:
                idx < quote.lineItems.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                background: "rgba(255,255,255,0.08)",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
                color: "rgba(255,255,255,0.50)",
                flexShrink: 0,
              }}
            >
              {idx + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>
                {item.description}
              </p>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
                {item.quantity} {item.unit} × {fmt(item.unitPrice)}/{item.unit}
              </p>
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>
              {fmt(item.total)}
            </p>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          overflow: "hidden",
          marginBottom: 10,
        }}
      >
        {[
          { label: "Subtotal", value: fmt(quote.subtotal), bold: false },
          { label: `TVA ${quote.vatRate}%`, value: fmt(quote.vatAmount), bold: false },
          { label: "Total ofertă", value: fmt(quote.amount), bold: true },
        ].map(({ label, value, bold }) => (
          <div
            key={label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "9px 13px",
              borderBottom: label !== "Total ofertă" ? "1px solid rgba(255,255,255,0.06)" : "none",
              background: bold ? "rgba(255,255,255,0.03)" : "transparent",
            }}
          >
            <span
              style={{
                fontSize: bold ? 13 : 12,
                fontWeight: bold ? 700 : 400,
                color: "rgba(255,255,255,0.55)",
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontSize: bold ? 17 : 12,
                fontWeight: bold ? 800 : 600,
                color: bold ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.80)",
                letterSpacing: bold ? "-0.3px" : "normal",
              }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Approval chain */}
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "rgba(255,255,255,0.40)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: 6,
        }}
      >
        Lanț de aprobare
      </p>
      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          overflow: "hidden",
          marginBottom: 10,
        }}
      >
        {quote.approvalChain.map((step, idx) => {
          const d = APPROVAL_DOT[step.status]
          return (
            <div
              key={step.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 13px",
                borderBottom:
                  idx < quote.approvalChain.length - 1
                    ? "1px solid rgba(255,255,255,0.06)"
                    : "none",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 100,
                  background: d.bg,
                  border: `1px solid ${d.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {step.status === "approved" && (
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={d.color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {step.status === "pending" && (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={d.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                )}
                {step.status === "waiting" && (
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={d.color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <circle cx="12" cy="12" r="1.5" fill={d.color} />
                  </svg>
                )}
                {step.status === "rejected" && (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={d.color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.80)" }}>
                  {step.actorName}
                </p>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
                  {step.actorRole}
                </p>
              </div>
              <p
                style={{ fontSize: 10, fontWeight: 600, color: APPROVAL_STATUS_COLOR[step.status] }}
              >
                {APPROVAL_STATUS_LABEL[step.status]}
              </p>
            </div>
          )
        })}
      </div>

      {/* Activity */}
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "rgba(255,255,255,0.40)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: 6,
        }}
      >
        Activitate
      </p>
      <div>
        {quote.activities.map((act, idx) => (
          <div
            key={act.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "10px 0",
              borderBottom:
                idx < quote.activities.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                marginTop: 4,
                flexShrink: 0,
                background: ACTIVITY_DOT[act.type],
                boxShadow: ACTIVITY_GLOW[act.type] ? `0 0 6px ${ACTIVITY_GLOW[act.type]}` : "none",
              }}
            />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.78)", lineHeight: 1.35 }}>
                {act.text}
              </p>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", marginTop: 2 }}>
                {relTime(act.timestamp)}
                {act.actor ? ` · ${act.actor}` : ""}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={openActions}
        style={{
          position: "fixed",
          bottom: 90,
          right: 20,
          width: 50,
          height: 50,
          background: "rgba(255,255,255,0.92)",
          borderRadius: 100,
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          cursor: "pointer",
          color: "#000",
          zIndex: 40,
        }}
      >
        <IconPlus />
      </button>
    </div>
  )
}
