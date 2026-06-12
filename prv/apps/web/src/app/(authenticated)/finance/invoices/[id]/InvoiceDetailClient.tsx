"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useSheetStack } from "@prv/ui"
import type {
  InvoiceDetail,
  InvoiceActivityType,
  InvoicePaymentMethod,
} from "@/app/api/finance/invoices/[id]/route"
import type { InvoiceStatus } from "@/app/api/finance/invoices/route"

// ── Icons (SF Symbol style — stroke only, no fill, no emoji) ─────────────────

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

function IconPencil() {
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
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function IconTrash() {
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
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

function IconSendReminder() {
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

function IconBank() {
  return (
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
      <line x1="3" y1="22" x2="21" y2="22" />
      <line x1="6" y1="18" x2="6" y2="11" />
      <line x1="10" y1="18" x2="10" y2="11" />
      <line x1="14" y1="18" x2="14" y2="11" />
      <line x1="18" y1="18" x2="18" y2="11" />
      <polygon points="12 2 20 7 4 7 12 2" />
    </svg>
  )
}

function IconCash() {
  return (
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
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  )
}

function IconCard() {
  return (
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
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
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

// ── Types & helpers ───────────────────────────────────────────────────────────

function fmt(amount: number) {
  return "€" + amount.toLocaleString("en-US")
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
  return `${d}d ago`
}

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  overdue: {
    label: "Overdue",
    color: "#ff6b6b",
    bg: "rgba(255,80,80,0.12)",
    border: "rgba(255,80,80,0.22)",
  },
  due: {
    label: "Due",
    color: "#ffcc44",
    bg: "rgba(255,180,0,0.12)",
    border: "rgba(255,180,0,0.22)",
  },
  partial: {
    label: "Partial",
    color: "#b08fff",
    bg: "rgba(130,100,255,0.14)",
    border: "rgba(130,100,255,0.24)",
  },
  paid: {
    label: "Paid",
    color: "#5affa0",
    bg: "rgba(80,255,140,0.10)",
    border: "rgba(80,255,140,0.20)",
  },
  draft: {
    label: "Draft",
    color: "rgba(255,255,255,0.45)",
    bg: "rgba(255,255,255,0.07)",
    border: "rgba(255,255,255,0.14)",
  },
  void: {
    label: "Cancelled",
    color: "rgba(255,255,255,0.30)",
    bg: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.10)",
  },
}

const ACTIVITY_DOT: Record<InvoiceActivityType, string> = {
  overdue: "#ff6b6b",
  reminder: "#ffcc44",
  payment: "#5affa0",
  sent: "rgba(255,255,255,0.55)",
  created: "rgba(255,255,255,0.30)",
  voided: "rgba(255,80,80,0.60)",
}

const ACTIVITY_GLOW: Record<InvoiceActivityType, string | null> = {
  overdue: "rgba(255,80,80,0.6)",
  reminder: "rgba(255,200,0,0.5)",
  payment: "rgba(80,255,140,0.5)",
  sent: null,
  created: null,
  voided: null,
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
      {[130, 60, 160, 100, 100].map((h, i) => (
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

// ── SnapSheet sub-views ───────────────────────────────────────────────────────

type SheetView = "menu" | "mark_paid" | "reminder" | "void" | "done"

function InvoiceActionsSheet({
  invoice,
  onClose,
}: {
  invoice: InvoiceDetail
  onClose: () => void
}) {
  const [view, setView] = useState<SheetView>("menu")
  const [payMethod, setPayMethod] = useState<InvoicePaymentMethod>("bank_transfer")
  const [payDate] = useState(new Date().toISOString().slice(0, 10))
  const [voidReason, setVoidReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const canAct = invoice.status !== "paid" && invoice.status !== "void"

  async function markPaid() {
    setSubmitting(true)
    await fetch(`/api/finance/invoices/${invoice.id}/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: payMethod, paidDate: payDate }),
    })
    setSubmitting(false)
    setView("done")
    setTimeout(onClose, 1100)
  }

  async function sendReminder() {
    setSubmitting(true)
    await fetch(`/api/finance/invoices/${invoice.id}/reminder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: "email" }),
    })
    setSubmitting(false)
    setView("done")
    setTimeout(onClose, 1100)
  }

  async function voidInvoice() {
    if (!voidReason.trim()) return
    setSubmitting(true)
    await fetch(`/api/finance/invoices/${invoice.id}/void`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: voidReason }),
    })
    setSubmitting(false)
    setView("done")
    setTimeout(onClose, 1100)
  }

  const cfg = STATUS_CONFIG[invoice.status]

  const PAY_METHODS: { id: InvoicePaymentMethod; label: string; icon: React.ReactNode }[] = [
    { id: "bank_transfer", label: "Transfer", icon: <IconBank /> },
    { id: "cash", label: "Numerar", icon: <IconCash /> },
    { id: "card", label: "Card", icon: <IconCard /> },
  ]

  // ── Done state ──
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
          Action recorded
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Invoice summary row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.90)" }}>
            {invoice.ref}
          </p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", marginTop: 2 }}>
            {invoice.clientName}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 18, fontWeight: 800, color: cfg.color, letterSpacing: "-0.4px" }}>
            {fmt(invoice.amount)}
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

      {/* ── Mark as Paid sub-view ── */}
      {view === "mark_paid" && (
        <>
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "rgba(255,255,255,0.40)",
              marginBottom: 8,
            }}
          >
            Payment method
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 6,
              marginBottom: 14,
            }}
          >
            {PAY_METHODS.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setPayMethod(id)}
                style={{
                  background:
                    payMethod === id ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
                  border:
                    payMethod === id
                      ? "1px solid rgba(255,255,255,0.30)"
                      : "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 12,
                  padding: "8px 4px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 5,
                  cursor: "pointer",
                  color: payMethod === id ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.50)",
                }}
              >
                {icon}
                <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
              </button>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>Payment date</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
              {fmtDate(payDate)}
            </span>
          </div>

          <button
            onClick={markPaid}
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
            {submitting ? "Processing…" : `Mark ${fmt(invoice.amount)} as Paid`}
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
            Back
          </button>
        </>
      )}

      {/* ── Send Reminder sub-view ── */}
      {view === "reminder" && (
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
              {invoice.clientContactName}
            </p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", marginTop: 2 }}>
              {invoice.clientName}
            </p>
          </div>
          <div
            style={{
              padding: "10px 12px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              marginBottom: 14,
              fontSize: 12,
              color: "rgba(255,255,255,0.55)",
              lineHeight: 1.5,
            }}
          >
            Subject: Payment reminder {invoice.ref} — {fmt(invoice.amount)}
          </div>
          <button
            onClick={sendReminder}
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
            {submitting ? "Se trimite…" : "Trimite Reminder"}
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
            Back
          </button>
        </>
      )}

      {/* ── Void sub-view ── */}
      {view === "void" && (
        <>
          <div
            style={{
              padding: "10px 12px",
              background: "rgba(255,60,60,0.08)",
              border: "1px solid rgba(255,80,80,0.20)",
              borderRadius: 12,
              marginBottom: 14,
            }}
          >
            <p style={{ fontSize: 12, color: "rgba(255,100,100,0.80)", lineHeight: 1.45 }}>
              This action is irreversible. The invoice will be marked as void and remain in records.
            </p>
          </div>
          <textarea
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            placeholder="Cancellation reason (required)…"
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
            onClick={voidInvoice}
            disabled={submitting || !voidReason.trim()}
            style={{
              width: "100%",
              height: 46,
              background: voidReason.trim() ? "rgba(255,60,60,0.85)" : "rgba(255,60,60,0.25)",
              borderRadius: 14,
              border: "none",
              fontSize: 14,
              fontWeight: 700,
              color: voidReason.trim() ? "#fff" : "rgba(255,255,255,0.35)",
              cursor: voidReason.trim() ? "pointer" : "default",
              marginBottom: 8,
              transition: "all 0.2s",
            }}
          >
            {submitting ? "Cancelling…" : "Void Invoice"}
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
            Back
          </button>
        </>
      )}

      {/* ── Menu ── */}
      {view === "menu" && (
        <div>
          {canAct && (
            <button
              onClick={() => setView("mark_paid")}
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
              }}
            >
              Mark as Paid
            </button>
          )}

          {[
            canAct && {
              id: "reminder",
              icon: <IconSendReminder />,
              label: "Trimite Reminder",
              sub: `Email · ${invoice.clientContactName}`,
              action: () => setView("reminder"),
            },
            {
              id: "download",
              icon: <IconDownload />,
              label: "Download PDF",
              sub: `${invoice.ref}.pdf`,
              action: () => {},
            },
            {
              id: "edit",
              icon: <IconPencil />,
              label: "Edit Invoice",
              sub: "Edit items or dates",
              action: () => {},
            },
            canAct && {
              id: "void",
              icon: <IconTrash />,
              label: "Void Invoice",
              sub: "Irreversible · requires reason",
              action: () => setView("void"),
              destructive: true,
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
                    background: item.destructive
                      ? "rgba(255,60,60,0.15)"
                      : "rgba(255,255,255,0.08)",
                    color: item.destructive ? "#ff6b6b" : "rgba(255,255,255,0.65)",
                  }}
                >
                  {item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: item.destructive ? "#ff6b6b" : "rgba(255,255,255,0.85)",
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
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function InvoiceDetailClient({ id }: { id: string }) {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const { openSheet } = useSheetStack()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/finance/invoices/${id}`)
      const data = await res.json()
      setInvoice(data.invoice ?? null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  function openActions() {
    if (!invoice) return
    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: `${invoice.ref} · Actions`,
      render: (onClose) => <InvoiceActionsSheet invoice={invoice} onClose={onClose} />,
    })
  }

  if (loading) return <Skeleton />
  if (!invoice)
    return (
      <div
        className="px-4 pt-14 pb-28 max-w-2xl mx-auto"
        style={{ textAlign: "center", paddingTop: 80 }}
      >
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14 }}>Invoice not found.</p>
        <Link
          href="/finance/invoices"
          style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: 13,
            marginTop: 12,
            display: "inline-block",
          }}
        >
          Back la facturi
        </Link>
      </div>
    )

  const cfg = STATUS_CONFIG[invoice.status]
  const isAlert = invoice.status === "overdue" || invoice.status === "due"

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Back row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
        <Link
          href="/finance/invoices"
          style={{
            display: "flex",
            alignItems: "center",
            color: "rgba(255,255,255,0.40)",
            textDecoration: "none",
          }}
        >
          <IconChevronLeft />
        </Link>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.40)" }}>Facturi</span>
      </div>

      {/* Hero header card */}
      <div
        style={{
          background: "var(--prv-g1)",
          border: isAlert ? "1px solid rgba(255,80,80,0.18)" : "1px solid var(--prv-border-subtle)",
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
              {invoice.ref}
            </p>
            <p
              style={{
                fontSize: 19,
                fontWeight: 700,
                letterSpacing: "-0.4px",
                color: "rgba(255,255,255,0.95)",
              }}
            >
              {invoice.clientName}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p
              style={{
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: "-0.8px",
                color: isAlert ? cfg.color : "rgba(255,255,255,0.95)",
                lineHeight: 1,
              }}
            >
              {fmt(invoice.amount)}
            </p>
            <p
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.35)",
                textAlign: "right",
                marginTop: 3,
              }}
            >
              incl. TVA {invoice.vatRate}%
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
            { label: "Issued", value: fmtDate(invoice.issuedDate), red: false },
            { label: "Due", value: fmtDate(invoice.dueDate), red: isAlert },
            { label: "Proiect", value: invoice.projectName, red: false },
            { label: "Serie", value: invoice.series, red: false },
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
                  color: red ? "#ff6b6b" : "rgba(255,255,255,0.80)",
                  marginTop: 2,
                }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Client block */}
      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          gap: 12,
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
          {invoice.clientInitials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.90)" }}>
            {invoice.clientName}
          </p>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.40)", marginTop: 1 }}>
            CIF: {invoice.clientCif} · {invoice.clientContactName}
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <a
            href={`tel:${invoice.clientPhone}`}
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
        Articole
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
        {invoice.lineItems.map((item, idx) => (
          <div
            key={item.id}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 14px",
              gap: 10,
              borderBottom:
                idx < invoice.lineItems.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
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
            <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.90)" }}>
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
          { label: "Subtotal", value: fmt(invoice.subtotal), bold: false, accent: false },
          {
            label: `TVA ${invoice.vatRate}%`,
            value: fmt(invoice.vatAmount),
            bold: false,
            accent: false,
          },
          { label: "Total", value: fmt(invoice.amount), bold: true, accent: isAlert },
        ].map(({ label, value, bold, accent }) => (
          <div
            key={label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "9px 14px",
              borderBottom: label !== "Total" ? "1px solid rgba(255,255,255,0.06)" : "none",
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
                color: accent
                  ? "#ff6b6b"
                  : bold
                    ? "rgba(255,255,255,0.95)"
                    : "rgba(255,255,255,0.85)",
                letterSpacing: bold ? "-0.3px" : "normal",
              }}
            >
              {value}
            </span>
          </div>
        ))}
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
        {invoice.activities.map((act, idx) => (
          <div
            key={act.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "10px 0",
              borderBottom:
                idx < invoice.activities.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
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
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.80)", lineHeight: 1.35 }}>
                {act.text}
              </p>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", marginTop: 2 }}>
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
