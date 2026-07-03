"use client"

import { useDocumentRetention, useToggleLegalHold, type RetentionResponse } from "@/lib/api-hooks"

type Row = RetentionResponse["documents"][number]
type Policy = RetentionResponse["policies"][number]

const TYPE_LABEL: Record<string, string> = {
  contract: "Contract",
  report: "Report",
  photo: "Photo",
  certificate: "Certificate",
  invoice_doc: "Invoice doc",
  specification: "Specification",
  permit: "Permit",
  other: "Other",
}
const BAND_LABEL: Record<string, string> = {
  expired: "Expired",
  approaching_14: "Approaching",
  approaching_30: "Approaching",
  active: "Active",
  on_hold: "On hold",
}

function dueText(r: Row): string {
  if (r.band === "on_hold") return "held"
  const d = r.daysUntilExpiry
  if (d < 0) return `${-d} ${-d === 1 ? "day" : "days"} ago`
  if (d === 0) return "today"
  return `in ${d} ${d === 1 ? "day" : "days"}`
}

const card = {
  background: "var(--prv-g1)",
  border: "1px solid var(--prv-border)",
  borderRadius: 22,
  padding: 20,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 24px 64px rgba(0,0,0,0.5)",
  marginBottom: 18,
} as const
const miniBtn = {
  border: "1px solid var(--prv-border)",
  background: "var(--prv-g2)",
  color: "var(--prv-text-1)",
  borderRadius: 9,
  font: "inherit",
  fontSize: 11.5,
  padding: "6px 10px",
  cursor: "pointer",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
} as const

function Tile({ label, value, tone }: { label: string; value: number; tone?: "red" | "amber" }) {
  const color =
    tone === "red"
      ? "rgba(255,120,110,0.92)"
      : tone === "amber"
        ? "rgba(255,190,90,0.92)"
        : undefined
  return (
    <div
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border)",
        borderRadius: 18,
        padding: "14px 16px",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      <div
        style={{
          color: "var(--prv-text-3)",
          fontSize: 10.5,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: 560,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 23,
          fontWeight: 680,
          marginTop: 8,
          color: tone && value > 0 ? color : undefined,
        }}
      >
        {value}
      </div>
    </div>
  )
}

function Row({ r, onToggle }: { r: Row; onToggle: () => void }) {
  const expired = r.band === "expired"
  const approaching = r.band === "approaching_14" || r.band === "approaching_30"
  const hold = r.band === "on_hold"
  const border = expired
    ? "rgba(255,90,80,0.3)"
    : approaching
      ? "rgba(255,176,64,0.32)"
      : "var(--prv-border)"
  const bg = expired
    ? "rgba(255,90,80,0.12)"
    : approaching
      ? "rgba(255,176,64,0.12)"
      : "var(--prv-g1)"
  const dueColor = expired
    ? "rgba(255,120,110,0.92)"
    : approaching
      ? "rgba(255,190,90,0.92)"
      : "var(--prv-text-2)"
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto auto auto",
        gap: 14,
        alignItems: "center",
        padding: "12px 15px",
        border: `1px solid ${border}`,
        background: bg,
        borderRadius: 14,
        marginBottom: 8,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
        opacity: hold ? 0.72 : 1,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 560 }}>{r.title}</div>
        <div style={{ color: "var(--prv-text-3)", fontSize: 12, marginTop: 3 }}>
          {TYPE_LABEL[r.type] ?? r.type} · exp {r.effectiveExpiry}
          {hold && r.legalHoldReason ? ` — ${r.legalHoldReason}` : ""}
        </div>
      </div>
      <div
        style={{
          fontSize: 12,
          textAlign: "right",
          whiteSpace: "nowrap",
          color: dueColor,
          fontWeight: expired || approaching ? 560 : 400,
        }}
      >
        {dueText(r)}
      </div>
      <span
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          border: `1px solid ${r.autoArchiveEligible ? "rgba(255,176,64,0.32)" : "var(--prv-border)"}`,
          borderRadius: 6,
          padding: "3px 8px",
          whiteSpace: "nowrap",
          color: r.autoArchiveEligible ? "rgba(255,190,90,0.92)" : "var(--prv-text-3)",
          background: r.autoArchiveEligible ? "rgba(255,176,64,0.12)" : "transparent",
        }}
      >
        {r.autoArchiveEligible ? "Auto-archive" : (BAND_LABEL[r.band] ?? r.band)}
      </span>
      <button style={miniBtn} onClick={onToggle}>
        {hold ? "Release" : "Legal hold"}
      </button>
    </div>
  )
}

export function RetentionClient() {
  const { data, isLoading } = useDocumentRetention()
  const toggle = useToggleLegalHold()

  const meta = data?.meta
  const rows = data?.documents ?? []
  const policies = data?.policies ?? []
  const attention = rows.filter((r) => r.band !== "active")

  function onToggle(r: Row) {
    if (r.band === "on_hold") {
      toggle.mutate({ id: r.id, hold: false })
    } else {
      const reason = window.prompt("Legal hold reason (optional):", "")
      if (reason !== null) toggle.mutate({ id: r.id, hold: true, reason: reason || null })
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>Retention</h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Documents · expiry, auto-archive eligibility &amp; legal holds
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 12,
          margin: "24px 0",
        }}
      >
        <Tile label="Total" value={meta?.total ?? 0} />
        <Tile label="Expired" value={meta?.expired ?? 0} tone="red" />
        <Tile label="Approaching" value={meta?.approaching ?? 0} tone="amber" />
        <Tile label="On hold" value={meta?.onHold ?? 0} />
        <Tile label="Auto-archive" value={meta?.autoArchiveEligible ?? 0} tone="amber" />
      </div>

      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>Attention needed</h2>
          <span style={{ color: "var(--prv-text-3)", fontSize: 12 }}>most urgent first</span>
        </div>
        {isLoading && <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Loading…</div>}
        {!isLoading && attention.length === 0 && (
          <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>
            Nothing needs attention — all documents are active.
          </div>
        )}
        {attention.map((r) => (
          <Row key={r.id} r={r} onToggle={() => onToggle(r)} />
        ))}
      </div>

      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>Retention policies</h2>
          <span style={{ color: "var(--prv-text-3)", fontSize: 12 }}>per document type</span>
        </div>
        {policies.map((p: Policy, i) => (
          <div
            key={p.documentType}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: 12,
              alignItems: "center",
              padding: "9px 4px",
              borderBottom: i === policies.length - 1 ? "0" : "1px solid var(--prv-border-subtle)",
            }}
          >
            <span style={{ fontSize: 13 }}>
              {TYPE_LABEL[p.documentType] ?? p.documentType}
              {p.isDefault && (
                <span style={{ color: "var(--prv-text-3)", fontSize: 11 }}> · default</span>
              )}
            </span>
            <span
              style={{
                color: "var(--prv-text-2)",
                fontSize: 12.5,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {p.retentionMonths} months
            </span>
            <span
              style={{
                fontSize: 11,
                color: "var(--prv-text-2)",
                border: "1px solid var(--prv-border)",
                borderRadius: 100,
                padding: "4px 10px",
              }}
            >
              {p.autoArchive ? "Auto-archive" : "Manual"}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
