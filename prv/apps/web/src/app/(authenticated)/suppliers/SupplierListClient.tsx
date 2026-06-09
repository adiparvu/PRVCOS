"use client"
import { useRouter } from "next/navigation"

import { useState } from "react"
import Link from "next/link"
import type { SupplierSummary, SupplierStatus } from "@/app/api/suppliers/route"
import { useSuppliers } from "@/lib/api-hooks"

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

function IconWarning() {
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
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number) {
  return "€" + amount.toLocaleString("ro-RO")
}

function fmtK(amount: number) {
  if (amount === 0) return "—"
  return `€${Math.round(amount / 1000)}k`
}

type FilterId = "all" | SupplierStatus

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Toți" },
  { id: "active", label: "Activi" },
  { id: "pending", label: "Pending" },
  { id: "at_risk", label: "Risc" },
  { id: "inactive", label: "Inactivi" },
]

const STATUS_CONFIG: Record<
  SupplierStatus,
  {
    label: string
    color: string
    bg: string
    avatarBg: string
    avatarBorder: string
    avatarColor: string
  }
> = {
  active: {
    label: "Active",
    color: "#5affa0",
    bg: "rgba(90,255,160,0.12)",
    avatarBg: "rgba(255,255,255,0.08)",
    avatarBorder: "rgba(255,255,255,0.12)",
    avatarColor: "rgba(255,255,255,0.70)",
  },
  pending: {
    label: "Pending",
    color: "#ffcc44",
    bg: "rgba(255,204,68,0.13)",
    avatarBg: "rgba(255,204,68,0.10)",
    avatarBorder: "rgba(255,204,68,0.20)",
    avatarColor: "#ffcc44",
  },
  at_risk: {
    label: "Risc",
    color: "#ff6b6b",
    bg: "rgba(255,107,107,0.12)",
    avatarBg: "rgba(255,107,107,0.10)",
    avatarBorder: "rgba(255,107,107,0.22)",
    avatarColor: "#ff6b6b",
  },
  inactive: {
    label: "Inactiv",
    color: "rgba(255,255,255,0.35)",
    bg: "rgba(255,255,255,0.07)",
    avatarBg: "rgba(255,255,255,0.06)",
    avatarBorder: "rgba(255,255,255,0.09)",
    avatarColor: "rgba(255,255,255,0.40)",
  },
}

// ── Stars ─────────────────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number }) {
  const filled = Math.round(rating)
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="9" height="9" viewBox="0 0 12 12">
          <polygon
            points="6 1 7.5 4.5 11 5 8.5 7.5 9 11 6 9 3 11 3.5 7.5 1 5 4.5 4.5"
            fill={i <= filled ? "#ffcc44" : "rgba(255,255,255,0.12)"}
          />
        </svg>
      ))}
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginLeft: 4 }}>
        {rating.toFixed(1)}
      </span>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ w, h, radius = 6 }: { w: number | string; h: number; radius?: number }) {
  return (
    <div
      style={{ width: w, height: h, borderRadius: radius, background: "rgba(255,255,255,0.07)" }}
    />
  )
}

// ── Supplier row ──────────────────────────────────────────────────────────────

