"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export type PromptVariant = "card" | "chip"

export interface GlassAIPromptCardProps {
  /** Primary text (card title or chip label). */
  title: string
  /** Secondary description (card variant only). */
  description?: string
  /** Leading icon (card) or inline glyph (chip). */
  icon?: React.ReactNode
  variant?: PromptVariant
  /** Fired when the prompt is selected. Receives the title. */
  onSelect?: (title: string) => void
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassAIPromptCard({
  title,
  description,
  icon,
  variant = "card",
  onSelect,
  disabled = false,
  className,
  style,
}: GlassAIPromptCardProps) {
  const handle = () => {
    if (!disabled) onSelect?.(title)
  }

  // Chip variant
  if (variant === "chip") {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={handle}
        className={clsx(className)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 13px",
          borderRadius: 100,
          background: "var(--prv-g2)",
          border: "1px solid var(--prv-border-subtle)",
          fontSize: 12,
          color: "var(--prv-text-2)",
          fontFamily: "inherit",
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.5 : 1,
          transition: "background 150ms, color 150ms",
          ...style,
        }}
        onMouseEnter={(e) => {
          if (disabled) return
          const el = e.currentTarget as HTMLButtonElement
          el.style.background = "var(--prv-g3)"
          el.style.color = "var(--prv-text-1)"
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.background = "var(--prv-g2)"
          el.style.color = "var(--prv-text-2)"
        }}
      >
        {icon && <span style={{ display: "inline-flex" }}>{icon}</span>}
        {title}
      </button>
    )
  }

  // Card variant
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handle}
      className={clsx("relative", className)}
      style={{
        display: "flex",
        gap: 12,
        padding: "14px 16px",
        borderRadius: 14,
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        cursor: disabled ? "default" : "pointer",
        textAlign: "left",
        fontFamily: "inherit",
        opacity: disabled ? 0.5 : 1,
        position: "relative",
        transition: "background 150ms, transform 150ms",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (disabled) return
        const el = e.currentTarget as HTMLButtonElement
        el.style.background = "var(--prv-g2)"
        el.style.transform = "translateY(-2px)"
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.background = "var(--prv-g1)"
        el.style.transform = "translateY(0)"
      }}
    >
      {/* Top specular edge */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "0 0 auto",
          height: 1,
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)",
          pointerEvents: "none",
        }}
      />

      {icon && (
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "var(--prv-g2)",
            border: "1px solid var(--prv-border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--prv-accent, rgba(10,132,255,0.9))",
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
      )}

      <span>
        <span
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--prv-text-1)",
            marginBottom: 2,
          }}
        >
          {title}
        </span>
        {description && (
          <span
            style={{
              display: "block",
              fontSize: 12,
              color: "var(--prv-text-3)",
              lineHeight: 1.4,
            }}
          >
            {description}
          </span>
        )}
      </span>
    </button>
  )
}
