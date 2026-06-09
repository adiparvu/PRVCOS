"use client"

import { useState } from "react"
import Link from "next/link"
import type { InvoiceSummary, InvoiceStatus } from "@/app/api/finance/invoices/route"
import { useInvoices } from "@/lib/api-hooks"

// ── Icons (SF Symbol style) ───────────────────────────────────────────────────

function IconPlus() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
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
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
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

type FilterId = "all" | InvoiceStatus

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Toate" },
  { id: "overdue", label: "Restante" },
  { id: "due", label: "Scadente" },
  { id: "partial", label: "Parțial" },
  { id: "paid", label: "Plătite" },
  { id: "draft", label: "Ciornă" },
]

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  overdue: {
    label: "Restantă",
    color: "#ff6b6b",
    bg: "rgba(255,80,80,0.12)",
    border: "rgba(255,80,80,0.22)",
  },
  due: {
    label: "Scadentă",
    color: "#ffcc44",
    bg: "rgba(255,180,0,0.12)",
    border: "rgba(255,180,0,0.22)",
  },
  partial: {
    label: "Parțial",
    color: "#b08fff",
    bg: "rgba(130,100,255,0.14)",
    border: "rgba(130,100,255,0.24)",
  },
  paid: {
    label: "Plătită",
    color: "#5affa0",
    bg: "rgba(80,255,140,0.10)",
    border: "rgba(80,255,140,0.20)",
  },
  draft: {
    label: "Ciornă",
    color: "rgba(255,255,255,0.45)",
    bg: "rgba(255,255,255,0.07)",
    border: "rgba(255,255,255,0.14)",
  },
  void: {
    label: "Anulată",
    color: "rgba(255,255,255,0.30)",
    bg: "rgba(255,255,255,0.04)",
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
      <div className="flex gap-2 mb-4 overflow-hidden">
        {[0, 1, 2, 3, 4].map((i) => (
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
            height: 82,
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

// ── Invoice card ──────────────────────────────────────────────────────────────

function InvoiceCard({ invoice }: { invoice: InvoiceSummary }) {
  const cfg = STATUS_CONFIG[invoice.status]
  const isAlert = invoice.status === "overdue" || invoice.status === "due"
  const leftBorder =
    invoice.status === "overdue"
      ? "linear-gradient(180deg,#ff4444,#ff6b6b)"
      : invoice.status === "due"
        ? "linear-gradient(180deg,#ffaa00,#ffcc44)"
        : null

  return (
    <Link
      href={`/finance/invoices/${invoice.id}`}
      style={{
        display: "block",
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        borderRadius: 16,
        padding: "12px 14px",
        position: "relative",
        overflow: "hidden",
        textDecoration: "none",
      }}
    >
      {leftBorder && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            background: leftBorder,
            borderRadius: "16px 0 0 16px",
          }}
        />
      )}
      <div
        style={{
          paddingLeft: leftBorder ? 4 : 0,
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
            {invoice.ref}
          </p>
          <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.92)" }}>
            {invoice.clientName}
          </p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
            {invoice.projectName}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p
            style={{
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: "-0.3px",
              color: isAlert ? cfg.color : "rgba(255,255,255,0.92)",
            }}
          >
            {fmt(invoice.amount)}
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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingLeft: leftBorder ? 4 : 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
            Scad. {fmtDate(invoice.dueDate)}
          </span>
          {invoice.daysOverdue !== null && invoice.daysOverdue > 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "#ff6b6b",
                background: "rgba(255,80,80,0.12)",
                padding: "2px 6px",
                borderRadius: 4,
              }}
            >
              +{invoice.daysOverdue}z
            </span>
          )}
          {invoice.status === "partial" && (
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.40)" }}>
              Plătit {fmt(invoice.amountPaid)}
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

export function InvoiceListClient() {
  const [filter, setFilter] = useState<FilterId>("all")
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInvoices()
  const invoices = data?.invoices ?? []

  if (isLoading) return <Skeleton />

  const visible = filter === "all" ? invoices : invoices.filter((i) => i.status === filter)

  const overdue = invoices.filter((i) => i.status === "overdue")
  const outstanding = invoices.filter((i) => ["overdue", "due", "partial"].includes(i.status))
  const paid = invoices.filter((i) => i.status === "paid")
  const totalOverdue = overdue.reduce((s, i) => s + i.amount, 0)
  const totalOutstanding = outstanding.reduce((s, i) => s + (i.amount - i.amountPaid), 0)
  const totalPaid = paid.reduce((s, i) => s + i.amountPaid, 0)

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            href="/finance"
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
            Facturi
          </h1>
        </div>
        <Link
          href="/finance/invoices/new"
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
            background: overdue.length > 0 ? "rgba(255,255,255,0.06)" : "var(--prv-g1)",
            border:
              overdue.length > 0
                ? "1px solid rgba(255,80,80,0.25)"
                : "1px solid var(--prv-border-subtle)",
            borderRadius: 16,
            padding: "10px 10px 8px",
          }}
        >
          <p
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: overdue.length > 0 ? "#ff6b6b" : "rgba(255,255,255,0.95)",
              letterSpacing: "-0.3px",
            }}
          >
            {fmt(totalOverdue)}
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
            Restante
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
            {fmt(totalOutstanding)}
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
            Neîncasat
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
            {fmt(totalPaid)}
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
            Colectat
          </p>
        </div>
      </div>

      {/* Filter chips */}
      <div
        style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}
      >
        {FILTERS.map(({ id, label }) => {
          const count = id === "all" ? null : invoices.filter((i) => i.status === id).length
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
                    color: id === "overdue" ? "#ff6b6b" : "rgba(255,255,255,0.65)",
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
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visible.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
              color: "rgba(255,255,255,0.30)",
              fontSize: 14,
            }}
          >
            Nicio factură găsită
          </div>
        ) : (
          visible.map((inv) => <InvoiceCard key={inv.id} invoice={inv} />)
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
            {isFetchingNextPage ? "Se încarcă..." : "Încarcă mai mult"}
          </button>
        )}
      </div>
    </div>
  )
}