function SupplierRow({ supplier }: { supplier: SupplierSummary }) {
  const s = STATUS_CONFIG[supplier.status]
  const isRisk = supplier.status === "at_risk"

  return (
    <Link href={`/suppliers/${supplier.id}`} style={{ textDecoration: "none", display: "block" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          borderBottom: "1px solid var(--prv-border-subtle)",
          position: "relative",
          ...(isRisk
            ? {
                borderLeft: "3px solid transparent",
                borderImage: "linear-gradient(180deg,#ff4444,#ff6b6b) 1",
                paddingLeft: 13,
              }
            : {}),
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 13,
            background: s.avatarBg,
            border: `1px solid ${s.avatarBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
            color: s.avatarColor,
            flexShrink: 0,
          }}
        >
          {supplier.initials}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "rgba(255,255,255,0.90)",
              margin: "0 0 2px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {supplier.name}
          </p>
          <p
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.35)",
              margin: "0 0 1px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {supplier.category}
            {supplier.orders > 0 ? ` · ${supplier.orders} comenzi` : " · Furnizor nou"}
          </p>
          {supplier.rating > 0 && <Stars rating={supplier.rating} />}
          {supplier.status === "pending" && (
            <p style={{ fontSize: 11, color: "#ffcc44", margin: "2px 0 0" }}>
              Onboarding în așteptare
            </p>
          )}
        </div>

        {/* Right */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 5,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 20,
              background: s.bg,
              color: s.color,
              whiteSpace: "nowrap",
            }}
          >
            {s.label}
          </span>
          {supplier.annualSpend > 0 && (
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0 }}>
              {fmtK(supplier.annualSpend)} / an
            </p>
          )}
        </div>

        <div style={{ color: "rgba(255,255,255,0.20)", marginLeft: 2, flexShrink: 0 }}>
          <IconChevronRight />
        </div>
      </div>
    </Link>
  )
}

// ── Spend category bar ────────────────────────────────────────────────────────

function SpendRow({ label, amount, pct }: { label: string; amount: number; pct: number }) {
  return (
    <div>
      <div
        style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}
      >
        <span style={{ color: "rgba(255,255,255,0.65)" }}>{label}</span>
        <span style={{ fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{fmtK(amount)}</span>
      </div>
      <div
        style={{
          height: 4,
          borderRadius: 2,
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 2,
            background: "#5affa0",
            opacity: 0.5 + (pct / 100) * 0.45,
          }}
        />
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function SupplierListClient() {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterId>("all")
  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } = useSuppliers()
  const suppliers: SupplierSummary[] = data?.suppliers ?? []
  const loading = isLoading
  const error: string | null = isError ? "Nu s-au putut încărca furnizorii." : null

  const filtered = filter === "all" ? suppliers : suppliers.filter((s) => s.status === filter)
  const atRiskCount = suppliers.filter((s) => s.status === "at_risk").length
  const activeCount = suppliers.filter((s) => s.status === "active").length
  const totalSpend = suppliers.reduce((sum, s) => sum + s.annualSpend, 0)

  // build spend-by-category from live data
  const spendByCategory = suppliers
    .filter((s) => s.annualSpend > 0)
    .sort((a, b) => b.annualSpend - a.annualSpend)
    .slice(0, 5)

  const maxSpend = spendByCategory[0]?.annualSpend ?? 1

  return (
    <div style={{ padding: "56px 16px 112px", maxWidth: 640, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            href="/procurement"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              color: "rgba(255,255,255,0.45)",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <IconChevronLeft />
            Achiziții
          </Link>
        </div>
        <button
          onClick={() => router.push('/suppliers/new')}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.65)",
            cursor: "pointer",
          }}
        >
          <IconPlus />
        </button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "rgba(255,255,255,0.35)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 4,
          }}
        >
          Achiziții
        </p>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 600,
            color: "rgba(255,255,255,0.90)",
            letterSpacing: "-0.5px",
            margin: 0,
          }}
        >
          Furnizori
        </h1>
      </div>

      {/* KPI strip */}
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}
      >
        {[
          { v: loading ? "—" : String(suppliers.length), l: "Total", c: "rgba(255,255,255,0.90)" },
          { v: loading ? "—" : String(activeCount), l: "Activi", c: "#5affa0" },
          {
            v: loading ? "—" : String(atRiskCount),
            l: "Risc",
            c: atRiskCount > 0 ? "#ff6b6b" : "#5affa0",
          },
          { v: loading ? "—" : fmtK(totalSpend), l: "Anual", c: "#5affa0" },
        ].map(({ v, l, c }) => (
          <div
            key={l}
            style={{
              padding: "10px 0",
              borderRadius: 14,
              textAlign: "center",
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
            }}
          >
            <p style={{ fontSize: 17, fontWeight: 700, color: c, margin: 0 }}>{v}</p>
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                margin: "3px 0 0",
              }}
            >
              {l}
            </p>
          </div>
        ))}
      </div>

      {/* At Risk alert */}
      {!loading && atRiskCount > 0 && (filter === "all" || filter === "at_risk") && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            borderRadius: 14,
            background: "rgba(255,107,107,0.07)",
            border: "1px solid rgba(255,107,107,0.18)",
            marginBottom: 14,
            color: "#ff6b6b",
          }}
        >
          <IconWarning />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#ff6b6b", margin: "0 0 2px" }}>
              {atRiskCount} furnizor{atRiskCount > 1 ? "i necesită" : " necesită"} atenție
            </p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: 0 }}>
              Contract expirat · livrări întârziate
            </p>
          </div>
          <IconChevronRight />
        </div>
      )}

      {/* Filter chips */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          marginBottom: 16,
          paddingBottom: 2,
          scrollbarWidth: "none",
        }}
      >
        {FILTERS.map((f) => {
          const active = filter === f.id
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                flexShrink: 0,
                padding: "6px 14px",
                borderRadius: 100,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                background: active ? "rgba(255,255,255,0.14)" : "var(--prv-g1)",
                border: active
                  ? "1px solid rgba(255,255,255,0.28)"
                  : "1px solid var(--prv-border-subtle)",
                color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)",
                transition: "all 0.15s ease",
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* List */}
      <div
        style={{
          borderRadius: 18,
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: 16 }}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 0",
                  borderBottom: i < 4 ? "1px solid var(--prv-border-subtle)" : "none",
                }}
              >
                <Skeleton w={44} h={44} radius={13} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                  <Skeleton w="60%" h={13} />
                  <Skeleton w="40%" h={11} />
                  <Skeleton w={72} h={10} />
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    alignItems: "flex-end",
                  }}
                >
                  <Skeleton w={50} h={18} radius={10} />
                  <Skeleton w={40} h={11} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div
            style={{
              padding: "40px 16px",
              textAlign: "center",
              color: "rgba(255,255,255,0.35)",
              fontSize: 14,
            }}
          >
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              padding: "40px 16px",
              textAlign: "center",
              color: "rgba(255,255,255,0.35)",
              fontSize: 14,
            }}
          >
            Niciun furnizor găsit.
          </div>
        ) : (
          filtered.map((s, idx) => (
            <div key={s.id} style={idx === filtered.length - 1 ? { borderBottom: "none" } : {}}>
              <SupplierRow supplier={s} />
            </div>
          ))
        )}
      </div>

      {/* Spend by Category */}
      {!loading && filter === "all" && spendByCategory.length > 0 && (
        <>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,255,255,0.35)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              margin: "20px 4px 8px",
            }}
          >
            Cheltuieli pe categorii
          </p>
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 18,
              padding: "14px 16px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {spendByCategory.map((s) => (
                <SpendRow
                  key={s.id}
                  label={s.category}
                  amount={s.annualSpend}
                  pct={Math.round((s.annualSpend / maxSpend) * 100)}
                />
              ))}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px solid var(--prv-border-subtle)",
              }}
            >
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Total anual</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#5affa0" }}>
                {fmtK(totalSpend)}
              </span>
            </div>
          </div>
        </>
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
  )
}
