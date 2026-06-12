"use client"

import { useState } from "react"
import Link from "next/link"
import type { QuoteSummary, QuoteStatus } from "@/app/api/crm/quotes/route"
import { useQuotes } from "@/lib/api-hooks"

// ── Icons (SF Symbol style) ───────────────────────────────────────────────────

function IconPlus() {
  return (
    <svg
      width="14"
      height="14"
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
  return "€" + amount.toLocaleString("en-US")
}

type FilterId = "all" | QuoteStatus

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Toate" },
  { id: "sent", label: "Trimise" },
  { id: "draft", label: "Draft" },
  { id: "accepted", label: "Acceptate" },
  { id: "rejected", label: "Respinse" },
  { id: "expired", label: "Expirate" },
]

const STATUS_CONFIG: Record<
  QuoteStatus,
  { label: string; color: string; bg: string; border: string }
> = {
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

// ── Loading skeleton ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div
          style={{ width: 120, height: 28, background: "var(--prv-g2)", borderRadius: 8 }}
          className="animate-pulse"
        />
        <div
          style={{ width: 32, height: 32, background: "var(--prv-g2)", borderRadius: 100 }}
          className="animate-pulse"
        />
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: 62,
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 16,
            }}
            className="animate-pulse"
          />
        ))}
      </div>
      <div className="flex gap-2 mb-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: 72,
              height: 30,
              background: "var(--prv-g1)",
              borderRadius: 100,
              flexShrink: 0,
            }}
            className="animate-pulse"
          />
        ))}
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            height: 88,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            borderRadius: 16,
            marginBottom: 8,
          }}
          className="animate-pulse"
        />
      ))}
    </div>
  )
}

// ── Quote card ────────────────────────────────────────────────────────────────

function QuoteCard({ quote }: { quote: QuoteSummary }) {
  const cfg = STATUS_CONFIG[quote.status]
  const isSent = quote.status === "sent"
  const isUrgent = isSent && quote.daysUntilExpiry !== null && quote.daysUntilExpiry <= 5

  return (
    <Link
      href={`/crm/quotes/${quote.id}`}
      style={{
        display: "block",
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        borderRadius: 16,
        padding: "12px 14px",
        position: "relative",
        overflow: "hidden",
        textDecoration: "none",
        marginBottom: 8,
      }}
    >
      {isSent && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            background: isUrgent
              ? "linear-gradient(180deg,#ffaa00,#ffcc44)"
              : "linear-gradient(180deg,#5090ff,#7eb8ff)",
            borderRadius: "16px 0 0 16px",
          }}
        />
      )}
      <div
        style={{
          paddingLeft: isSent ? 4 : 0,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,255,255,0.40)",
              letterSpacing: "0.03em",
              marginBottom: 2,
            }}
          >
            {quote.ref} · {quote.version}
          </p>
          <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.92)" }}>
            {quote.clientName}
          </p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
            {quote.projectName}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p
            style={{
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: "-0.3px",
              color: quote.status === "accepted" ? "#5affa0" : "rgba(255,255,255,0.92)",
            }}
          >
            {fmt(quote.amount)}
          </p>
          <div style={{ marginTop: 5 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
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
      <div
        style={{
          paddingLeft: isSent ? 4 : 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {quote.status === "sent" && quote.daysUntilExpiry !== null ? (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: isUrgent ? "#ffcc44" : "rgba(255,255,255,0.35)",
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <IconClock />
              {isUrgent
                ? `Expires in ${quote.daysUntilExpiry} days`
                : `Valid for ${quote.daysUntilExpiry} days`}
            </span>
          ) : quote.status === "draft" ? (
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.30)" }}>Netrimitere</span>
          ) : quote.status === "accepted" ? (
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.30)" }}>Accepted</span>
          ) : (
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.30)" }}>
              {quote.status === "rejected" ? "Rejected" : "Expired"}
            </span>
          )}
        </div>
        <span style={{ color: "rgba(255,255,255,0.20)" }}>
          <IconChevronRight />
        </span>
      </div>
    </Link>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function QuoteListClient() {
  const [filter, setFilter] = useState<FilterId>("all")
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useQuotes()
  const quotes = data?.quotes ?? []

  if (isLoading) return <Skeleton />

  const visible = filter === "all" ? quotes : quotes.filter((q) => q.status === filter)

  const sent = quotes.filter((q) => q.status === "sent")
  const accepted = quotes.filter((q) => q.status === "accepted")
  const pipeline = sent.reduce((s, q) => s + q.amount, 0)
  const acceptRate =
    quotes.filter((q) => ["accepted", "rejected"].includes(q.status)).length > 0
      ? Math.round(
          (accepted.length /
            quotes.filter((q) => ["accepted", "rejected"].includes(q.status)).length) *
            100
        )
      : 0

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            href="/crm"
            style={{
              display: "flex",
              alignItems: "center",
              color: "rgba(255,255,255,0.40)",
              textDecoration: "none",
              marginRight: 2,
            }}
          >
            <IconChevronLeft />
          </Link>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "-0.5px",
              color: "rgba(255,255,255,0.95)",
            }}
          >
            Oferte
          </h1>
        </div>
        <Link
          href="/crm/quotes/new"
          style={{
            width: 32,
            height: 32,
            background: "rgba(255,255,255,0.92)",
            borderRadius: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#000",
            textDecoration: "none",
          }}
        >
          <IconPlus />
        </Link>
      </div>

      {/* KPI strip */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}
      >
        <div
          style={{
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            borderRadius: 16,
            padding: "10px 10px 8px",
          }}
        >
          <p style={{ fontSize: 15, fontWeight: 700, color: "#7eb8ff", letterSpacing: "-0.3px" }}>
            {fmt(pipeline)}
          </p>
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
            Pipeline
          </p>
        </div>
        <div
          style={{
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            borderRadius: 16,
            padding: "10px 10px 8px",
          }}
        >
          <p style={{ fontSize: 15, fontWeight: 700, color: "#5affa0", letterSpacing: "-0.3px" }}>
            {acceptRate}%
          </p>
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
            Accept. rate
          </p>
        </div>
        <div
          style={{
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            borderRadius: 16,
            padding: "10px 10px 8px",
          }}
        >
          <p
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "rgba(255,255,255,0.95)",
              letterSpacing: "-0.3px",
            }}
          >
            {sent.length}
          </p>
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
            Pending
          </p>
        </div>
      </div>

      {/* Filter chips */}
      <div
        style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}
      >
        {FILTERS.map(({ id, label }) => {
          const count = id === "all" ? null : quotes.filter((q) => q.status === id).length
          return (
            <button
              key={id}
              onClick={() => setFilter(id)}
              style={{
                flexShrink: 0,
                padding: "5px 12px",
                borderRadius: 100,
                fontSize: 11,
                fontWeight: 500,
                border:
                  filter === id
                    ? "1px solid rgba(255,255,255,0.28)"
                    : "1px solid rgba(255,255,255,0.10)",
                background: filter === id ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.07)",
                color: filter === id ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.55)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {label}
              {count !== null && count > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: id === "sent" ? "#7eb8ff" : "rgba(255,255,255,0.65)",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* List */}
      <div>
        {visible.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
              color: "rgba(255,255,255,0.30)",
              fontSize: 14,
            }}
          >
            No quotes found
          </div>
        ) : (
          visible.map((q) => <QuoteCard key={q.id} quote={q} />)
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
              marginTop: 8,
            }}
          >
            {isFetchingNextPage ? "Loading..." : "Load more"}
          </button>
        )}
      </div>
    </div>
  )
}
