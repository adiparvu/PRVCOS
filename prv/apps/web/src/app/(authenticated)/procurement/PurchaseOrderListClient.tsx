"use client"

import { useState } from "react"
import Link from "next/link"
import { useSheetStack } from "@prv/ui"
import type { POSummary, ProcurementMeta } from "@/app/api/procurement/route"
import { usePurchaseOrders } from "@/lib/api-hooks"

type FilterType = "Toți" | "Pending" | "Aprobat" | "În Transit" | "Draft" | "Respins"

const FILTERS: FilterType[] = ["Toți", "Pending", "Aprobat", "În Transit", "Draft", "Respins"]

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Pending: { label: "Pending", color: "rgba(255,159,10,.95)", bg: "rgba(255,159,10,.13)" },
  Approved: { label: "Aprobat", color: "rgba(48,209,88,.95)", bg: "rgba(48,209,88,.13)" },
  Draft: { label: "Draft", color: "rgba(255,255,255,.55)", bg: "rgba(255,255,255,.08)" },
  Rejected: { label: "Respins", color: "rgba(255,69,58,.95)", bg: "rgba(255,69,58,.12)" },
  "In Transit": { label: "În Transit", color: "rgba(10,132,255,.9)", bg: "rgba(10,132,255,.12)" },
}

// ── Icons ────────────────────────────────────────────────────────────────────

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

function IconWarning() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,159,10,.9)"
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

function POStatusIcon({ status }: { status: string }) {
  if (status === "Approved")
    return (
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "rgba(48,209,88,.10)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(48,209,88,.85)"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    )
  if (status === "In Transit")
    return (
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "rgba(10,132,255,.10)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(10,132,255,.85)"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <rect x="1" y="3" width="15" height="13" rx="1" />
          <path d="M16 8h4l3 3v5h-7V8z" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      </div>
    )
  if (status === "Pending")
    return (
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "rgba(255,159,10,.10)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,159,10,.9)"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      </div>
    )
  if (status === "Rejected")
    return (
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "rgba(255,69,58,.10)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,69,58,.85)"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>
    )
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: "var(--prv-g1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--prv-text-3)"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    </div>
  )
}

function Skeleton({ w, h, radius = 6 }: { w: number | string; h: number; radius?: number }) {
  return (
    <div
      style={{ width: w, height: h, borderRadius: radius, background: "rgba(255,255,255,0.07)" }}
    />
  )
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("ro-RO", { day: "numeric", month: "short" })
}

// ── Main component ────────────────────────────────────────────────────────────

const FILTER_TO_STATUS: Record<FilterType, string | null> = {
  "Toți": null,
  "Pending": "Pending",
  "Aprobat": "Approved",
  "În Transit": "In Transit",
  "Draft": "Draft",
  "Respins": "Rejected",
}

