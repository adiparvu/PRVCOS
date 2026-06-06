"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export type DropdownAlign = "left" | "right"

export interface DropdownMenuItem {
  id: string
  label: string
  icon?: React.ReactNode
  /** Monospace meta shown on the right (e.g. a shortcut "⌘E"). */
  meta?: string
  /** Renders the item in destructive (red) styling. */
  danger?: boolean
  disabled?: boolean
  /** When defined, the item shows a checkmark when true (checkable item). */
  checked?: boolean
  onSelect?: () => void
}

export interface DropdownMenuSection {
  /** Optional uppercase section label. */
  label?: string
  items: DropdownMenuItem[]
}

export interface GlassDropdownMenuProps {
  trigger: React.ReactNode
  sections: DropdownMenuSection[]
  align?: DropdownAlign
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Called with the selected item id. Item-level onSelect also fires. */
  onSelect?: (id: string) => void
  minWidth?: number
  className?: string
  style?: React.CSSProperties
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassDropdownMenu({
  trigger,
  sections,
  align = "left",
  open: controlledOpen,
  onOpenChange,
  onSelect,
  minWidth = 220,
  className,
  style,
}: GlassDropdownMenuProps) {
  const isControlled = controlledOpen !== undefined
  const [internal, setInternal] = useState(false)
  const open = isControlled ? controlledOpen : internal
  const anchorRef = useRef<HTMLDivElement>(null)

  const setOpen = useCallback(
    (v: boolean) => {
      if (!isControlled) setInternal(v)
      onOpenChange?.(v)
    },
    [isControlled, onOpenChange]
  )

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!anchorRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open, setOpen])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, setOpen])

  const handleSelect = (item: DropdownMenuItem) => {
    if (item.disabled) return
    item.onSelect?.()
    onSelect?.(item.id)
    // Checkable items keep the menu open; plain actions close it.
    if (item.checked === undefined) setOpen(false)
  }

  return (
    <div ref={anchorRef} style={{ position: "relative", display: "inline-block" }}>
      {/* Trigger */}
      <div onClick={() => setOpen(!open)} style={{ display: "inline-flex" }}>
        {trigger}
      </div>

      {/* Menu */}
      <div
        role="menu"
        aria-hidden={!open}
        className={clsx(className)}
        style={{
          position: "absolute",
          zIndex: 55,
          top: "calc(100% + 8px)",
          left: align === "left" ? 0 : "auto",
          right: align === "right" ? 0 : "auto",
          minWidth,
          background: "rgba(22,22,22,0.92)",
          backdropFilter: "blur(48px) saturate(180%)",
          WebkitBackdropFilter: "blur(48px) saturate(180%)",
          border: "1px solid var(--prv-border)",
          borderRadius: 14,
          boxShadow: "0 16px 48px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.4)",
          padding: 6,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "all" : "none",
          transformOrigin: align === "right" ? "top right" : "top left",
          transform: open ? "scale(1) translateY(0)" : "scale(0.96) translateY(-6px)",
          transition: "opacity 150ms, transform 220ms cubic-bezier(0.34,1.56,0.64,1)",
          ...style,
        }}
      >
        {/* Top specular edge */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "0 0 auto",
            height: 1,
            background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)",
            pointerEvents: "none",
            borderRadius: "14px 14px 0 0",
          }}
        />

        {sections.map((section, si) => (
          <div key={si}>
            {si > 0 && (
              <div
                aria-hidden="true"
                style={{
                  height: 1,
                  background: "var(--prv-border-subtle)",
                  margin: "6px 4px",
                }}
              />
            )}

            {section.label && (
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--prv-text-4)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  padding: "8px 10px 6px",
                }}
              >
                {section.label}
              </div>
            )}

            {section.items.map((item) => {
              const danger = item.danger && !item.disabled
              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  aria-disabled={item.disabled}
                  disabled={item.disabled}
                  onClick={() => handleSelect(item)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    padding: "9px 10px",
                    borderRadius: 9,
                    fontSize: 13,
                    width: "100%",
                    textAlign: "left",
                    fontFamily: "inherit",
                    border: "none",
                    background: "transparent",
                    cursor: item.disabled ? "default" : "pointer",
                    color: item.disabled
                      ? "var(--prv-text-4)"
                      : danger
                        ? "rgba(255,59,48,0.9)"
                        : "var(--prv-text-1)",
                    transition: "background 120ms",
                  }}
                  onMouseEnter={(e) => {
                    if (item.disabled) return
                    ;(e.currentTarget as HTMLButtonElement).style.background = danger
                      ? "rgba(255,59,48,0.1)"
                      : "var(--prv-g2)"
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.background = "transparent"
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      color: item.disabled
                        ? "var(--prv-text-4)"
                        : danger
                          ? "rgba(255,59,48,0.9)"
                          : "var(--prv-text-2)",
                    }}
                  >
                    {item.checked ? <CheckIcon /> : (item.icon ?? null)}
                  </span>

                  <span style={{ flex: 1 }}>{item.label}</span>

                  {item.meta && (
                    <span
                      style={{
                        color: "var(--prv-text-4)",
                        fontSize: 11,
                        fontFamily: '"SF Mono", monospace',
                      }}
                    >
                      {item.meta}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
