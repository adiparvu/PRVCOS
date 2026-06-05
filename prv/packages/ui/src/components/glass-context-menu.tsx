"use client"

import React, { useEffect, useRef } from "react"
import { clsx } from "clsx"
import { createPortal } from "react-dom"

export interface GlassContextMenuItem {
  id: string
  label: string
  icon?: React.ReactNode
  shortcut?: string
  /** Renders a › arrow and does NOT fire onSelect — caller handles sub-menus */
  hasSubmenu?: boolean
  destructive?: boolean
  separator?: boolean
}

export interface GlassContextMenuProps {
  open: boolean
  onClose: () => void
  position: { x: number; y: number }
  items: GlassContextMenuItem[]
  onSelect: (id: string) => void
}

const MENU_W = 220
const MENU_APPROX_H = 220

export function GlassContextMenu({
  open,
  onClose,
  position,
  items,
  onSelect,
}: GlassContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<number>(-1)

  // compute viewport-safe position
  const safeX =
    typeof window !== "undefined"
      ? Math.min(position.x, window.innerWidth - MENU_W - 8)
      : position.x
  const safeY =
    typeof window !== "undefined"
      ? Math.min(position.y, window.innerHeight - MENU_APPROX_H - 8)
      : position.y

  useEffect(() => {
    if (!open) {
      activeRef.current = -1
      return
    }

    const selectableIds = items.filter((it) => !it.separator && !it.hasSubmenu).map((it) => it.id)

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose()
        return
      }
      if (e.key === "ArrowDown") {
        e.preventDefault()
        activeRef.current = Math.min(activeRef.current + 1, selectableIds.length - 1)
        focusItem(activeRef.current)
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        activeRef.current = Math.max(activeRef.current - 1, 0)
        focusItem(activeRef.current)
      }
      if (e.key === "Enter") {
        const id = selectableIds[activeRef.current]
        if (id) {
          onSelect(id)
          onClose()
        }
      }
    }

    function focusItem(idx: number) {
      if (!menuRef.current) return
      const btns = menuRef.current.querySelectorAll<HTMLButtonElement>("button[data-menu-item]")
      btns[idx]?.focus()
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, items, onClose, onSelect])

  if (typeof document === "undefined") return null

  const menu = (
    <div
      role="menu"
      aria-label="Context menu"
      ref={menuRef}
      className={clsx(
        "fixed z-[9999] min-w-[210px] rounded-[24px] p-[6px]",
        "border backdrop-blur-[64px] backdrop-saturate-[200%]",
        "transition-[opacity,transform] duration-[220ms]",
        open
          ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
          : "opacity-0 scale-[0.88] -translate-y-2 pointer-events-none"
      )}
      style={{
        top: safeY,
        left: safeX,
        background: "var(--prv-g3)",
        borderColor: "var(--prv-border)",
        boxShadow:
          "0 16px 48px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 var(--prv-g3-spec)",
        transitionTimingFunction: open
          ? "cubic-bezier(0.34,1.56,0.64,1)"
          : "cubic-bezier(0.4,0,0.2,1)",
        transformOrigin: "top left",
      }}
    >
      {items.map((item, i) => {
        if (item.separator) {
          return (
            <div
              key={`sep-${i}`}
              role="separator"
              className="h-px my-1 mx-1.5"
              style={{ background: "var(--prv-border-subtle)" }}
            />
          )
        }

        return (
          <button
            key={item.id}
            role="menuitem"
            data-menu-item
            className={clsx(
              "flex items-center justify-between gap-2.5 w-full",
              "px-3 py-[9px] rounded-[12px] text-left",
              "transition-colors duration-[120ms] focus-visible:outline-none",
              "focus-visible:ring-1"
            )}
            style={{
              color: item.destructive ? "rgba(255,80,80,0.85)" : "var(--prv-text-1)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--prv-g1)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            onFocus={(e) => (e.currentTarget.style.background = "var(--prv-g1)")}
            onBlur={(e) => (e.currentTarget.style.background = "transparent")}
            onClick={() => {
              onSelect(item.id)
              onClose()
            }}
          >
            <span className="flex items-center gap-2.5">
              {item.icon && (
                <span
                  className="flex items-center justify-center w-[18px] h-[18px] shrink-0"
                  style={{ color: item.destructive ? "rgba(255,80,80,0.7)" : "var(--prv-text-2)" }}
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
              )}
              <span className="text-[14px]">{item.label}</span>
            </span>

            {item.shortcut && (
              <span className="text-[11px]" style={{ color: "var(--prv-text-4)" }}>
                {item.shortcut}
              </span>
            )}

            {item.hasSubmenu && (
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
                style={{ color: "var(--prv-text-4)", flexShrink: 0 }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
          </button>
        )
      })}
    </div>
  )

  return createPortal(
    <>
      {open && (
        <div
          className="fixed inset-0 z-[9998]"
          onClick={onClose}
          onContextMenu={(e) => {
            e.preventDefault()
            onClose()
          }}
          aria-hidden="true"
        />
      )}
      {menu}
    </>,
    document.body
  )
}