export function PurchaseOrderListClient() {
  const [filter, setFilter] = useState<FilterType>("Toți")
  const { openSheet } = useSheetStack()
  const status = FILTER_TO_STATUS[filter]
  const { data, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = usePurchaseOrders(status)
  const orders = data?.orders ?? null
  const meta = data?.meta ?? null
  const error = isError

  const handleNewOrder = () => {
    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: "Comandă Nouă",
      render: (onClose) => (
        <div
          style={{ padding: "8px 16px 40px", display: "flex", flexDirection: "column", gap: 10 }}
        >
          <SheetBtn
            color="blue"
            icon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(10,132,255,.9)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            }
            label="Comandă Nouă"
            sub="Creează un nou purchase order"
            onClick={onClose}
          />
          <SheetBtn
            color="white"
            icon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,.7)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            }
            label="Export comenzi"
            sub="CSV sau PDF"
            onClick={onClose}
          />
        </div>
      ),
    })
  }

  const budgetPct = meta ? Math.round((meta.budgetUsed / meta.budget) * 100) : 0
  const budgetAlert = budgetPct >= 90

  return (
    <div
      style={{
        padding: "32px 16px 120px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <p style={{ fontSize: 13, color: "var(--prv-text-3)", marginBottom: 2 }}>Operations</p>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--prv-text-1)",
            }}
          >
            Procurement
          </h1>
        </div>
        <div
          style={{
            padding: "6px 12px",
            borderRadius: 10,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            fontSize: 12,
            fontWeight: 500,
            color: "var(--prv-text-2)",
          }}
        >
          {new Date().toLocaleDateString("ro-RO", { month: "short", year: "numeric" })}
        </div>
      </div>

      {/* KPI strip */}
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}
      >
        {meta
          ? [
              {
                val: `€${Math.round(meta.budgetUsed / 1000)}K`,
                label: "Cheltuit",
                color: undefined,
              },
              {
                val: String(meta.pending),
                label: "Pending",
                color: meta.pending > 0 ? "rgba(255,159,10,.95)" : "var(--prv-text-1)",
              },
              {
                val: String(meta.inTransit),
                label: "În Transit",
                color: meta.inTransit > 0 ? "rgba(10,132,255,.9)" : "var(--prv-text-1)",
              },
              {
                val: `${100 - budgetPct}%`,
                label: "Buget Rămas",
                color: budgetAlert ? "rgba(255,159,10,.95)" : "rgba(48,209,88,.95)",
              },
            ].map((k) => (
              <div
                key={k.label}
                style={{
                  padding: "12px 8px",
                  borderRadius: 14,
                  background: "var(--prv-g1)",
                  border: "1px solid var(--prv-border-subtle)",
                  textAlign: "center",
                }}
              >
                <div
                  style={{ fontSize: 17, fontWeight: 700, color: k.color ?? "var(--prv-text-1)" }}
                >
                  {k.val}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--prv-text-3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginTop: 3,
                  }}
                >
                  {k.label}
                </div>
              </div>
            ))
          : Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  padding: "12px 8px",
                  borderRadius: 14,
                  background: "var(--prv-g1)",
                  border: "1px solid var(--prv-border-subtle)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Skeleton w={40} h={18} />
                <Skeleton w={52} h={10} />
              </div>
            ))}
      </div>

      {/* Budget bar */}
      <div
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 18,
          position: "relative",
          overflow: "hidden",
          marginBottom: 12,
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
        <div style={{ padding: "14px 16px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--prv-text-2)",
              marginBottom: 8,
            }}
          >
            <span>Buget Lunar</span>
            <span style={{ color: "var(--prv-text-1)", fontWeight: 700 }}>
              {meta
                ? `€${meta.budgetUsed.toLocaleString()} / €${meta.budget.toLocaleString()}`
                : "—"}
            </span>
          </div>
          <div
            style={{
              height: 8,
              background: "var(--prv-border)",
              borderRadius: 4,
              overflow: "hidden",
              marginBottom: 6,
            }}
          >
            {meta && (
              <div
                style={{
                  width: `${budgetPct}%`,
                  height: "100%",
                  borderRadius: 4,
                  background: budgetAlert
                    ? "linear-gradient(90deg,rgba(48,209,88,.6),rgba(255,159,10,.7))"
                    : "rgba(48,209,88,.6)",
                  transition: "width .4s ease",
                }}
              />
            )}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "var(--prv-text-3)",
            }}
          >
            <span>€0</span>
            {meta && (
              <span style={{ color: budgetAlert ? "rgba(255,159,10,.95)" : "rgba(48,209,88,.75)" }}>
                €{(meta.budget - meta.budgetUsed).toLocaleString()} rămas
              </span>
            )}
            <span>€{meta ? `${Math.round(meta.budget / 1000)}K` : "—"}</span>
          </div>
        </div>
      </div>

      {/* Budget alert */}
      {budgetAlert && meta && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            borderRadius: 14,
            background: "rgba(255,159,10,.07)",
            border: "1px solid rgba(255,159,10,.18)",
            marginBottom: 14,
          }}
        >
          <IconWarning />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,159,10,.95)", margin: 0 }}>
              Alertă Buget
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,159,10,.6)", margin: "2px 0 0" }}>
              {budgetPct}% din buget utilizat · {meta.pending} PO-uri în așteptare
            </p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: 4,
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 12,
          marginBottom: 14,
          overflowX: "auto",
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              flex: "0 0 auto",
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              color: filter === f ? "var(--prv-text-1)" : "var(--prv-text-3)",
              background: filter === f ? "var(--prv-g2)" : "transparent",
              border: "none",
              cursor: "pointer",
              transition: "all .15s",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* PO list */}
      {error ? (
        <p style={{ textAlign: "center", color: "var(--prv-text-3)", fontSize: 14, marginTop: 40 }}>
          Eroare la încărcare. Încearcă din nou.
        </p>
      ) : !orders ? (
        <div
          style={{
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            borderRadius: 18,
            overflow: "hidden",
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 16px",
                borderBottom: i < 3 ? "1px solid var(--prv-border-subtle)" : "none",
              }}
            >
              <Skeleton w={36} h={36} radius={10} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <Skeleton w="60%" h={14} />
                <Skeleton w="80%" h={12} />
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}
              >
                <Skeleton w={56} h={16} />
                <Skeleton w={56} h={18} radius={6} />
              </div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <p style={{ textAlign: "center", color: "var(--prv-text-3)", fontSize: 14, marginTop: 40 }}>
          Nicio comandă găsită.
        </p>
      ) : (
        <div
          style={{
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            borderRadius: 18,
            position: "relative",
            overflow: "hidden",
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
          {orders.map((po, i) => {
            const sc = STATUS_CONFIG[po.status] ?? {
              label: po.status,
              color: "var(--prv-text-3)",
              bg: "var(--prv-border-subtle)",
            }
            const isPending = po.status === "Pending"
            return (
              <Link
                key={po.id}
                href={`/procurement/${po.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  paddingLeft: isPending ? 13 : 16,
                  borderBottom:
                    i < orders.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
                  textDecoration: "none",
                  borderLeft: isPending ? "3px solid transparent" : undefined,
                  borderImage: isPending
                    ? "linear-gradient(180deg,rgba(255,159,10,.7),rgba(255,159,10,.4)) 1"
                    : undefined,
                }}
              >
                <POStatusIcon status={po.status} />
                <div style={{ flex: 1 }}>
                  <p
                    style={{ fontSize: 14, fontWeight: 700, color: "var(--prv-text-1)", margin: 0 }}
                  >
                    {po.ref}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--prv-text-3)", margin: "2px 0 0" }}>
                    {po.description} · {po.supplier} · {formatDate(po.date)}
                  </p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "var(--prv-text-1)",
                      margin: "0 0 4px",
                    }}
                  >
                    €{po.amount.toLocaleString()}
                  </p>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: 6,
                      background: sc.bg,
                      color: sc.color,
                    }}
                  >
                    {sc.label}
                  </span>
                </div>
              </Link>
            )
          })}
          {hasNextPage && (
            <div
              style={{
                padding: "12px 16px",
                textAlign: "center",
                borderTop: "1px solid var(--prv-border-subtle)",
              }}
            >
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 12,
                  color: "var(--prv-text-3)",
                  cursor: isFetchingNextPage ? "default" : "pointer",
                }}
              >
                {isFetchingNextPage ? "Se încarcă..." : "Încarcă mai mult ›"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={handleNewOrder}
        style={{
          position: "fixed",
          bottom: 100,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: 26,
          background: "rgba(255,255,255,.12)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(0,0,0,.5)",
          color: "rgba(255,255,255,.9)",
        }}
      >
        <IconPlus />
      </button>
    </div>
  )
}

// ── Sheet button helper ───────────────────────────────────────────────────────

type SheetColor = "blue" | "green" | "red" | "white"

function SheetBtn({
  color,
  icon,
  label,
  sub,
  onClick,
}: {
  color: SheetColor
  icon: React.ReactNode
  label: string
  sub: string
  onClick: () => void
}) {
  const styles: Record<SheetColor, React.CSSProperties> = {
    blue: { background: "rgba(10,132,255,.15)", border: "1px solid rgba(10,132,255,.25)" },
    green: { background: "rgba(48,209,88,.12)", border: "1px solid rgba(48,209,88,.2)" },
    red: { background: "rgba(255,69,58,.10)", border: "1px solid rgba(255,69,58,.2)" },
    white: { background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.09)" },
  }
  const labelColor: Record<SheetColor, string> = {
    blue: "rgba(10,132,255,.9)",
    green: "rgba(48,209,88,.95)",
    red: "rgba(255,69,58,.95)",
    white: "var(--prv-text-1)",
  }
  const iconBg: Record<SheetColor, string> = {
    blue: "rgba(10,132,255,.2)",
    green: "rgba(48,209,88,.15)",
    red: "rgba(255,69,58,.15)",
    white: "rgba(255,255,255,.08)",
  }

  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        borderRadius: 14,
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
        ...styles[color],
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: iconBg[color],
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 15, fontWeight: 600, color: labelColor[color], margin: 0 }}>
          {label}
        </p>
        <p style={{ fontSize: 12, color: "var(--prv-text-3)", margin: "2px 0 0" }}>{sub}</p>
      </div>
    </button>
  )
}
