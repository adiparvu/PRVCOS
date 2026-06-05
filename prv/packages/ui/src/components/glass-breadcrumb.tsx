"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  label: string
  icon?: React.ReactNode
  href?: string
  onClick?: () => void
}

export type BreadcrumbVariant = "default" | "floating"

export interface GlassBreadcrumbProps {
  items: BreadcrumbItem[]
  maxVisible?: number
  variant?: BreadcrumbVariant
  separator?: React.ReactNode
  onItemClick?: (item: BreadcrumbItem, index: number) => void
  className?: string
  style?: React.CSSProperties
}

// ── Default separator ─────────────────────────────────────────────────────────

function ChevronSep() {
  return (
    <svg
      width="12"
      height="12"
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

// ── Collapsed items computation ───────────────────────────────────────────────

type VisibleItem = BreadcrumbItem | null // null = ellipsis

function getVisible(items: BreadcrumbItem[], maxVisible?: number): VisibleItem[] {
  if (!maxVisible || items.length <= maxVisible) return items
  // Always show first + ellipsis + last (maxVisible - 2) items
  const tailCount = Math.max(1, maxVisible - 2)
  return [items[0]!, null, ...items.slice(items.length - tailCount)]
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassBreadcrumb({
  items,
  maxVisible,
  variant = "default",
  separator,
  onItemClick,
  className,
  style,
}: GlassBreadcrumbProps) {
  const visible = getVisible(items, maxVisible)
  const isFloating = variant === "floating"

  const containerStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 0,
    padding: "8px 14px",
    borderRadius: 12,
    position: "relative",
    overflow: "hidden",
    background: isFloating ? "rgba(255,255,255,0.08)" : "var(--prv-g1)",
    border: `1px solid ${isFloating ? "rgba(255,255,255,0.12)" : "var(--prv-border-subtle)"}`,
    ...(isFloating
      ? {
          backdropFilter: "blur(32px) saturate(180%)",
          WebkitBackdropFilter: "blur(32px) saturate(180%)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        }
      : {}),
    ...style,
  }

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol style={containerStyle} className={clsx("relative")}>
        {/* Specular highlight */}
        <div
          style={{
            position: "absolute",
            inset: "0 0 auto",
            height: 1,
            background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        />

        {visible.map((item, i) => {
          const isLast = i === visible.length - 1
          const sep = separator ?? <ChevronSep />

          // Ellipsis node
          if (item === null) {
            return (
              <li key="ellipsis" style={{ display: "flex", alignItems: "center", gap: 0 }}>
                <span
                  style={{
                    color: "rgba(255,255,255,0.15)",
                    padding: "0 2px",
                    fontSize: 12,
                  }}
                  aria-hidden="true"
                >
                  <ChevronSep />
                </span>
                <span
                  style={{
                    padding: "2px 8px",
                    background: "var(--prv-g2)",
                    borderRadius: 6,
                    fontSize: 11,
                    letterSpacing: "0.05em",
                    color: "var(--prv-text-3)",
                  }}
                >
                  •••
                </span>
              </li>
            )
          }

          const originalIndex = items.indexOf(item)
          const isClickable = !isLast && !!(item.href ?? item.onClick ?? onItemClick)

          const handleClick = () => {
            if (isLast) return
            item.onClick?.()
            onItemClick?.(item, originalIndex)
          }

          return (
            <li key={i} style={{ display: "flex", alignItems: "center", gap: 0 }}>
              {i > 0 && (
                <span
                  style={{
                    color: "rgba(255,255,255,0.15)",
                    padding: "0 2px",
                    display: "flex",
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >
                  {sep}
                </span>
              )}

              {item.href && !isLast ? (
                <a
                  href={item.href}
                  onClick={(e) => {
                    if (item.onClick || onItemClick) {
                      e.preventDefault()
                      handleClick()
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    color: isLast ? "var(--prv-text-1)" : "var(--prv-text-3)",
                    fontWeight: isLast ? 500 : 400,
                    textDecoration: "none",
                    padding: "2px 4px",
                    borderRadius: 6,
                    transition: "color 150ms, background 150ms",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    if (!isLast) {
                      e.currentTarget.style.color = "var(--prv-text-2)"
                      e.currentTarget.style.background = "var(--prv-g2)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = isLast ? "var(--prv-text-1)" : "var(--prv-text-3)"
                    e.currentTarget.style.background = "transparent"
                  }}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.icon && (
                    <span
                      style={{ display: "flex", alignItems: "center", flexShrink: 0, opacity: 0.6 }}
                    >
                      {item.icon}
                    </span>
                  )}
                  {item.label}
                </a>
              ) : (
                <span
                  onClick={isClickable ? handleClick : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    color: isLast ? "var(--prv-text-1)" : "var(--prv-text-3)",
                    fontWeight: isLast ? 500 : 400,
                    padding: "2px 4px",
                    borderRadius: 6,
                    cursor: isClickable ? "pointer" : "default",
                    transition: "color 150ms, background 150ms",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    if (isClickable) {
                      e.currentTarget.style.color = "var(--prv-text-2)"
                      e.currentTarget.style.background = "var(--prv-g2)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = isLast ? "var(--prv-text-1)" : "var(--prv-text-3)"
                    e.currentTarget.style.background = "transparent"
                  }}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.icon && (
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        flexShrink: 0,
                        opacity: isLast ? 1 : 0.6,
                      }}
                    >
                      {item.icon}
                    </span>
                  )}
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
