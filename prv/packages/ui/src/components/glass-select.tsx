"use client"

import React, { useEffect, useRef, useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SelectItem {
  value: string
  label: string
  icon?: React.ReactNode
}

export interface GlassSelectProps {
  items: SelectItem[]
  value?: string
  onChange: (value: string) => void
  searchable?: boolean
  placeholder?: string
  size?: "sm" | "md" | "lg"
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
}

// ── Size tokens ───────────────────────────────────────────────────────────────

const pad: Record<"sm" | "md" | "lg", string> = {
  sm: "7px 12px",
  md: "10px 14px",
  lg: "13px 16px",
}
const fs: Record<"sm" | "md" | "lg", number> = { sm: 12, md: 13, lg: 14 }
const radius: Record<"sm" | "md" | "lg", number> = { sm: 10, md: 12, lg: 14 }

// ── Icons ─────────────────────────────────────────────────────────────────────

function ChevronIcon({ open }: { open: boolean }) {
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
      style={{
        flexShrink: 0,
        color: "var(--prv-text-3)",
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 220ms cubic-bezier(0.34,1.56,0.64,1)",
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      style={{ color: "var(--prv-text-4)", flexShrink: 0 }}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--prv-text-1)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassSelect({
  items,
  value,
  onChange,
  searchable = false,
  placeholder = "Select…",
  size = "md",
  disabled = false,
  className,
  style,
}: GlassSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = items.find((i) => i.value === value)

  const filtered = query
    ? items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
    : items

  useEffect(() => {
    if (!open) {
      setQuery("")
      return
    }
    if (searchable) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    const onDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("mousedown", onDown)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("mousedown", onDown)
    }
  }, [open, searchable])

  const toggle = () => {
    if (!disabled) setOpen((v) => !v)
  }

  const pick = (item: SelectItem) => {
    onChange(item.value)
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className={clsx("relative", className)} style={style}>
      {/* trigger */}
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        className="flex w-full items-center justify-between gap-2 border focus-visible:outline-none"
        style={{
          padding: pad[size],
          fontSize: fs[size],
          borderRadius: radius[size],
          background: open ? "var(--prv-g2)" : "var(--prv-g1)",
          borderColor: open ? "var(--prv-border)" : "var(--prv-border-subtle)",
          color: selected ? "var(--prv-text-1)" : "var(--prv-text-4)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.45 : 1,
          transition: "background 150ms, border-color 150ms",
          fontFamily: "inherit",
          textAlign: "left",
        }}
        onMouseEnter={(e) => {
          if (!open && !disabled) e.currentTarget.style.background = "var(--prv-g2)"
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.background = "var(--prv-g1)"
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {selected?.icon && <span style={{ flexShrink: 0 }}>{selected.icon}</span>}
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronIcon open={open} />
      </button>

      {/* dropdown */}
      <div
        role="listbox"
        aria-hidden={!open}
        className="absolute z-50 w-full overflow-hidden border"
        style={{
          top: "calc(100% + 6px)",
          left: 0,
          borderRadius: 14,
          background: "var(--prv-g2)",
          borderColor: "var(--prv-border-subtle)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.3)",
          backdropFilter: "blur(32px) saturate(160%)",
          WebkitBackdropFilter: "blur(32px) saturate(160%)",
          transformOrigin: "top center",
          transform: open ? "scale(1) translateY(0)" : "scale(0.95) translateY(-6px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "transform 220ms cubic-bezier(0.34,1.56,0.64,1), opacity 160ms ease",
        }}
      >
        {searchable && (
          <div
            className="flex items-center gap-2 px-3 py-2.5"
            style={{ borderBottom: "1px solid var(--prv-border-subtle)" }}
          >
            <SearchIcon />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              style={{
                flex: 1,
                background: "none",
                border: "none",
                outline: "none",
                fontSize: fs[size],
                color: "var(--prv-text-1)",
                fontFamily: "inherit",
              }}
            />
          </div>
        )}

        <div style={{ maxHeight: 220, overflowY: "auto", padding: 4 }}>
          {filtered.length === 0 && (
            <div
              style={{
                padding: "10px 12px",
                fontSize: 13,
                color: "var(--prv-text-4)",
                textAlign: "center",
              }}
            >
              No results
            </div>
          )}
          {filtered.map((item) => {
            const isActive = item.value === value
            return (
              <div
                key={item.value}
                role="option"
                aria-selected={isActive}
                onClick={() => pick(item)}
                className="flex items-center gap-2 rounded-[10px]"
                style={{
                  padding: "8px 10px",
                  fontSize: fs[size],
                  color: "var(--prv-text-1)",
                  cursor: "pointer",
                  background: isActive ? "var(--prv-g3)" : "transparent",
                  fontWeight: isActive ? 500 : 400,
                  transition: "background 100ms",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--prv-g3)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isActive ? "var(--prv-g3)" : "transparent"
                }}
              >
                {item.icon && <span style={{ flexShrink: 0 }}>{item.icon}</span>}
                <span style={{ flex: 1 }}>{item.label}</span>
                {isActive && <CheckIcon />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
