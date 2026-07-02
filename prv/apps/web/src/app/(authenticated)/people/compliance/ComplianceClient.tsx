"use client"

import { useState } from "react"
import {
  useComplianceDocuments,
  useAddComplianceDoc,
  useUpdateComplianceDoc,
  usePeople,
  type ComplianceDoc,
} from "@/lib/api-hooks"

const TYPES = [
  "passport",
  "visa",
  "id_card",
  "driving_license",
  "work_permit",
  "certification",
  "medical",
  "other",
] as const
const TYPE_LABEL: Record<string, string> = {
  passport: "Passport",
  visa: "Visa",
  id_card: "ID card",
  driving_license: "Driving licence",
  work_permit: "Work permit",
  certification: "Certification",
  medical: "Medical",
  other: "Other",
}

const R = 44
const CIRC = 2 * Math.PI * R

function initials(name: string | null): string {
  if (!name) return "?"
  const p = name.trim().split(/\s+/)
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "?"
}

function Badge({ d }: { d: ComplianceDoc }) {
  if (d.status === "rejected") return <Chip tone="bad">Rejected</Chip>
  if (d.band === "expired") return <Chip tone="bad">Expired</Chip>
  if (d.band === "expiring") return <Chip tone="warn">{d.expiresInDays}d left</Chip>
  if (d.status === "pending") return <Chip tone="pend">Pending</Chip>
  return <Chip tone="ok">Compliant</Chip>
}
function Chip({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "bad" | "pend"
  children: React.ReactNode
}) {
  const map = {
    ok: ["rgba(48,209,88,0.9)", "rgba(48,209,88,0.12)", "rgba(48,209,88,0.26)"],
    warn: ["rgba(255,159,10,0.95)", "rgba(255,159,10,0.14)", "rgba(255,159,10,0.28)"],
    bad: ["rgba(255,69,58,0.9)", "rgba(255,69,58,0.14)", "rgba(255,69,58,0.3)"],
    pend: ["var(--prv-text-2)", "transparent", "var(--prv-border)"],
  } as const
  const [c, b, br] = map[tone]
  return (
    <span
      style={{
        fontSize: 9.5,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        borderRadius: 100,
        padding: "3px 9px",
        color: c,
        background: b,
        border: `1px solid ${br}`,
      }}
    >
      {children}
    </span>
  )
}

export function ComplianceClient() {
  const { data, isLoading } = useComplianceDocuments()
  const { data: peopleData } = usePeople()
  const add = useAddComplianceDoc()
  const update = useUpdateComplianceDoc()

  const docs = data?.documents ?? []
  const meta = data?.meta
  const people = peopleData?.members ?? []

  const [showForm, setShowForm] = useState(false)
  const [userId, setUserId] = useState("")
  const [docType, setDocType] = useState<(typeof TYPES)[number]>("passport")
  const [title, setTitle] = useState("")
  const [reference, setReference] = useState("")
  const [expiry, setExpiry] = useState("")

  const pct = meta?.compliancePct ?? 100
  const ringColor =
    pct >= 90 ? "rgba(48,209,88,0.9)" : pct >= 70 ? "rgba(255,159,10,0.95)" : "rgba(255,69,58,0.9)"
  const offset = CIRC * (1 - Math.max(0, Math.min(100, pct)) / 100)

  function submit() {
    if (!userId || !title.trim()) return
    add.mutate(
      {
        userId,
        docType,
        title: title.trim(),
        reference: reference.trim() || null,
        expiryDate: /^\d{4}-\d{2}-\d{2}$/.test(expiry) ? expiry : null,
      },
      {
        onSuccess: () => {
          setTitle("")
          setReference("")
          setExpiry("")
          setShowForm(false)
        },
      }
    )
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "8px 4px 60px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--prv-text-3)",
            }}
          >
            People · HR
          </div>
          <h1
            style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-0.02em", margin: "3px 0 0" }}
          >
            Compliance
          </h1>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            padding: "9px 16px",
            borderRadius: 100,
            background: showForm ? "var(--prv-g2)" : "rgba(255,255,255,0.92)",
            color: showForm ? "var(--prv-text-1)" : "#000",
            border: showForm ? "1px solid var(--prv-border)" : "none",
            fontSize: 13,
            fontWeight: 640,
            cursor: "pointer",
          }}
        >
          {showForm ? "Cancel" : "＋ Add document"}
        </button>
      </div>

      <div
        style={{
          borderRadius: 22,
          padding: "20px 22px",
          margin: "20px 0",
          display: "flex",
          alignItems: "center",
          gap: 22,
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
        }}
      >
        <div style={{ position: "relative", width: 104, height: 104, flexShrink: 0 }}>
          <svg
            width="104"
            height="104"
            viewBox="0 0 104 104"
            style={{ transform: "rotate(-90deg)" }}
          >
            <circle
              cx="52"
              cy="52"
              r={R}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="9"
            />
            <circle
              cx="52"
              cy="52"
              r={R}
              fill="none"
              stroke={ringColor}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.34,1.56,0.64,1)" }}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              fontSize: 26,
              fontWeight: 720,
              letterSpacing: "-0.02em",
            }}
          >
            {pct}%
          </div>
        </div>
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "10px 18px",
          }}
        >
          <MStat k="Compliant" n={`${meta?.compliant ?? 0} / ${meta?.total ?? 0}`} />
          <MStat k="Pending review" n={meta?.pending ?? 0} />
          <MStat
            k="Expiring ≤30d"
            n={meta?.expiringSoon ?? 0}
            tone={meta?.expiringSoon ? "warn" : undefined}
          />
          <MStat k="Expired" n={meta?.expired ?? 0} tone={meta?.expired ? "bad" : undefined} />
        </div>
      </div>

      {showForm && (
        <div
          style={{
            borderRadius: 20,
            padding: 16,
            marginBottom: 22,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <Field label="Employee">
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              style={{ ...inp, minWidth: 150 }}
            >
              <option value="">Select…</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type">
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as (typeof TYPES)[number])}
              style={inp}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Passport"
              style={{ ...inp, minWidth: 130 }}
            />
          </Field>
          <Field label="Reference">
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="optional"
              style={{ ...inp, width: 110 }}
            />
          </Field>
          <Field label="Expiry">
            <input
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              placeholder="YYYY-MM-DD"
              style={{ ...inp, width: 122 }}
            />
          </Field>
          <button
            onClick={submit}
            disabled={add.isPending}
            style={{
              padding: "9px 18px",
              borderRadius: 100,
              background: "rgba(255,255,255,0.92)",
              color: "#000",
              border: "none",
              fontSize: 13,
              fontWeight: 640,
              cursor: "pointer",
              opacity: add.isPending ? 0.5 : 1,
            }}
          >
            Add
          </button>
        </div>
      )}

      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--prv-text-3)",
          margin: "0 4px 12px",
        }}
      >
        Documents · worst first
      </div>
      <div
        style={{
          borderRadius: 22,
          overflow: "hidden",
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
        }}
      >
        {isLoading ? (
          <p style={{ padding: "40px 20px", textAlign: "center", color: "var(--prv-text-4)" }}>
            Loading documents…
          </p>
        ) : docs.length === 0 ? (
          <p
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--prv-text-4)",
              fontSize: 14,
            }}
          >
            No documents tracked yet. Use “Add document” to start.
          </p>
        ) : (
          docs.map((d) => (
            <Row key={d.id} d={d} onAction={(id, patch) => update.mutate({ id, patch })} />
          ))
        )}
      </div>
    </div>
  )
}

