"use client"
import { useRouter } from "next/navigation"

import { useState } from "react"
import Link from "next/link"
import { useSheetStack } from "@prv/ui"
import type { ToolSummary, ToolsMeta } from "@/app/api/tools/route"
import { useTools } from "@/lib/api-hooks"

type FilterType = "All" | "Available" | "Occupied" | "Service" | "Missing"

const FILTERS: FilterType[] = ["All", "Available", "Occupied", "Service", "Missing"]

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Available: { label: "Available", color: "rgba(48,209,88,.95)", bg: "rgba(48,209,88,.13)" },
  "In Use": { label: "Occupied", color: "rgba(10,132,255,.9)", bg: "rgba(10,132,255,.13)" },
  Maintenance: { label: "Service", color: "rgba(255,159,10,.95)", bg: "rgba(255,159,10,.13)" },
  Missing: { label: "Missing", color: "rgba(255,69,58,.95)", bg: "rgba(255,69,58,.12)" },
}

const CATEGORY_ORDER = ["Hand Tools", "Power Tools", "Heavy Equipment", "Measuring"]
const CATEGORY_TOTALS: Record<string, number> = {
  "Hand Tools": 41,
  "Power Tools": 38,
  "Heavy Equipment": 36,
  Measuring: 27,
}
const MAX_CATEGORY = 41

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

function ToolIcon({ category, status }: { category: string; status: string }) {
  const isService = status === "Maintenance"
  const isInUse = status === "In Use"
  const isMissing = status === "Missing"

  const bg = isService
    ? "rgba(255,159,10,.10)"
    : isInUse
      ? "rgba(10,132,255,.10)"
      : isMissing
        ? "rgba(255,69,58,.10)"
        : "var(--prv-g2)"

  const stroke = isService
    ? "rgba(255,159,10,.85)"
    : isInUse
      ? "rgba(10,132,255,.85)"
      : isMissing
        ? "rgba(255,69,58,.85)"
        : "rgba(255,255,255,.45)"

  const path =
    category === "Measuring" ? (
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="12" x2="15" y2="12" />
      </>
    ) : category === "Heavy Equipment" ? (
      <>
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
      </>
    ) : category === "Hand Tools" ? (
      <>
        <path d="M3 17l4-4 4 4 4-4 4 4" />
        <path d="M3 11l4-4 4 4 4-4 4 4" />
      </>
    ) : (
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    )

  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: bg,
        border: "1px solid var(--prv-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {path}
      </svg>
    </div>
  )
}

