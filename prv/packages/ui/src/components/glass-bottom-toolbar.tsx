"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BottomToolbarItem {
  label?: string
  icon: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}

export interface GlassBottomToolbarProps {
  items: BottomToolbarItem[]
  /** Optional accent FAB rendered after a divider. */
  fab?: {
    icon: React.ReactNode
    onClick?: () => void
    ariaLabel?: string
  }
  /** Fixed-float at the bottom-center of the viewport. Default false (inline). */
  floating?: boolean
  className?: string
  style?: React.CSSProperties
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassBottomToolbar({
  items,
  fab,
  floating = false,
  className,
  style,
}: GlassBottomToolbarProps) {
  const floatStyle: React.CSSProperties = floating
    ? {
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 80,
      }
    : {}

  return (
    <div
      role="toolbar"
      className={clsx(className)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: 8,
        borderRadius: 18,
        background: "rgba(22,22,22,0.7)",
        backdropFilter: "blur(48px) saturate(180%)",
        WebkitBackdropFilter: "blur(48px) saturate(180%)",
        border: "1px solid var(--prv-border)",
        boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
        ...floatStyle,
        ...style,
      }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          type="button"
          aria-label={item.label}
          disabled={item.disabled}
          onClick={item.onClick}
          style={{
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            padding: "8px 14px",
            borderRadius: 12,
            background: "transparent",
            border: "none",
            color: "var(--prv-text-2)",
            fontSize: 10,
            fontWeight: 600,
            cursor: item.disabled ? "not-allowed" : "pointer",
            opacity: item.disabled ? 0.4 : 1,
            fontFamily: "inherit",
            transition: "background 150ms, color 150ms",
          }}
          onMouseEnter={(e) => {
            if (item.disabled) return
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = "var(--prv-g2)"
            el.style.color = "var(--prv-text-1)"
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = "transparent"
            el.style.color = "var(--prv-text-2)"
          }}
        >
          {item.icon}
          {item.label}
        </button>
      ))}

      {fab && (
        <>
          <span
            aria-hidden="true"
            style={{
              width: 1,
              height: 28,
              background: "var(--prv-border-subtle)",
              margin: "0 4px",
            }}
          />
          <button
            type="button"
            aria-label={fab.ariaLabel ?? "Add"}
            onClick={fab.onClick}
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              background: "var(--prv-accent, rgba(10,132,255,0.9))",
              border: "none",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            {fab.icon}
          </button>
        </>
      )}
    </div>
  )
}
