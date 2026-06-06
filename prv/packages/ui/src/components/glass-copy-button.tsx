"use client"

import React, { useState } from "react"
import { clsx } from "clsx"

// ── GlassCopyButton ────────────────────────────────────────────────────────────

export interface GlassCopyButtonProps {
  /** Text to copy to the clipboard. */
  value: string
  /** Button label. Hidden when iconOnly. */
  label?: string
  /** Label shown briefly after a successful copy. */
  copiedLabel?: string
  /** Render only the icon (square button). */
  iconOnly?: boolean
  /** Fired after a successful copy. */
  onCopy?: (value: string) => void
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
}

function CopyGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckGlyph() {
  return (
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function GlassCopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  iconOnly = false,
  onCopy,
  disabled = false,
  className,
  style,
}: GlassCopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    if (disabled) return
    try {
      await navigator.clipboard?.writeText(value)
      setCopied(true)
      onCopy?.(value)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard may be unavailable (insecure context) — fail silently.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={disabled}
      aria-label={iconOnly ? (copied ? copiedLabel : label) : undefined}
      className={clsx(className)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: iconOnly ? 0 : 8,
        padding: iconOnly ? 0 : "9px 14px",
        width: iconOnly ? 34 : undefined,
        height: iconOnly ? 34 : undefined,
        justifyContent: "center",
        borderRadius: iconOnly ? 10 : 11,
        background: "var(--prv-g2)",
        border: `1px solid ${copied ? "rgba(48,209,88,0.3)" : "var(--prv-border)"}`,
        color: copied ? "var(--prv-green, rgba(48,209,88,0.95))" : "var(--prv-text-1)",
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "inherit",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background 150ms, color 150ms, border-color 150ms",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (disabled || copied) return
        ;(e.currentTarget as HTMLButtonElement).style.background = "var(--prv-g3)"
      }}
      onMouseLeave={(e) => {
        if (copied) return
        ;(e.currentTarget as HTMLButtonElement).style.background = "var(--prv-g2)"
      }}
    >
      {copied ? <CheckGlyph /> : <CopyGlyph />}
      {!iconOnly && (copied ? copiedLabel : label)}
    </button>
  )
}

// ── GlassKbd ───────────────────────────────────────────────────────────────────

export interface GlassKbdProps {
  /** Single key or array of keys rendered as a combo (joined with "+"). */
  keys: string | string[]
  className?: string
  style?: React.CSSProperties
}

const KEY_CAP: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 24,
  height: 24,
  padding: "0 7px",
  borderRadius: 7,
  background: "var(--prv-g2)",
  border: "1px solid var(--prv-border)",
  borderBottomWidth: 2,
  fontFamily: '"SF Mono", monospace',
  fontSize: 12,
  fontWeight: 600,
  color: "var(--prv-text-2)",
}

export function GlassKbd({ keys, className, style }: GlassKbdProps) {
  const list = Array.isArray(keys) ? keys : [keys]

  return (
    <span
      className={clsx(className)}
      style={{ display: "inline-flex", alignItems: "center", gap: 4, ...style }}
    >
      {list.map((key, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span style={{ color: "var(--prv-text-4)", fontSize: 11 }}>+</span>}
          <kbd style={KEY_CAP}>{key}</kbd>
        </React.Fragment>
      ))}
    </span>
  )
}
