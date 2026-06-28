"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"

// ── Types ─────────────────────────────────────────────────────────────────────

interface POLineItem {
  id?: string
  name: string
  ref?: string | null
  qty: number
  price: number
}

interface POSummaryForGRN {
  id: string
  ref: string
  supplier: string
  supplierId?: string | null
  status: string
  items: POLineItem[]
}

type ItemCondition = "good" | "damaged" | "rejected"

interface LineState {
  received: string
  condition: ItemCondition
}

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

function IconCheck() {
  return (
    <svg
      width="18"
      height="18"
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

function Skeleton({ w, h, radius = 6 }: { w: number | string; h: number; radius?: number }) {
  return (
    <div
      style={{ width: w, height: h, borderRadius: radius, background: "rgba(255,255,255,0.07)" }}
    />
  )
}

// ── 3-way match helper ────────────────────────────────────────────────────────

function getMatchStatus(
  items: POLineItem[],
  lines: LineState[]
): "matched" | "partial" | "discrepancy" {
  if (lines.length === 0) return "partial"
  const allFullyGood = items.every((item, i) => {
    const l = lines[i]
    if (!l) return false
    const recv = parseFloat(l.received) || 0
    return recv === item.qty && l.condition === "good"
  })
  if (allFullyGood) return "matched"
  const hasDamaged = lines.some((l) => l.condition === "damaged" || l.condition === "rejected")
  if (hasDamaged) return "discrepancy"
  const anyReceived = lines.some((l) => parseFloat(l.received) > 0)
  return anyReceived ? "partial" : "partial"
}

// ── GlassCard ────────────────────────────────────────────────────────────────

function GlassCard({ children, mb = 14 }: { children: React.ReactNode; mb?: number }) {
  return (
    <div
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        borderRadius: 18,
        position: "relative",
        overflow: "hidden",
        marginBottom: mb,
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
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "var(--prv-text-3)",
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        margin: "0 2px 10px",
      }}
    >
      {children}
    </p>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function GRNClient({ poId }: { poId: string }) {
  const { data: poData, isError: error } = useQuery({
    queryKey: ["grn-po", poId],
    queryFn: () =>
      fetch(`/api/procurement/${poId}`).then((r) => {
        if (!r.ok) throw new Error("Failed to load purchase order")
        return r.json() as Promise<{ order: POSummaryForGRN }>
      }),
    enabled: !!poId,
  })
  const po = poData?.order ?? null
  const [lines, setLines] = useState<LineState[]>([])
  const [linesSeeded, setLinesSeeded] = useState(false)
  if (po && !linesSeeded) {
    setLinesSeeded(true)
    setLines(po.items.map(() => ({ received: "", condition: "good" as ItemCondition })))
  }
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<{ grnId: string } | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function setLine(i: number, patch: Partial<LineState>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  async function handleConfirm() {
    if (!po) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch(`/api/procurement/${poId}/grn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: notes || null,
          items: po.items.map((item, i) => ({
            lineItemId: item.id,
            itemName: item.name,
            orderedQty: item.qty,
            receivedQty: parseFloat(lines[i]?.received ?? "0") || 0,
            condition: lines[i]?.condition ?? "good",
          })),
        }),
      })
      if (!res.ok) throw new Error()
      const data = (await res.json()) as { grnId: string }
      setSuccess({ grnId: data.grnId })
    } catch {
      setSubmitError("Could not submit GRN. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (error) {
    return (
      <div style={{ padding: "80px 16px", textAlign: "center" }}>
        <p style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Purchase order not found.</p>
        <Link
          href="/procurement"
          style={{ fontSize: 14, color: "var(--prv-text-2)", marginTop: 12, display: "block" }}
        >
          ← Back to Procurement
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div
        style={{
          padding: "80px 16px",
          textAlign: "center",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "rgba(255,255,255,.10)",
            border: "1px solid rgba(255,255,255,.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            color: "rgba(255,255,255,.90)",
          }}
        >
          <IconCheck />
        </div>
        <h2
          style={{ fontSize: 22, fontWeight: 700, color: "var(--prv-text-1)", margin: "0 0 8px" }}
        >
          GRN Confirmed
        </h2>
        <p style={{ fontSize: 14, color: "var(--prv-text-3)", margin: "0 0 32px" }}>
          Goods receipt {success.grnId} has been recorded.
        </p>
        <Link
          href={`/procurement/${poId}`}
          style={{
            display: "inline-block",
            padding: "12px 28px",
            borderRadius: 100,
            background: "rgba(255,255,255,.95)",
            color: "#000",
            fontSize: 14,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Back to Purchase Order
        </Link>
      </div>
    )
  }

  if (!po) {
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
            alignItems: "center",
            gap: 6,
            marginBottom: 24,
            color: "var(--prv-text-2)",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          <IconChevronLeft />
          Procurement
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 18,
              height: 100,
            }}
          />
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 18,
              height: 300,
            }}
          />
        </div>
      </div>
    )
  }

  const matchStatus = getMatchStatus(po.items, lines)
  const confirmedCount = lines.filter((l) => parseFloat(l.received) > 0).length

  const matchConfig = {
    matched: {
      label: "Matched",
      color: "rgba(255,255,255,.90)",
      bg: "rgba(255,255,255,.10)",
      border: "rgba(255,255,255,.20)",
    },
    partial: {
      label: "Partial",
      color: "rgba(255,255,255,.55)",
      bg: "rgba(255,255,255,.05)",
      border: "rgba(255,255,255,.10)",
    },
    discrepancy: {
      label: "Discrepancy",
      color: "rgba(255,69,58,.90)",
      bg: "rgba(255,69,58,.08)",
      border: "rgba(255,69,58,.20)",
    },
  }[matchStatus]

  const inp: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8,
    padding: "8px 10px",
    color: "var(--prv-text-1)",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  }

  return (
    <div
      style={{
        padding: "32px 16px 140px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Back */}
      <Link
        href={`/procurement/${poId}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "var(--prv-text-2)",
          fontSize: 14,
          fontWeight: 500,
          textDecoration: "none",
          marginBottom: 20,
        }}
      >
        <IconChevronLeft />
        {po.ref}
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1
          style={{ fontSize: 24, fontWeight: 700, color: "var(--prv-text-1)", margin: "0 0 4px" }}
        >
          Goods Receipt
        </h1>
        <p style={{ fontSize: 14, color: "var(--prv-text-3)", margin: 0 }}>
          {po.ref} · {po.supplier}
        </p>
      </div>

      {/* 3-Way Match + tally */}
      <GlassCard mb={14}>
        <div
          style={{
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p style={{ fontSize: 12, color: "var(--prv-text-3)", margin: "0 0 2px" }}>
              3-Way Match
            </p>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 8,
                background: matchConfig.bg,
                color: matchConfig.color,
                border: `1px solid ${matchConfig.border}`,
              }}
            >
              {matchConfig.label}
            </span>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 12, color: "var(--prv-text-3)", margin: "0 0 2px" }}>Confirmed</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: "var(--prv-text-1)", margin: 0 }}>
              {confirmedCount}{" "}
              <span style={{ fontSize: 13, color: "var(--prv-text-3)", fontWeight: 500 }}>
                of {po.items.length}
              </span>
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Line items */}
      <SectionLabel>Items ({po.items.length})</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
        {po.items.map((item, i) => {
          const line = lines[i] ?? { received: "", condition: "good" as ItemCondition }
          return (
            <GlassCard key={i} mb={0}>
              <div style={{ padding: "14px 16px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--prv-text-1)",
                        margin: 0,
                      }}
                    >
                      {item.name}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--prv-text-3)", margin: "2px 0 0" }}>
                      Ordered: {item.qty} {item.ref ? `· ${item.ref}` : ""}
                    </p>
                  </div>
                </div>

                {/* Received qty */}
                <div style={{ marginBottom: 10 }}>
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--prv-text-3)",
                      fontWeight: 600,
                      margin: "0 0 5px",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Received Qty
                  </p>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder={String(item.qty)}
                    value={line.received}
                    onChange={(e) => setLine(i, { received: e.target.value })}
                    style={inp}
                  />
                </div>

                {/* Condition */}
                <div>
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--prv-text-3)",
                      fontWeight: 600,
                      margin: "0 0 5px",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Condition
                  </p>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["good", "damaged", "rejected"] as const).map((c) => {
                      const active = line.condition === c
                      const colors: Record<
                        ItemCondition,
                        { color: string; bg: string; border: string }
                      > = {
                        good: {
                          color: "rgba(255,255,255,.90)",
                          bg: "rgba(255,255,255,.10)",
                          border: "rgba(255,255,255,.20)",
                        },
                        damaged: {
                          color: "rgba(255,159,10,.90)",
                          bg: "rgba(255,159,10,.10)",
                          border: "rgba(255,159,10,.20)",
                        },
                        rejected: {
                          color: "rgba(255,69,58,.90)",
                          bg: "rgba(255,69,58,.10)",
                          border: "rgba(255,69,58,.20)",
                        },
                      }
                      const cfg = colors[c]
                      return (
                        <button
                          key={c}
                          onClick={() => setLine(i, { condition: c })}
                          style={{
                            flex: 1,
                            padding: "7px 0",
                            borderRadius: 8,
                            border: active
                              ? `1px solid ${cfg.border}`
                              : "1px solid rgba(255,255,255,.08)",
                            background: active ? cfg.bg : "rgba(255,255,255,.03)",
                            color: active ? cfg.color : "rgba(255,255,255,.35)",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            textTransform: "capitalize",
                          }}
                        >
                          {c}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </GlassCard>
          )
        })}
      </div>

      {/* Notes */}
      <SectionLabel>Notes</SectionLabel>
      <GlassCard mb={20}>
        <textarea
          placeholder="Additional notes about this delivery..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            padding: "14px 16px",
            color: "var(--prv-text-1)",
            fontSize: 14,
            lineHeight: 1.5,
            resize: "vertical",
            minHeight: 80,
            boxSizing: "border-box",
          }}
        />
      </GlassCard>

      {submitError && (
        <p style={{ fontSize: 12, color: "rgba(255,69,58,.9)", marginBottom: 14 }}>{submitError}</p>
      )}

      {/* CTA */}
      <button
        onClick={() => void handleConfirm()}
        disabled={submitting || confirmedCount === 0}
        style={{
          width: "100%",
          padding: "15px 0",
          borderRadius: 100,
          background: "rgba(255,255,255,.95)",
          border: "none",
          color: "#000",
          fontSize: 15,
          fontWeight: 700,
          cursor: submitting || confirmedCount === 0 ? "default" : "pointer",
          opacity: submitting || confirmedCount === 0 ? 0.45 : 1,
        }}
      >
        {submitting ? "Confirming..." : "Confirm Receipt"}
      </button>
    </div>
  )
}
