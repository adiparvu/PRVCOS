"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ComboBoxOption {
  value: string
  label: string
  /** Optional secondary line shown under the label. */
  sublabel?: string
  /** Optional leading node (avatar, icon). */
  leading?: React.ReactNode
  disabled?: boolean
}

export interface GlassComboBoxProps {
  options: ComboBoxOption[]
  value?: string | null
  onChange?: (value: string | null) => void
  /** Called as the user types. When provided, parent owns filtering (server search). */
  onSearch?: (query: string) => void
  placeholder?: string
  /** Show a clear (×) button when a value is selected. */
  clearable?: boolean
  /** Text shown when no options match. */
  emptyText?: string
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
}

// ── Highlight helper ──────────────────────────────────────────────────────────

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, "ig"))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            style={{
              background: "transparent",
              color: "var(--prv-accent, rgba(10,132,255,0.9))",
              fontWeight: 700,
            }}
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassComboBox({
  options,
  value,
  onChange,
  onSearch,
  placeholder = "Search…",
  clearable = true,
  emptyText = "No results found",
  disabled = false,
  className,
  style,
}: GlassComboBoxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value])

  // Keep the input text in sync with the selected option when closed.
  useEffect(() => {
    if (!open) setQuery(selected?.label ?? "")
  }, [selected, open])

  // When the parent does its own searching, don't filter locally.
  const filtered = useMemo(() => {
    if (onSearch) return options
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q)
    )
  }, [options, query, onSearch])

  const close = useCallback(() => setOpen(false), [])

  // Outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open, close])

  const handleInput = (v: string) => {
    setQuery(v)
    setActive(0)
    setOpen(true)
    onSearch?.(v)
  }

  const pick = (opt: ComboBoxOption) => {
    if (opt.disabled) return
    onChange?.(opt.value)
    setQuery(opt.label)
    close()
  }

  const clear = () => {
    onChange?.(null)
    setQuery("")
    onSearch?.("")
    inputRef.current?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (!open) setOpen(true)
      setActive((a) => Math.min(a + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const opt = filtered[active]
      if (opt) pick(opt)
    } else if (e.key === "Escape") {
      close()
    }
  }

  return (
    <div ref={rootRef} className={clsx(className)} style={{ position: "relative", ...style }}>
      {/* Control */}
      <div
        onClick={() => !disabled && inputRef.current?.focus()}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "11px 14px",
          borderRadius: 12,
          background: "var(--prv-g2)",
          border: "1px solid var(--prv-border)",
          opacity: disabled ? 0.5 : 1,
          transition: "border-color 150ms, background 150ms",
        }}
      >
        <span
          style={{ color: "var(--prv-text-3)", display: "flex", flexShrink: 0 }}
          aria-hidden="true"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>

        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--prv-text-1)",
            fontSize: 14,
            fontFamily: "inherit",
          }}
        />

        {clearable && (selected || query) && !disabled && (
          <button
            type="button"
            aria-label="Clear"
            onClick={clear}
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: "var(--prv-g2)",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--prv-text-3)",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Popover list */}
      <div
        role="listbox"
        aria-hidden={!open}
        style={{
          position: "absolute",
          zIndex: 50,
          top: "calc(100% + 6px)",
          left: 0,
          right: 0,
          background: "rgba(22,22,22,0.94)",
          backdropFilter: "blur(48px) saturate(180%)",
          WebkitBackdropFilter: "blur(48px) saturate(180%)",
          border: "1px solid var(--prv-border)",
          borderRadius: 14,
          boxShadow: "0 16px 48px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.4)",
          padding: 6,
          maxHeight: 248,
          overflowY: "auto",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "all" : "none",
          transform: open ? "scale(1) translateY(0)" : "scale(0.98) translateY(-6px)",
          transformOrigin: "top center",
          transition: "opacity 140ms, transform 200ms cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              padding: 18,
              textAlign: "center",
              fontSize: 13,
              color: "var(--prv-text-3)",
            }}
          >
            {emptyText}
          </div>
        ) : (
          filtered.map((opt, i) => {
            const isActive = i === active
            const isSelected = opt.value === value
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => pick(opt)}
                onMouseEnter={() => setActive(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "9px 10px",
                  borderRadius: 9,
                  cursor: opt.disabled ? "default" : "pointer",
                  fontSize: 13,
                  color: opt.disabled ? "var(--prv-text-4)" : "var(--prv-text-1)",
                  background: isActive ? "var(--prv-g2)" : "transparent",
                }}
              >
                {opt.leading && (
                  <span style={{ flexShrink: 0, display: "flex" }}>{opt.leading}</span>
                )}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <div>
                    <Highlight text={opt.label} query={onSearch ? "" : query} />
                  </div>
                  {opt.sublabel && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--prv-text-3)",
                        marginTop: 1,
                      }}
                    >
                      {opt.sublabel}
                    </div>
                  )}
                </span>
                <span
                  style={{
                    color: "var(--prv-accent, rgba(10,132,255,0.9))",
                    opacity: isSelected ? 1 : 0,
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
