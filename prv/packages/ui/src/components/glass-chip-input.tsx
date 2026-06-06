"use client"

import React, { useRef, useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GlassChipInputProps {
  /** Current list of chip values (controlled). */
  value: string[]
  onChange: (value: string[]) => void
  /** Suggestion chips shown below the field; clicking adds them. */
  suggestions?: string[]
  /** Maximum number of chips allowed. */
  max?: number
  /** Keys (in addition to Enter) that commit the current text. Default: [","]. */
  delimiters?: string[]
  /** Allow the same value more than once. Default false. */
  allowDuplicates?: boolean
  placeholder?: string
  /** Show the "n / max tags" counter. */
  showCount?: boolean
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassChipInput({
  value,
  onChange,
  suggestions = [],
  max,
  delimiters = [","],
  allowDuplicates = false,
  placeholder = "Add a tag…",
  showCount = true,
  disabled = false,
  className,
  style,
}: GlassChipInputProps) {
  const [draft, setDraft] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const atMax = max !== undefined && value.length >= max

  const addChip = (raw: string) => {
    const label = raw.trim()
    if (!label || disabled || atMax) return
    if (!allowDuplicates && value.some((v) => v.toLowerCase() === label.toLowerCase())) {
      return
    }
    onChange([...value, label])
    setDraft("")
  }

  const removeAt = (index: number) => {
    if (disabled) return
    onChange(value.filter((_, i) => i !== index))
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || delimiters.includes(e.key)) {
      e.preventDefault()
      addChip(draft)
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      removeAt(value.length - 1)
    }
  }

  const remainingSuggestions = suggestions.filter(
    (s) => !value.some((v) => v.toLowerCase() === s.toLowerCase())
  )

  return (
    <div className={clsx(className)} style={style}>
      {/* Field */}
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 7,
          alignItems: "center",
          padding: "9px 11px",
          borderRadius: 12,
          minHeight: 46,
          background: "var(--prv-g2)",
          border: "1px solid var(--prv-border)",
          cursor: disabled ? "default" : "text",
          opacity: disabled ? 0.5 : 1,
          transition: "border-color 150ms, background 150ms",
        }}
      >
        {value.map((chip, i) => (
          <span
            key={`${chip}-${i}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 6px 4px 11px",
              borderRadius: 100,
              background: "var(--prv-g3)",
              border: "1px solid var(--prv-border-subtle)",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--prv-text-1)",
              animation: "prvChipIn 240ms cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            {chip}
            {!disabled && (
              <button
                type="button"
                aria-label={`Remove ${chip}`}
                onClick={(e) => {
                  e.stopPropagation()
                  removeAt(i)
                }}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "var(--prv-g2)",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--prv-text-3)",
                  cursor: "pointer",
                }}
              >
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </span>
        ))}

        <input
          ref={inputRef}
          value={draft}
          disabled={disabled || atMax}
          placeholder={atMax ? "" : placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => addChip(draft)}
          style={{
            flex: 1,
            minWidth: 90,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--prv-text-1)",
            fontSize: 14,
            fontFamily: "inherit",
            padding: "4px 2px",
          }}
        />

        <style>{`@keyframes prvChipIn{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}`}</style>
      </div>

      {/* Counter */}
      {showCount && max !== undefined && (
        <div style={{ fontSize: 11, color: "var(--prv-text-4)", marginTop: 6 }}>
          {value.length} / {max} tags
        </div>
      )}

      {/* Suggestions */}
      {!disabled && !atMax && remainingSuggestions.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginTop: 10,
          }}
        >
          {remainingSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addChip(s)}
              style={{
                padding: "4px 11px",
                borderRadius: 100,
                background: "var(--prv-g1)",
                border: "1px dashed var(--prv-border)",
                fontSize: 12,
                color: "var(--prv-text-2)",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background 150ms",
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = "var(--prv-g2)"
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = "var(--prv-g1)"
              }}
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