function UtilBar({ pct }: { pct: number }) {
  const color =
    pct >= 80 ? "rgba(10,132,255,.7)" : pct >= 50 ? "rgba(48,209,88,.6)" : "rgba(255,255,255,.3)"
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5 }}>
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(255,255,255,.3)"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
      <div
        style={{
          flex: 1,
          height: 4,
          background: "var(--prv-border)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: color }} />
      </div>
      <span style={{ fontSize: 10, color: "var(--prv-text-3)", width: 24, textAlign: "right" }}>
        {pct}%
      </span>
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

// ── Sheet button helper ───────────────────────────────────────────────────────

type SheetColor = "blue" | "white"

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
    white: { background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.09)" },
  }
  const labelColor: Record<SheetColor, string> = {
    blue: "rgba(10,132,255,.9)",
    white: "var(--prv-text-1)",
  }
  const iconBg: Record<SheetColor, string> = {
    blue: "rgba(10,132,255,.2)",
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

// ── Main component ────────────────────────────────────────────────────────────

export function ToolListClient() {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterType>("All")
  const { openSheet } = useSheetStack()

  const statusParam: Record<FilterType, string | null> = {
    All: null,
    Available: "Available",
    Occupied: "In Use",
    Service: "Maintenance",
    Missing: "Missing",
  }
  const status = statusParam[filter]
  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useTools(status)
  const tools: ToolSummary[] | null = isLoading ? null : (data?.tools ?? [])
  const meta: ToolsMeta | null = data?.meta ?? null
  const error = isError

  const handleFAB = () => {
    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: "Scule",
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
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            }
            label="New Tool"
            sub="Add tool to inventory"
            onClick={() => {
              onClose()
              router.push("/tools/new")
            }}
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
            label="Export Inventar"
            sub="Raport stare, service, valoare"
            onClick={onClose}
          />
        </div>
      ),
    })
  }

  const showCategories = filter === "All"

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
            Scule
          </h1>
        </div>
        {meta && (
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
            {meta.total} scule
          </div>
        )}
      </div>

      {/* KPI strip */}
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}
      >
        {meta
          ? [
              { val: String(meta.total), label: "Total", color: undefined },
              {
                val: String(meta.inUse),
                label: "In Use",
                color: meta.inUse > 0 ? "rgba(10,132,255,.9)" : "var(--prv-text-1)",
              },
              {
                val: String(meta.inService),
                label: "Service",
                color: meta.inService > 0 ? "rgba(255,159,10,.95)" : "var(--prv-text-1)",
              },
              {
                val: String(meta.missing),
                label: "Missing",
                color: meta.missing > 0 ? "rgba(255,69,58,.95)" : "var(--prv-text-1)",
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
                <Skeleton w={36} h={18} />
                <Skeleton w={52} h={10} />
              </div>
            ))}
      </div>

      {/* Service overdue alert */}
      {meta?.serviceAlert && (
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
              Maintenance Overdue
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,159,10,.6)", margin: "2px 0 0" }}>
              {meta.overdueCount} tool{meta.overdueCount > 1 ? "s" : ""} with overdue service ·
              requires attention
            </p>
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {showCategories && meta && (
        <>
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
            Categorii
          </p>
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 18,
              position: "relative",
              overflow: "hidden",
              marginBottom: 14,
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
            {CATEGORY_ORDER.map((cat, i) => {
              const count = CATEGORY_TOTALS[cat] ?? 0
              const barPct = Math.round((count / MAX_CATEGORY) * 100)
              return (
                <div
                  key={cat}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "11px 16px",
                    borderBottom:
                      i < CATEGORY_ORDER.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
                  }}
                >
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--prv-text-1)",
                      margin: 0,
                      width: 128,
                      flexShrink: 0,
                    }}
                  >
                    {cat}
                  </p>
                  <div
                    style={{
                      flex: 1,
                      height: 4,
                      background: "var(--prv-border)",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${barPct}%`,
                        height: "100%",
                        borderRadius: 2,
                        background: "rgba(255,255,255,.3)",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--prv-text-2)",
                      width: 24,
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    {count}
                  </span>
                </div>
              )
            })}
          </div>
        </>
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

      {/* Tool list */}
      {error ? (
        <p style={{ textAlign: "center", color: "var(--prv-text-3)", fontSize: 14, marginTop: 40 }}>
          Loading error. Try again.
        </p>
      ) : !tools ? (
        <div
          style={{
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            borderRadius: 18,
            overflow: "hidden",
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 16px",
                borderBottom: i < 4 ? "1px solid var(--prv-border-subtle)" : "none",
              }}
            >
              <Skeleton w={44} h={44} radius={12} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <Skeleton w={80} h={11} radius={3} />
                <Skeleton w="60%" h={14} />
                <Skeleton w="75%" h={11} />
                <Skeleton w="80%" h={4} radius={2} />
              </div>
            </div>
          ))}
        </div>
      ) : tools.length === 0 ? (
        <p style={{ textAlign: "center", color: "var(--prv-text-3)", fontSize: 14, marginTop: 40 }}>
          No tools found.
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
          {tools.map((t, i) => {
            const sc = STATUS_CONFIG[t.status] ?? {
              label: t.status,
              color: "var(--prv-text-3)",
              bg: "var(--prv-border-subtle)",
            }
            const isService = t.status === "Maintenance"
            const isOverdueHigh =
              isService && t.serviceOverdueDays !== null && t.serviceOverdueDays >= 20
            return (
              <Link
                key={t.id}
                href={`/tools/${t.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  paddingLeft: isService ? 13 : 16,
                  borderBottom:
                    i < tools.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
                  textDecoration: "none",
                  borderLeft: isService ? "3px solid transparent" : undefined,
                  borderImage: isOverdueHigh
                    ? "linear-gradient(180deg,rgba(255,69,58,.7),rgba(255,69,58,.4)) 1"
                    : isService
                      ? "linear-gradient(180deg,rgba(255,159,10,.7),rgba(255,159,10,.4)) 1"
                      : undefined,
                }}
              >
                <ToolIcon category={t.category} status={t.status} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--prv-text-3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      margin: "0 0 2px",
                    }}
                  >
                    {t.category}
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--prv-text-1)",
                      margin: 0,
                      lineHeight: 1.3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.model} · {t.name}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--prv-text-3)", margin: "2px 0 0" }}>
                    {t.status === "In Use"
                      ? `${t.assignedTo ?? "—"} · ${t.site ?? "—"} · Retur ${t.dueBack ?? "—"}`
                      : t.serviceOverdueDays !== null
                        ? `${t.location ?? "—"} · Restant ${t.serviceOverdueDays} days`
                        : `${t.location ?? "—"} · Ultim uz: ${t.lastUsed ?? "—"}`}
                  </p>
                  <UtilBar pct={t.utilisationPct} />
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "3px 8px",
                    borderRadius: 6,
                    background: sc.bg,
                    color: sc.color,
                    flexShrink: 0,
                    alignSelf: "flex-start",
                  }}
                >
                  {sc.label}
                </span>
              </Link>
            )
          })}
        </div>
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

      {/* FAB */}
      <button
        onClick={handleFAB}
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
