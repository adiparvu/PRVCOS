"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import type { LeadDetail, LeadActivity } from "@/app/api/crm/leads/[id]/route"
import type { LeadStage, LeadSource } from "@/app/api/crm/leads/route"

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

function IconPhone() {
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
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012.18 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.15a16 16 0 006.94 6.94l1.51-1.52a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  )
}

function IconMail() {
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
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function IconFile() {
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
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
  )
}

function IconArrow() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

function IconStar() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
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

// ── Helpers ───────────────────────────────────────────────────────────────────

const STAGES: { id: LeadStage; label: string }[] = [
  { id: "new", label: "Nou" },
  { id: "contacted", label: "Contactat" },
  { id: "qualified", label: "Calificat" },
  { id: "proposal", label: "Propunere" },
  { id: "negotiation", label: "Negociere" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Pierdut" },
]

const STAGE_INDEX: Record<LeadStage, number> = {
  new: 0,
  contacted: 1,
  qualified: 2,
  proposal: 3,
  negotiation: 4,
  won: 5,
  lost: 6,
}

const SOURCE_LABEL: Record<LeadSource, string> = {
  website: "Website",
  referral: "Referral",
  cold_call: "Cold Call",
  social: "Social Media",
  event: "Eveniment",
  partner: "Partener",
}

function scoreColor(score: number) {
  if (score >= 70)
    return { color: "#5affa0", bg: "rgba(80,255,140,0.12)", border: "rgba(80,255,140,0.24)" }
  if (score >= 45)
    return {
      color: "rgba(255,159,10,0.95)",
      bg: "rgba(255,159,10,0.12)",
      border: "rgba(255,159,10,0.28)",
    }
  return {
    color: "rgba(255,255,255,0.55)",
    bg: "rgba(255,255,255,0.07)",
    border: "rgba(255,255,255,0.14)",
  }
}

function activityIcon(type: LeadActivity["type"]) {
  if (type === "call") return { color: "#5affa0", bg: "rgba(80,255,140,0.10)" }
  if (type === "email") return { color: "#7eb8ff", bg: "rgba(100,160,255,0.10)" }
  if (type === "message") return { color: "rgba(255,159,10,0.90)", bg: "rgba(255,159,10,0.10)" }
  if (type === "stage_change")
    return { color: "rgba(255,255,255,0.80)", bg: "rgba(255,255,255,0.08)" }
  return { color: "rgba(255,255,255,0.35)", bg: "rgba(255,255,255,0.06)" }
}

function activityIconSvg(type: LeadActivity["type"]) {
  if (type === "call") return <IconPhone />
  if (type === "email") return <IconMail />
  if (type === "message")
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    )
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4l3 3" />
    </svg>
  )
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
      {[80, 100, 130, 160, 180].map((h, i) => (
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

// ── Card wrapper ──────────────────────────────────────────────────────────────

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
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent)",
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

// ── Component ─────────────────────────────────────────────────────────────────

export function LeadDetailClient({ id }: { id: string }) {
  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/crm/leads/${id}`)
      .then((r) => r.json())
      .then((d) => setLead(d.lead ?? null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <Skeleton />
  if (!lead)
    return (
      <div
        className="px-4 pt-14 max-w-2xl mx-auto"
        style={{ color: "rgba(255,255,255,0.40)", textAlign: "center", paddingTop: 80 }}
      >
        Lead not found
      </div>
    )

  const sc = scoreColor(lead.score)
  const stageIdx = STAGE_INDEX[lead.stage]
  const isTerminal = lead.stage === "won" || lead.stage === "lost"

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Link
          href="/crm/leads"
          style={{
            display: "flex",
            alignItems: "center",
            color: "rgba(255,255,255,0.40)",
            textDecoration: "none",
          }}
        >
          <IconChevronLeft />
        </Link>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.40)" }}>CRM · Leads</span>
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
          <div>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "-0.4px",
                color: "rgba(255,255,255,0.95)",
              }}
            >
              {lead.name}
            </h1>
            {lead.company && (
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", marginTop: 2 }}>
                {lead.company}
              </p>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
              <span style={{ color: "rgba(255,255,255,0.30)" }}>
                <IconPin />
              </span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.40)" }}>
                {SOURCE_LABEL[lead.source]}
              </span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.20)" }}>
                · {lead.createdAt}
              </span>
            </div>
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              borderRadius: 100,
              background: sc.bg,
              border: `1px solid ${sc.border}`,
              color: sc.color,
              flexShrink: 0,
            }}
          >
            <IconStar />
            <span style={{ fontSize: 12, fontWeight: 700 }}>{lead.score}</span>
          </div>
        </div>
      </Card>

      {/* Stage pipeline */}
      <Card>
        <SectionLabel>Pipeline Stage</SectionLabel>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            overflowX: "auto",
            scrollbarWidth: "none",
            paddingBottom: 4,
          }}
        >
          {STAGES.map((s, i) => {
            const isActive = s.id === lead.stage
            const isPast = i < stageIdx
            const isLost = s.id === "lost"
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    minWidth: i === 0 ? 40 : 52,
                  }}
                >
                  <div
                    style={{
                      width: isActive ? 10 : 8,
                      height: isActive ? 10 : 8,
                      borderRadius: 100,
                      background: isLost
                        ? isActive
                          ? "#ff6b6b"
                          : "rgba(255,80,80,0.15)"
                        : isActive
                          ? "rgba(255,159,10,0.90)"
                          : isPast
                            ? "rgba(255,255,255,0.45)"
                            : "rgba(255,255,255,0.10)",
                      boxShadow: isActive
                        ? `0 0 8px ${isLost ? "rgba(255,80,80,0.50)" : "rgba(255,159,10,0.50)"}`
                        : "none",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: isActive ? 700 : 500,
                      color: isActive
                        ? isLost
                          ? "#ff6b6b"
                          : "rgba(255,159,10,0.95)"
                        : isPast
                          ? "rgba(255,255,255,0.40)"
                          : "rgba(255,255,255,0.18)",
                      textAlign: "center",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STAGES.length - 1 && (
                  <div
                    style={{
                      width: 12,
                      height: 1,
                      background:
                        i < stageIdx ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)",
                      flexShrink: 0,
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Value & assignment */}
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <p
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase",
                letterSpacing: ".06em",
                marginBottom: 4,
              }}
            >
              Estimated value
            </p>
            <p
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "rgba(255,255,255,0.95)",
                letterSpacing: "-0.4px",
              }}
            >
              €{lead.estimatedValue.toLocaleString("en-US")}
            </p>
          </div>
          <div>
            <p
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase",
                letterSpacing: ".06em",
                marginBottom: 6,
              }}
            >
              Asignat
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 100,
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.80)",
                }}
              >
                {lead.assignedTo
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.80)" }}>
                {lead.assignedTo}
              </p>
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            paddingTop: 10,
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
            Ultima activitate{" "}
            <span style={{ color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>
              {lead.lastActivity} ago
            </span>
          </span>
        </div>
      </Card>

      {/* Contact */}
      <Card>
        <SectionLabel>Contact</SectionLabel>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 0",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
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
            <IconMail />
          </div>
          <div>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", marginBottom: 1 }}>Email</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
              {lead.email}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
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
            <IconPhone />
          </div>
          <div>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", marginBottom: 1 }}>
              Telefon
            </p>
            <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
              {lead.phone}
            </p>
          </div>
        </div>
      </Card>

      {/* Notes */}
      {lead.notes && (
        <Card>
          <SectionLabel>Notes</SectionLabel>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.55 }}>
            {lead.notes}
          </p>
        </Card>
      )}

      {/* Activity */}
      {lead.activities.length > 0 && (
        <Card>
          <SectionLabel>Recent activity</SectionLabel>
          {lead.activities.map((act: LeadActivity, i) => {
            const aStyle = activityIcon(act.type)
            return (
              <div
                key={act.id}
                style={{
                  display: "flex",
                  gap: 10,
                  paddingBottom: i < lead.activities.length - 1 ? 12 : 0,
                  borderBottom:
                    i < lead.activities.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none",
                  marginBottom: i < lead.activities.length - 1 ? 12 : 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 100,
                      background: aStyle.bg,
                      border: "1px solid rgba(255,255,255,0.10)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: aStyle.color,
                    }}
                  >
                    {activityIconSvg(act.type)}
                  </div>
                  {i < lead.activities.length - 1 && (
                    <div
                      style={{
                        width: 1,
                        flex: 1,
                        background: "rgba(255,255,255,0.07)",
                        marginTop: 4,
                        minHeight: 16,
                      }}
                    />
                  )}
                </div>
                <div style={{ paddingTop: 4 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.82)" }}>
                    {act.text}
                  </p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", marginTop: 2 }}>
                    {act.actor} · {fmtTs(act.timestamp)}
                  </p>
                </div>
              </div>
            )
          })}
        </Card>
      )}

      {/* Actions 2×2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <a
          href={`tel:${lead.phone}`}
          style={{
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
          href={`mailto:${lead.email}`}
          style={{
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
        <Link
          href={`/crm/quotes/new?leadId=${lead.id}`}
          style={{
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
          <IconFile />
          <span style={{ fontSize: 11, fontWeight: 600 }}>Create quote</span>
        </Link>
        {!isTerminal && (
          <button
            style={{
              padding: "11px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.92)",
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 5,
              cursor: "pointer",
              color: "#000",
            }}
          >
            <IconArrow />
            <span style={{ fontSize: 11, fontWeight: 700 }}>Advance stage</span>
          </button>
        )}
      </div>
    </div>
  )
}
