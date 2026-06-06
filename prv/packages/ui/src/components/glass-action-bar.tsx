"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ActionBarAction {
  label: string
  icon?: React.ReactNode
  /** Render in destructive (red) styling. */
  danger?: boolean
  onAction: () => void
}

export interface GlassActionBarProps {
  /** Number of selected items. */
  count: number
  actions: ActionBarAction[]
  onClose?: () => void
  /** Word after the count. Default "selected". */
  label?: string
  className?: string
  style?: React.CSSProperties
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassActionBar({
  count,
  actions,
  onClose,
  label = "selected",
  className,
  style,
}: GlassActionBarProps) {
  return (
    <div
      role="toolbar"
      aria-label={`${count} ${label}`}
      className={clsx(className)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderRadius: 16,
        background: "rgba(22,22,22,0.7)",
        backdropFilter: "blur(48px) saturate(180%)",
        WebkitBackdropFilter: "blur(48px) saturate(180%)",
        border: "1px solid var(--prv-border)",
        ...style,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--prv-text-1)" }}>
        {count} <span style={{ color: "var(--prv-text-3)", fontWeight: 500 }}>{label}</span>
      </div>

      <div style={{ flex: 1 }} />

      {actions.map((a, i) => (
        <button
          key={i}
          type="button"
          onClick={a.onAction}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 13px",
            borderRadius: 10,
            background: "var(--prv-g2)",
            border: "1px solid var(--prv-border-subtle)",
            color: a.danger ? "var(--prv-red, rgba(255,69,58,0.95))" : "var(--prv-text-1)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "background 150ms",
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = "var(--prv-g3)"
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = "var(--prv-g2)"
          }}
        >
          {a.icon}
          {a.label}
        </button>
      ))}

      {onClose && (
        <button
          type="button"
          aria-label="Clear selection"
          onClick={onClose}
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: "var(--prv-g2)",
            border: "1px solid var(--prv-border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--prv-text-2)",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  )
}
