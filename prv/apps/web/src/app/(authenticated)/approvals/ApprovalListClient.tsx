"use client"
import { useRouter } from "next/navigation"

import { useState } from "react"
import { summarizeSettled } from "@/lib/bulk"
import { useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useSheetStack, useToast } from "@prv/ui"
import type { ApprovalSummary, ApprovalsMeta, ApprovalType } from "@/app/api/approvals/route"
import { useApprovals } from "@/lib/api-hooks"

type FilterType = "All" | "Purchases" | "Leave" | "Expenses" | "Contracts" | "Overtime"

const FILTERS: FilterType[] = ["All", "Purchases", "Leave", "Expenses", "Contracts", "Overtime"]

const FILTER_TO_TYPE: Record<FilterType, ApprovalType | null> = {
  All: null,
  Purchases: "purchase",
  Leave: "leave",
  Expenses: "expense",
  Contracts: "contract",
  Overtime: "overtime",
}

const TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; iconBg: string; iconStroke: string }
> = {
  purchase: {
    label: "Purchase",
    color: "rgba(10,132,255,.9)",
    bg: "rgba(10,132,255,.13)",
    iconBg: "rgba(10,132,255,.10)",
    iconStroke: "rgba(10,132,255,.85)",
  },
  leave: {
    label: "Concediu",
    color: "rgba(255,159,10,.95)",
    bg: "rgba(255,159,10,.13)",
    iconBg: "rgba(255,159,10,.10)",
    iconStroke: "rgba(255,159,10,.85)",
  },
  expense: {
    label: "Expense",
    color: "rgba(255,69,58,.95)",
    bg: "rgba(255,69,58,.12)",
    iconBg: "rgba(255,69,58,.10)",
    iconStroke: "rgba(255,69,58,.85)",
  },
  contract: {
    label: "Contract",
    color: "rgba(191,90,242,.9)",
    bg: "rgba(191,90,242,.12)",
    iconBg: "rgba(191,90,242,.10)",
    iconStroke: "rgba(191,90,242,.85)",
  },
  overtime: {
    label: "Overtime",
    color: "rgba(255,159,10,.95)",
    bg: "rgba(255,159,10,.13)",
    iconBg: "rgba(255,159,10,.10)",
    iconStroke: "rgba(255,159,10,.85)",
  },
}

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

