"use client"

import React, { useMemo, useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TableColumn<T = Record<string, unknown>> {
  key: string
  label: string
  width?: number | string
  align?: "left" | "right" | "center"
  sortable?: boolean
  render?: (row: T) => React.ReactNode
}

export interface GlassTableSort {
  key: string
  dir: "asc" | "desc"
}

export interface GlassTableProps<T extends Record<string, unknown>> {
  columns: TableColumn<T>[]
  data: T[]
  keyField: keyof T
  selectable?: boolean
  onRowClick?: (row: T) => void
  onSelectionChange?: (selected: T[]) => void
  onSortChange?: (sort: GlassTableSort | null) => void
  loading?: boolean
  emptyState?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function SortIcon({ dir }: { dir?: "asc" | "desc" }) {
  if (dir === "asc") {
    return (
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <polyline points="6 15 12 9 18 15" />
      </svg>
    )
  }
  if (dir === "desc") {
    return (
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    )
  }
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
      style={{ opacity: 0.3 }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function CheckIcon({ size = 10 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: "14px 16px" }}>
          <div
            style={{
              height: 13,
              borderRadius: 4,
              width: i === 0 ? "60%" : i === 1 ? "80%" : "50%",
              background:
                "linear-gradient(90deg,rgba(255,255,255,0.06) 25%,rgba(255,255,255,0.12) 50%,rgba(255,255,255,0.06) 75%)",
              backgroundSize: "600px 100%",
              animation: "prv-shimmer 1.6s ease-in-out infinite",
            }}
          />
        </td>
      ))}
    </tr>
  )
}

// ── Default empty state ───────────────────────────────────────────────────────

function DefaultEmptyState() {
  return (
    <tr>
      <td colSpan={999} style={{ padding: "48px 24px", textAlign: "center" }}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1.5"
          strokeLinecap="round"
          style={{ margin: "0 auto 10px", display: "block" }}
          aria-hidden="true"
        >
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <polyline points="13 2 13 9 20 9" />
        </svg>
        <p style={{ fontSize: 13, color: "var(--prv-text-4)" }}>No data</p>
      </td>
    </tr>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  selectable = false,
  onRowClick,
  onSelectionChange,
  onSortChange,
  loading = false,
  emptyState,
  className,
  style,
}: GlassTableProps<T>) {
  const [sort, setSort] = useState<GlassTableSort | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Client-side sort (skip when onSortChange provided — caller handles it)
  const rows = useMemo(() => {
    if (!sort || onSortChange) return data
    return [...data].sort((a, b) => {
      const va = String(a[sort.key as keyof T] ?? "")
      const vb = String(b[sort.key as keyof T] ?? "")
      const cmp = va.localeCompare(vb, undefined, { numeric: true, sensitivity: "base" })
      return sort.dir === "asc" ? cmp : -cmp
    })
  }, [data, sort, onSortChange])

  const handleSort = (col: TableColumn<T>) => {
    if (!col.sortable) return
    const next: GlassTableSort | null =
      sort?.key === col.key
        ? sort.dir === "asc"
          ? { key: col.key, dir: "desc" }
          : null
        : { key: col.key, dir: "asc" }
    setSort(next)
    onSortChange?.(next)
  }

  const toggleAll = () => {
    const allKeys = data.map((r) => String(r[keyField]))
    const allSelected = allKeys.every((k) => selected.has(k))
    const next = allSelected ? new Set<string>() : new Set(allKeys)
    setSelected(next)
    onSelectionChange?.(allSelected ? [] : [...data])
  }

  const toggleRow = (row: T) => {
    const key = String(row[keyField])
    const next = new Set(selected)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setSelected(next)
    onSelectionChange?.(data.filter((r) => next.has(String(r[keyField]))))
  }

  const allSelected = data.length > 0 && data.every((r) => selected.has(String(r[keyField])))
  const someSelected = !allSelected && data.some((r) => selected.has(String(r[keyField])))

  return (
    <div
      className={clsx("relative overflow-hidden border", className)}
      style={{
        borderRadius: 20,
        background: "var(--prv-g1)",
        borderColor: "var(--prv-border-subtle)",
        ...style,
      }}
    >
      {/* shimmer keyframes */}
      <style>{`@keyframes prv-shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}`}</style>

      {/* specular */}
      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)",
        }}
        aria-hidden="true"
      />

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--prv-border-subtle)" }}>
              {selectable && (
                <th style={{ width: 44, padding: "10px 0 10px 16px" }}>
                  <button
                    type="button"
                    onClick={toggleAll}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 5,
                      border: `1.5px solid ${allSelected || someSelected ? "#0a84ff" : "var(--prv-border)"}`,
                      background: allSelected
                        ? "#0a84ff"
                        : someSelected
                          ? "#0a84ff"
                          : "var(--prv-g1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      transition: "background 150ms, border-color 150ms",
                    }}
                  >
                    {(allSelected || someSelected) &&
                      (someSelected ? (
                        <svg
                          width="9"
                          height="9"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#fff"
                          strokeWidth="3"
                          strokeLinecap="round"
                        >
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      ) : (
                        <CheckIcon size={9} />
                      ))}
                  </button>
                </th>
              )}
              {columns.map((col) => {
                const isActive = sort?.key === col.key
                return (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col)}
                    style={{
                      padding: "10px 16px",
                      textAlign: col.align ?? "left",
                      fontSize: 11,
                      fontWeight: 600,
                      color: isActive ? "var(--prv-text-1)" : "var(--prv-text-3)",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      cursor: col.sortable ? "pointer" : "default",
                      userSelect: "none",
                      whiteSpace: "nowrap",
                      width: col.width,
                      transition: "color 120ms",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      {col.label}
                      {col.sortable && <SortIcon dir={isActive ? sort?.dir : undefined} />}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} cols={(selectable ? 1 : 0) + columns.length} />
              ))
            ) : rows.length === 0 ? (
              emptyState ? (
                <tr>
                  <td colSpan={999}>{emptyState}</td>
                </tr>
              ) : (
                <DefaultEmptyState />
              )
            ) : (
              rows.map((row) => {
                const key = String(row[keyField])
                const isSelected = selected.has(key)
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    style={{
                      borderTop: "1px solid var(--prv-border-subtle)",
                      background: isSelected ? "rgba(10,132,255,0.06)" : "transparent",
                      cursor: onRowClick ? "pointer" : "default",
                      transition: "background 100ms",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "var(--prv-g2)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isSelected
                        ? "rgba(10,132,255,0.06)"
                        : "transparent"
                    }}
                  >
                    {selectable && (
                      <td
                        style={{ padding: "12px 0 12px 16px" }}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleRow(row)
                        }}
                      >
                        <button
                          type="button"
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 5,
                            border: `1.5px solid ${isSelected ? "#0a84ff" : "var(--prv-border)"}`,
                            background: isSelected ? "#0a84ff" : "var(--prv-g1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            transition: "background 150ms, border-color 150ms",
                          }}
                        >
                          {isSelected && <CheckIcon size={9} />}
                        </button>
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          padding: "12px 16px",
                          fontSize: 13,
                          color: "var(--prv-text-1)",
                          textAlign: col.align ?? "left",
                          verticalAlign: "middle",
                        }}
                      >
                        {col.render ? col.render(row) : String(row[col.key as keyof T] ?? "")}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
