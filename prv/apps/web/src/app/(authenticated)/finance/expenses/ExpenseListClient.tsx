"use client"

import { useState } from "react"
import Link from "next/link"
import type { Expense, ExpenseCategory, ExpenseStatus } from "@/app/api/finance/expenses/route"
import { useExpenses } from "@/lib/api-hooks"

// ── Icons ─────────────────────────────────────────────────────────────────────

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

function fmt(n: number) {
  return "€" + n.toLocaleString("ro-RO")
}

type FilterId = "all" | ExpenseStatus

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Toate" },
  { id: "pending", label: "În așteptare" },
  { id: "draft", label: "Ciornă" },
  { id: "approved", label: "Aprobate" },
  { id: "rejected", label: "Respinse" },
]

const STATUS_CONFIG: Record<
  ExpenseStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  draft: {
    label: "Ciornă",
    color: "rgba(255,255,255,0.45)",
    bg: "rgba(255,255,255,0.07)",
    border: "rgba(255,255,255,0.14)",
  },
  pending: {
    label: "În așteptare",
    color: "#ffcc44",
    bg: "rgba(255,200,50,0.12)",
    border: "rgba(255,200,50,0.24)",
  },
  approved: {
    label: "Aprobată",
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
}

const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  materiale: "Materiale",
  personal: "Personal",
  logistica: "Logistică",
  utilitati: "Utilități",
  marketing: "Marketing",
  altele: "Altele",
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div
          style={{ width: 140, height: 28, background: "var(--prv-g2)", borderRadius: 8 }}
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
              width: 88,
              height: 30,
              background: "var(--prv-g1)",
              borderRadius: 100,
              flexShrink: 0,
            }}
            className="animate-pulse"
          />
        ))}
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            height: 84,
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

// ── Expense card ──────────────────────────────────────────────────────────────

function ExpenseCard({ expense }: { expense: Expense }) {
  const cfg = STATUS_CONFIG[expense.status]
  const isPending = expense.status === "pending"

  return (
    <Link
      href={`/finance/expenses/${expense.id}`}
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
      {isPending && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            background: "linear-gradient(180deg,#ffaa00,#ffcc44)",
            borderRadius: "16px 0 0 16px",
          }}
        />
      )}
      <div
        style={{
          paddingLeft: isPending ? 4 : 0,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div style={{ flex: 1, marginRight: 12 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,255,255,0.40)",
              letterSpacing: "0.03em",
              marginBottom: 2,
              textTransform: "uppercase",
            }}
          >
            {CATEGORY_LABEL[expense.category]}
          </p>
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "rgba(255,255,255,0.92)",
              lineHeight: 1.3,
            }}
          >
            {expense.title}
          </p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
            {expense.vendorName}
          </p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p
            style={{
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: "-0.3px",
              color: expense.status === "approved" ? "#5affa0" : "rgba(255,255,255,0.92)",
            }}
          >
            {expense.amountLabel}
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
          paddingLeft: isPending ? 4 : 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: isPending ? "#ffcc44" : "rgba(255,255,255,0.30)",
            display: "flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          {isPending && <IconClock />}
          {expense.date}
          {expense.vatAmount > 0 && (
            <span style={{ color: "rgba(255,255,255,0.25)", marginLeft: 6 }}>
              TVA {expense.vatLabel}
            </span>
          )}
        </span>
        <span style={{ color: "rgba(255,255,255,0.20)" }}>
          <IconChevronRight />
        </span>
      </div>
    </Link>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ExpenseListClient() {
  const [filter, setFilter] = useState<FilterId>("all")
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useExpenses()
  const expenses = data?.expenses ?? []

  if (isLoading) return <Skeleton />

  const visible = filter === "all" ? expenses : expenses.filter((e) => e.status === filter)
  const pending = expenses.filter((e) => e.status === "pending")
  const approved = expenses.filter((e) => e.status === "approved")
  const totalPending = pending.reduce((s, e) => s + e.amount, 0)
  const totalApproved = approved.reduce((s, e) => s + e.amount, 0)

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
            Cheltuieli
          </h1>
        </div>
        <Link
          href="/finance/expenses/new"
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
          <p style={{ fontSize: 15, fontWeight: 700, color: "#ffcc44", letterSpacing: "-0.3px" }}>
            {fmt(totalPending)}
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
            Așteptare
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
            {fmt(totalApproved)}
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
            Aprobate
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
            {pending.length}
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
            De aprobat
          </p>
        </div>
      </div>

      {/* Filter chips */}
      <div
        style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}
      >
        {FILTERS.map(({ id, label }) => {
          const count = id === "all" ? null : expenses.filter((e) => e.status === id).length
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
                    color: id === "pending" ? "#ffcc44" : "rgba(255,255,255,0.65)",
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
            Nicio cheltuială găsită
          </div>
        ) : (
          visible.map((e) => <ExpenseCard key={e.id} expense={e} />)
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