function TypeIcon({ type }: { type: ApprovalType }) {
  const tc = TYPE_CONFIG[type] ?? {
    iconBg: "rgba(255,255,255,.06)",
    iconStroke: "rgba(255,255,255,.45)",
  }

  const path =
    type === "purchase" ? (
      <>
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </>
    ) : type === "leave" ? (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>
    ) : type === "expense" ? (
      <>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </>
    ) : type === "contract" ? (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </>
    ) : (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    )

  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 11,
        background: tc.iconBg,
        border: "1px solid var(--prv-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke={tc.iconStroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {path}
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

// ── Approval row ──────────────────────────────────────────────────────────────

function ApprovalRow({
  item,
  isLast,
  selectMode = false,
  selected = false,
  onToggle,
}: {
  item: ApprovalSummary
  isLast: boolean
  selectMode?: boolean
  selected?: boolean
  onToggle?: (id: string) => void
}) {
  const tc = TYPE_CONFIG[item.type] ?? {
    label: item.type,
    color: "var(--prv-text-3)",
    bg: "var(--prv-border-subtle)",
    iconBg: "rgba(255,255,255,.06)",
    iconStroke: "rgba(255,255,255,.45)",
  }
  const isExpired = item.status === "Expired"
  const isUrgent = item.status === "Urgent"
  const hasBorder = isExpired || isUrgent
  const statusColor = isExpired
    ? "rgba(255,69,58,.95)"
    : isUrgent
      ? "rgba(255,159,10,.95)"
      : tc.color
  const statusBg = isExpired ? "rgba(255,69,58,.12)" : isUrgent ? "rgba(255,159,10,.13)" : tc.bg
  const statusLabel = isExpired ? "Expired" : isUrgent ? "Urgent" : "Pending"

  const selectable = selectMode && !isExpired
  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 11,
    padding: "13px 15px",
    paddingLeft: hasBorder ? 12 : 15,
    borderBottom: isLast ? "none" : "1px solid var(--prv-border-subtle)",
    textDecoration: "none",
    borderLeft: hasBorder ? "3px solid transparent" : undefined,
    borderImage: isExpired
      ? "linear-gradient(180deg,rgba(255,69,58,.7),rgba(255,69,58,.4)) 1"
      : isUrgent
        ? "linear-gradient(180deg,rgba(255,159,10,.7),rgba(255,159,10,.4)) 1"
        : undefined,
    cursor: selectMode ? (selectable ? "pointer" : "default") : "pointer",
    opacity: selectMode && !selectable ? 0.4 : 1,
    background: "none",
    border: "none",
    width: selectMode ? "100%" : undefined,
    textAlign: "left" as const,
  }

  const checkbox = selectMode ? (
    <span
      style={{
        width: 22,
        height: 22,
        borderRadius: 7,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: selected ? "2px solid transparent" : "2px solid rgba(255,255,255,0.28)",
        background: selected ? "rgba(255,255,255,0.95)" : "transparent",
        color: "#000",
        fontSize: 13,
        fontWeight: 800,
      }}
    >
      {selected ? "✓" : ""}
    </span>
  ) : null

  const body = (
    <>
      {checkbox}
      <TypeIcon type={item.type} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--prv-text-3)",
            margin: "0 0 2px",
          }}
        >
          {tc.label} · {item.ref}
        </p>
        <p
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--prv-text-1)",
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.title}
        </p>
        <p style={{ fontSize: 11, color: "var(--prv-text-3)", margin: "2px 0 0" }}>
          {item.requestedBy}
          {item.value !== null ? ` · €${item.value.toLocaleString()}` : ""}
          {` · ${item.deadline}`}
        </p>
      </div>
      <span
        style={{
          fontSize: 9,
          fontWeight: 600,
          padding: "3px 7px",
          borderRadius: 5,
          background: statusBg,
          color: statusColor,
          flexShrink: 0,
          alignSelf: "flex-start",
        }}
      >
        {statusLabel}
      </span>
    </>
  )

  if (selectMode) {
    return (
      <button
        type="button"
        onClick={() => selectable && onToggle?.(item.id)}
        disabled={!selectable}
        style={rowStyle}
      >
        {body}
      </button>
    )
  }
  return (
    <Link href={`/approvals/${item.id}`} style={rowStyle}>
      {body}
    </Link>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────

function SectionCard({
  items,
  selectMode,
  selected,
  onToggle,
}: {
  items: ApprovalSummary[]
  selectMode?: boolean
  selected?: Set<string>
  onToggle?: (id: string) => void
}) {
  return (
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
      {items.map((item, i) => (
        <ApprovalRow
          key={item.id}
          item={item}
          isLast={i === items.length - 1}
          selectMode={selectMode}
          selected={selected?.has(item.id) ?? false}
          onToggle={onToggle}
        />
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ApprovalListClient() {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterType>("All")
  const { openSheet } = useSheetStack()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const type = FILTER_TO_TYPE[filter]

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const exitSelect = () => {
    setSelectMode(false)
    setSelected(new Set())
  }

  const bulkDecision = (action: "approve" | "reject") => {
    const ids = [...selected]
    if (ids.length === 0) return
    setBulkBusy(true)
    Promise.allSettled(
      ids.map((aid) =>
        fetch(`/api/approvals/${aid}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action }),
        }).then((r) => {
          if (!r.ok) throw new Error("failed")
        })
      )
    )
      .then((results) => {
        const { ok, failed, kind } = summarizeSettled(results)
        void queryClient.invalidateQueries({ queryKey: ["approvals"] })
        ids.forEach((aid) => queryClient.invalidateQueries({ queryKey: ["approval-detail", aid] }))
        const verb = action === "approve" ? "approved" : "rejected"
        if (kind === "success") toast.success(`${ok} ${verb}`)
        else if (kind === "error") toast.error(`Couldn't ${action} approvals`, "Please try again.")
        else toast.warning(`${ok} ${verb}`, `${failed} could not be processed.`)
        exitSelect()
      })
      .finally(() => setBulkBusy(false))
  }
  const { data, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useApprovals(type)
  const approvals = data?.approvals ?? null
  const meta = data?.meta ?? null
  const error = isError

  const handleFAB = () => {
    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: "Approveri",
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
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            }
            label="New Request"
            sub="Create an approval request"
            onClick={() => {
              onClose()
              router.push("/approvals/new")
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
            label="Export Raport"
            sub="Approval history and decisions"
            onClick={onClose}
          />
        </div>
      ),
    })
  }

  const urgentItems =
    approvals?.filter((a) => a.status === "Urgent" || a.status === "Expired") ?? []
  const pendingItems = approvals?.filter((a) => a.status === "Pending") ?? []
  const expiredCount = meta?.expired ?? 0

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
          <p style={{ fontSize: 13, color: "var(--prv-text-3)", marginBottom: 2 }}>Command</p>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--prv-text-1)",
            }}
          >
            Approveri
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {(approvals?.length ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
              style={{
                fontSize: 13,
                fontWeight: 600,
                padding: "7px 14px",
                borderRadius: 100,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.14)",
                color: "rgba(255,255,255,0.8)",
                cursor: "pointer",
              }}
            >
              {selectMode ? "Cancel" : "Select"}
            </button>
          )}
          {meta && meta.pending > 0 && (
            <div
              style={{
                minWidth: 28,
                height: 28,
                padding: "0 8px",
                borderRadius: 14,
                background: "rgba(255,69,58,.85)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                color: "#fff",
              }}
            >
              {meta.pending}
            </div>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}
      >
        {meta
          ? [
              {
                val: String(meta.pending),
                label: "Pending",
                color: meta.pending > 0 ? "rgba(255,69,58,.95)" : "var(--prv-text-1)",
              },
              {
                val: String(meta.urgent),
                label: "Urgent",
                color: meta.urgent > 0 ? "rgba(255,159,10,.95)" : "var(--prv-text-1)",
              },
              {
                val: String(meta.expired),
                label: "Expired",
                color: meta.expired > 0 ? "rgba(255,69,58,.95)" : "var(--prv-text-1)",
              },
              {
                val: String(meta.approvedToday),
                label: "Today",
                color: "rgba(48,209,88,.95)",
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
                <div style={{ fontSize: 17, fontWeight: 700, color: k.color }}>{k.val}</div>
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

      {/* Expired alert */}
      {expiredCount > 0 && (
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
              {expiredCount} cerere{expiredCount > 1 ? "i" : ""} expirate
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,159,10,.6)", margin: "2px 0 0" }}>
              Immediate action required
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

      {/* Lists */}
      {error ? (
        <p style={{ textAlign: "center", color: "var(--prv-text-3)", fontSize: 14, marginTop: 40 }}>
          Loading error. Try again.
        </p>
      ) : !approvals ? (
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
              <Skeleton w={40} h={40} radius={11} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <Skeleton w={70} h={10} radius={3} />
                <Skeleton w="65%" h={14} />
                <Skeleton w="80%" h={11} />
              </div>
            </div>
          ))}
        </div>
      ) : approvals.length === 0 ? (
        <p style={{ textAlign: "center", color: "var(--prv-text-3)", fontSize: 14, marginTop: 40 }}>
          No requests found.
        </p>
      ) : (
        <>
          {urgentItems.length > 0 && (
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
                Urgent · Expired
              </p>
              <div style={{ marginBottom: 14 }}>
                <SectionCard
                  items={urgentItems}
                  selectMode={selectMode}
                  selected={selected}
                  onToggle={toggleSelect}
                />
              </div>
            </>
          )}

          {pendingItems.length > 0 && (
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
                Pending
              </p>
              <SectionCard
                items={pendingItems}
                selectMode={selectMode}
                selected={selected}
                onToggle={toggleSelect}
              />
            </>
          )}
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
            marginBottom: 12,
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

      {selectMode && selected.size > 0 && (
        <div
          style={{
            position: "fixed",
            left: 16,
            right: 16,
            bottom: 24,
            zIndex: 70,
            display: "flex",
            gap: 10,
            padding: 12,
            borderRadius: 18,
            background: "rgba(28,28,30,0.82)",
            backdropFilter: "blur(32px) saturate(180%)",
            WebkitBackdropFilter: "blur(32px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
            maxWidth: 620,
            margin: "0 auto",
          }}
        >
          <span
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              paddingLeft: 8,
              fontSize: 14,
              fontWeight: 600,
              color: "rgba(255,255,255,0.75)",
            }}
          >
            {selected.size} selected
          </span>
          <button
            type="button"
            disabled={bulkBusy}
            onClick={() => bulkDecision("reject")}
            style={{
              padding: "12px 18px",
              borderRadius: 12,
              background: "rgba(255,69,58,0.15)",
              border: "1px solid rgba(255,69,58,0.28)",
              color: "rgba(255,69,58,0.95)",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: bulkBusy ? "default" : "pointer",
              opacity: bulkBusy ? 0.6 : 1,
            }}
          >
            Reject
          </button>
          <button
            type="button"
            disabled={bulkBusy}
            onClick={() => bulkDecision("approve")}
            style={{
              padding: "12px 22px",
              borderRadius: 12,
              background: "#fff",
              border: "none",
              color: "#000",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: bulkBusy ? "default" : "pointer",
              opacity: bulkBusy ? 0.6 : 1,
            }}
          >
            {bulkBusy ? "Working…" : "Approve"}
          </button>
        </div>
      )}
    </div>
  )
}
