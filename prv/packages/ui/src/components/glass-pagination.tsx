"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GlassPaginationProps {
  page: number
  total: number
  pageSize?: number
  onChange: (page: number) => void
  compact?: boolean
  siblingCount?: number
  className?: string
  style?: React.CSSProperties
}

// ── Page range algorithm ──────────────────────────────────────────────────────

function getRange(page: number, totalPages: number, siblings: number): (number | "...")[] {
  if (totalPages <= 1) return [1]

  // show all when small enough
  if (totalPages <= siblings * 2 + 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const left = Math.max(2, page - siblings)
  const right = Math.min(totalPages - 1, page + siblings)
  const items: (number | "...")[] = [1]

  if (left > 2) items.push("...")
  for (let i = left; i <= right; i++) items.push(i)
  if (right < totalPages - 1) items.push("...")
  items.push(totalPages)

  return items
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function ChevLeft() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevRight() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

// ── Button ────────────────────────────────────────────────────────────────────

function PageBtn({
  children,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode
  active?: boolean
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 32,
        height: 32,
        padding: "0 6px",
        borderRadius: 9,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        fontFamily: "inherit",
        background: active ? "var(--prv-text-1)" : "transparent",
        color: active ? "#000" : "var(--prv-text-2)",
        border: "1px solid transparent",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.35 : 1,
        transition: "background 120ms, color 120ms",
      }}
      onMouseEnter={(e) => {
        if (!active && !disabled) {
          e.currentTarget.style.background = "var(--prv-g2)"
          e.currentTarget.style.color = "var(--prv-text-1)"
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "transparent"
          e.currentTarget.style.color = "var(--prv-text-2)"
        }
      }}
    >
      {children}
    </button>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassPagination({
  page,
  total,
  pageSize = 10,
  onChange,
  compact = false,
  siblingCount = 1,
  className,
  style,
}: GlassPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canPrev = page > 1
  const canNext = page < totalPages

  if (compact) {
    return (
      <div
        className={clsx("inline-flex items-center gap-2", className)}
        style={{ fontSize: 13, ...style }}
      >
        <PageBtn disabled={!canPrev} onClick={() => onChange(page - 1)}>
          <ChevLeft />
        </PageBtn>
        <span style={{ color: "var(--prv-text-3)", whiteSpace: "nowrap" }}>
          Page <strong style={{ color: "var(--prv-text-1)", fontWeight: 600 }}>{page}</strong> of{" "}
          {totalPages}
        </span>
        <PageBtn disabled={!canNext} onClick={() => onChange(page + 1)}>
          <ChevRight />
        </PageBtn>
      </div>
    )
  }

  const range = getRange(page, totalPages, siblingCount)

  return (
    <div className={clsx("inline-flex items-center gap-1", className)} style={style}>
      <PageBtn disabled={!canPrev} onClick={() => onChange(page - 1)}>
        <ChevLeft />
      </PageBtn>

      {range.map((item, i) =>
        item === "..." ? (
          <span
            key={`ellipsis-${i}`}
            style={{
              minWidth: 32,
              height: 32,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              color: "var(--prv-text-4)",
            }}
          >
            …
          </span>
        ) : (
          <PageBtn key={item} active={item === page} onClick={() => onChange(item as number)}>
            {item}
          </PageBtn>
        )
      )}

      <PageBtn disabled={!canNext} onClick={() => onChange(page + 1)}>
        <ChevRight />
      </PageBtn>
    </div>
  )
}