function MStat({ k, n, tone }: { k: string; n: string | number; tone?: "warn" | "bad" }) {
  const color =
    tone === "bad"
      ? "rgba(255,69,58,0.9)"
      : tone === "warn"
        ? "rgba(255,159,10,0.95)"
        : "var(--prv-text-1)"
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--prv-text-3)",
        }}
      >
        {k}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 3, color }}>{n}</div>
    </div>
  )
}

function Row({
  d,
  onAction,
}: {
  d: ComplianceDoc
  onAction: (id: string, patch: Record<string, unknown>) => void
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 13,
        padding: "14px 16px",
        borderBottom: "1px solid var(--prv-border-subtle)",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: "var(--prv-g2)",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {initials(d.userName)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 640, letterSpacing: "-0.01em" }}>
          {d.userName ?? "—"} · {d.title}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: "var(--prv-text-3)",
            marginTop: 3,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "var(--prv-text-4)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 5,
              padding: "2px 6px",
            }}
          >
            {TYPE_LABEL[d.docType]}
          </span>
          {d.reference && <span>No. {d.reference}</span>}
        </div>
        {d.band === "expired" && (
          <div style={{ fontSize: 11, color: "rgba(255,69,58,0.9)", marginTop: 5 }}>
            Expired {Math.abs(d.expiresInDays ?? 0)} days ago
          </div>
        )}
        {d.band === "expiring" && (
          <div style={{ fontSize: 11, color: "rgba(255,159,10,0.95)", marginTop: 5 }}>
            Expires in {d.expiresInDays} days
          </div>
        )}
        {d.status === "pending" && d.band !== "expired" && d.band !== "expiring" && (
          <div style={{ fontSize: 11, color: "var(--prv-text-3)", marginTop: 5 }}>
            Awaiting HR verification
          </div>
        )}
      </div>
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 8,
        }}
      >
        <Badge d={d} />
        <div style={{ display: "flex", gap: 6 }}>
          {d.status === "pending" && (
            <Act label="Verify" onClick={() => onAction(d.id, { action: "verify" })} />
          )}
          {(d.band === "expired" || d.band === "expiring") && (
            <Act label="Renew" onClick={() => onAction(d.id, { action: "renew" })} />
          )}
        </div>
      </div>
    </div>
  )
}
function Act({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "var(--prv-text-2)",
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border)",
        borderRadius: 100,
        padding: "4px 11px",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  )
}

const inp: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  background: "var(--prv-g1)",
  border: "1px solid var(--prv-border)",
  color: "var(--prv-text-1)",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--prv-text-3)",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}
