"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import type {
  ClientDetail,
  LinkedQuote,
  LinkedInvoice,
  LinkedProject,
  ClientActivity,
  ClientActivityType,
} from "@/app/api/crm/clients/[id]/route"
import type { ClientStatus } from "@/app/api/crm/clients/route"

// ── Icons ─────────────────────────────────────────────────────────────────────

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
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012.18 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.15a16 16 0 006.94 6.94l1.51-1.52a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  )
}

function IconMail() {
  return (
    <svg
      width="14"
      height="14"
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

function IconPin() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function IconFile() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

function IconFolder() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconMessage() {
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
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return "€" + n.toLocaleString("en-US")
}

const STATUS_CONFIG: Record<
  ClientStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  vip: {
    label: "VIP",
    color: "rgba(255,215,0,0.95)",
    bg: "rgba(255,215,0,0.12)",
    border: "rgba(255,215,0,0.28)",
  },
  active: {
    label: "Active",
    color: "rgba(48,209,88,0.90)",
    bg: "rgba(48,209,88,0.12)",
    border: "rgba(48,209,88,0.24)",
  },
  lead: {
    label: "Lead",
    color: "#7eb8ff",
    bg: "rgba(100,160,255,0.12)",
    border: "rgba(100,160,255,0.24)",
  },
  cold: {
    label: "Inactive",
    color: "rgba(255,255,255,0.40)",
    bg: "rgba(255,255,255,0.07)",
    border: "rgba(255,255,255,0.14)",
  },
}

const QUOTE_STATUS_CONFIG = {
  draft: {
    label: "Draft",
    color: "rgba(255,255,255,0.45)",
    bg: "rgba(255,255,255,0.07)",
    border: "rgba(255,255,255,0.14)",
  },
  sent: {
    label: "Sent",
    color: "#7eb8ff",
    bg: "rgba(100,160,255,0.12)",
    border: "rgba(100,160,255,0.24)",
  },
  accepted: {
    label: "Accepted",
    color: "#5affa0",
    bg: "rgba(80,255,140,0.10)",
    border: "rgba(80,255,140,0.20)",
  },
  rejected: {
    label: "Rejected",
    color: "#ff6b6b",
    bg: "rgba(255,80,80,0.12)",
    border: "rgba(255,80,80,0.22)",
  },
  expired: {
    label: "Expired",
    color: "rgba(255,255,255,0.30)",
    bg: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.10)",
  },
}

const INVOICE_STATUS_CONFIG = {
  paid: {
    label: "Paid",
    color: "#5affa0",
    bg: "rgba(80,255,140,0.10)",
    border: "rgba(80,255,140,0.20)",
  },
  due: {
    label: "Due",
    color: "#ffcc44",
    bg: "rgba(255,200,50,0.12)",
    border: "rgba(255,200,50,0.24)",
  },
  overdue: {
    label: "Overdue",
    color: "#ff6b6b",
    bg: "rgba(255,80,80,0.12)",
    border: "rgba(255,80,80,0.22)",
  },
  partial: {
    label: "Partial",
    color: "#7eb8ff",
    bg: "rgba(100,160,255,0.12)",
    border: "rgba(100,160,255,0.24)",
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
    bg: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.10)",
  },
}

function activityIcon(type: ClientActivityType) {
  if (type === "invoice_paid" || type === "quote_accepted")
    return { icon: <IconCheck />, color: "#5affa0", bg: "rgba(80,255,140,0.12)" }
  if (type === "project_started" || type === "project_completed")
    return { icon: <IconFolder />, color: "#7eb8ff", bg: "rgba(100,160,255,0.10)" }
  return { icon: <IconFile />, color: "rgba(255,255,255,0.40)", bg: "rgba(255,255,255,0.07)" }
}

function fmtTs(ts: string) {
  return new Date(ts).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {[80, 160, 100, 200, 160].map((h, i) => (
        <div
          key={i}
          style={{
            height: h,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            borderRadius: 20,
            marginBottom: 12,
          }}
          className="animate-pulse"
        />
      ))}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        borderRadius: 20,
        padding: "14px 16px",
        marginBottom: 12,
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent)",
        }}
      />
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: "rgba(255,255,255,0.35)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginBottom: 10,
      }}
    >
      {children}
    </p>
  )
}

function IconBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.10)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(255,255,255,0.45)",
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  )
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 0",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <IconBox>{icon}</IconBox>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", marginBottom: 1 }}>{label}</p>
        <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{value}</p>
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ClientDetailClient({ id }: { id: string }) {
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/crm/clients/${id}`)
      .then((r) => r.json())
      .then((d) => setClient(d.client ?? null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <Skeleton />
  if (!client)
    return (
      <div
        className="px-4 pt-14 max-w-2xl mx-auto"
        style={{ color: "rgba(255,255,255,0.40)", textAlign: "center", paddingTop: 80 }}
      >
        Client not found
      </div>
    )

  const cfg = STATUS_CONFIG[client.status]
  const outstanding = client.totalInvoiced - client.totalPaid

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Link
          href="/clients"
          style={{
            display: "flex",
            alignItems: "center",
            color: "rgba(255,255,255,0.40)",
            textDecoration: "none",
          }}
        >
          <IconChevronLeft />
        </Link>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.40)" }}>Clients</span>
      </div>

      {/* Hero */}
      <Card style={{ padding: "16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 100,
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.16)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
                color: "rgba(255,255,255,0.90)",
                flexShrink: 0,
              }}
            >
              {client.initials}
            </div>
            <div>
              <h1
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: "-0.4px",
                  color: "rgba(255,255,255,0.95)",
                }}
              >
                {client.name}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                <span style={{ color: "rgba(255,255,255,0.30)" }}>
                  <IconPin />
                </span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.40)" }}>
                  {client.location}
                </span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.20)" }}>
                  · Client din {client.since}
                </span>
              </div>
            </div>
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              padding: "3px 9px",
              borderRadius: 100,
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              color: cfg.color,
              flexShrink: 0,
            }}
          >
            {cfg.label}
          </span>
        </div>
        {client.nps !== null && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 10px",
              borderRadius: 100,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.40)" }}>NPS</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.90)" }}>
              {client.nps}
            </span>
          </div>
        )}
      </Card>

      {/* Financial KPIs */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}
      >
        {[
          { label: "LTV", value: fmt(client.ltv), color: "rgba(255,255,255,0.95)" },
          { label: "Collected", value: fmt(client.totalPaid), color: "#5affa0" },
          {
            label: "Restant",
            value: outstanding > 0 ? fmt(outstanding) : "—",
            color: outstanding > 0 ? "#ffcc44" : "rgba(255,255,255,0.30)",
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 16,
              padding: "10px 10px 8px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent)",
              }}
            />
            <p style={{ fontSize: 15, fontWeight: 700, color, letterSpacing: "-0.3px" }}>{value}</p>
            <p
              style={{
                fontSize: 9,
                fontWeight: 500,
                color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginTop: 2,
              }}
            >
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Contact info */}
      <Card>
        <SectionLabel>Contact</SectionLabel>
        <DetailRow icon={<IconPhone />} label="Telefon" value={client.phone} />
        <DetailRow icon={<IconMail />} label="Email" value={client.email} />
        {client.address && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
            <IconBox>
              <IconPin />
            </IconBox>
            <div>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", marginBottom: 1 }}>
                Address
              </p>
              <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
                {client.address}
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Projects */}
      {client.projects.length > 0 && (
        <Card>
          <SectionLabel>Proiecte ({client.projects.length})</SectionLabel>
          {client.projects.map((p: LinkedProject, i) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              style={{
                display: "block",
                padding: "10px 0",
                borderBottom:
                  i < client.projects.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none",
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ flex: 1, marginRight: 12 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>
                    {p.name}
                  </p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                    {p.currentPhaseName}
                  </p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.90)" }}>
                    {p.completionPct}%
                  </p>
                  <span style={{ color: "rgba(255,255,255,0.20)" }}>
                    <IconChevronRight />
                  </span>
                </div>
              </div>
              <div
                style={{
                  marginTop: 7,
                  height: 4,
                  borderRadius: 100,
                  background: "rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 100,
                    width: `${p.completionPct}%`,
                    background: p.completionPct >= 90 ? "#5affa0" : "rgba(255,255,255,0.55)",
                  }}
                />
              </div>
            </Link>
          ))}
        </Card>
      )}

      {/* Quotes */}
      {client.quotes.length > 0 && (
        <Card>
          <SectionLabel>Oferte ({client.quotes.length})</SectionLabel>
          {client.quotes.map((q: LinkedQuote, i) => {
            const qcfg = QUOTE_STATUS_CONFIG[q.status]
            return (
              <Link
                key={q.id}
                href={`/crm/quotes/${q.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "9px 0",
                  borderBottom:
                    i < client.quotes.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none",
                  textDecoration: "none",
                }}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
                    {q.ref}
                  </p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
                    {q.projectName}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
                    {fmt(q.amount)}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "2px 7px",
                      borderRadius: 100,
                      background: qcfg.bg,
                      border: `1px solid ${qcfg.border}`,
                      color: qcfg.color,
                    }}
                  >
                    {qcfg.label}
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.20)" }}>
                    <IconChevronRight />
                  </span>
                </div>
              </Link>
            )
          })}
        </Card>
      )}

      {/* Invoices */}
      {client.invoices.length > 0 && (
        <Card>
          <SectionLabel>Facturi ({client.invoices.length})</SectionLabel>
          {client.invoices.map((inv: LinkedInvoice, i) => {
            const icfg = INVOICE_STATUS_CONFIG[inv.status]
            return (
              <Link
                key={inv.id}
                href={`/finance/invoices/${inv.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "9px 0",
                  borderBottom:
                    i < client.invoices.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none",
                  textDecoration: "none",
                }}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
                    {inv.ref}
                  </p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
                    {inv.projectName}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: inv.status === "paid" ? "#5affa0" : "rgba(255,255,255,0.85)",
                    }}
                  >
                    {fmt(inv.amount)}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "2px 7px",
                      borderRadius: 100,
                      background: icfg.bg,
                      border: `1px solid ${icfg.border}`,
                      color: icfg.color,
                    }}
                  >
                    {icfg.label}
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.20)" }}>
                    <IconChevronRight />
                  </span>
                </div>
              </Link>
            )
          })}
        </Card>
      )}

      {/* Activity timeline */}
      {client.activities.length > 0 && (
        <Card>
          <SectionLabel>Activitate</SectionLabel>
          {client.activities.map((act: ClientActivity, i) => {
            const aIcon = activityIcon(act.type)
            return (
              <div
                key={act.id}
                style={{
                  display: "flex",
                  gap: 10,
                  paddingBottom: i < client.activities.length - 1 ? 12 : 0,
                  borderBottom:
                    i < client.activities.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none",
                  marginBottom: i < client.activities.length - 1 ? 12 : 0,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 100,
                    background: aIcon.bg,
                    border: "1px solid rgba(255,255,255,0.10)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: aIcon.color,
                    flexShrink: 0,
                  }}
                >
                  {aIcon.icon}
                </div>
                <div style={{ paddingTop: 4 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.82)" }}>
                    {act.text}
                  </p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", marginTop: 2 }}>
                    {fmtTs(act.timestamp)}
                  </p>
                </div>
              </div>
            )
          })}
        </Card>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <a
          href={`tel:${client.phone}`}
          style={{
            flex: 1,
            padding: "11px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.11)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 5,
            textDecoration: "none",
            color: "rgba(255,255,255,0.65)",
          }}
        >
          <IconPhone />
          <span style={{ fontSize: 11, fontWeight: 600 }}>Call</span>
        </a>
        <a
          href={`mailto:${client.email}`}
          style={{
            flex: 1,
            padding: "11px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.11)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 5,
            textDecoration: "none",
            color: "rgba(255,255,255,0.65)",
          }}
        >
          <IconMail />
          <span style={{ fontSize: 11, fontWeight: 600 }}>Email</span>
        </a>
        <button
          style={{
            flex: 1,
            padding: "11px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.11)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 5,
            cursor: "pointer",
            color: "rgba(255,255,255,0.65)",
          }}
        >
          <IconMessage />
          <span style={{ fontSize: 11, fontWeight: 600 }}>Mesaj</span>
        </button>
        <Link
          href={`/crm/quotes/new?clientId=${client.id}`}
          style={{
            flex: 2,
            padding: "11px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.92)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 5,
            textDecoration: "none",
            color: "#000",
          }}
        >
          <IconFile />
          <span style={{ fontSize: 11, fontWeight: 700 }}>New quote</span>
        </Link>
      </div>
    </div>
  )
}
