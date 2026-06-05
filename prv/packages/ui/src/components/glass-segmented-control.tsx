"use client"

import React, { useEffect, useRef, useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SegmentItem {
  id: string
  label: string
  icon?: React.ReactNode
}

export interface GlassSegmentedControlProps {
  items: SegmentItem[]
  activeId: string
  onChange: (id: string) => void
  size?: "sm" | "md" | "lg"
  fullWidth?: boolean
  className?: string
  style?: React.CSSProperties
}

// ── Size tokens ───────────────────────────────────────────────────────────────

const padding: Record<"sm" | "md" | "lg", string> = {
  sm: "5px 12px",
  md: "7px 16px",
  lg: "9px 20px",
}

const fontSize: Record<"sm" | "md" | "lg", number> = {
  sm: 12,
  md: 13,
  lg: 14,
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassSegmentedControl({
  items,
  activeId,
  onChange,
  size = "md",
  fullWidth = false,
  className,
  style,
}: GlassSegmentedControlProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [ind, setInd] = useState<{ left: number; width: number }>({ left: 0, width: 0 })
  const [ready, setReady] = useState(false)

  const measure = () => {
    if (!containerRef.current) return
    const idx = items.findIndex((item) => item.id === activeId)
    if (idx < 0) return
    const btns = containerRef.current.querySelectorAll<HTMLButtonElement>("[data-seg-btn]")
    const btn = btns[idx]
    if (btn) {
      setInd({ left: btn.offsetLeft, width: btn.offsetWidth })
      setReady(true)
    }
  }

  useEffect(() => {
    measure()
  }, [activeId, items, size, fullWidth])

  // re-measure on container resize (e.g. fullWidth in responsive layout)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [activeId, items])

  return (
    <div
      ref={containerRef}
      className={clsx(
        "relative inline-flex rounded-full border",
        "backdrop-blur-[32px] backdrop-saturate-[160%]",
        fullWidth && "w-full",
        className
      )}
      style={{
        background: "var(--prv-g1)",
        borderColor: "var(--prv-border-subtle)",
        padding: 3,
        ...style,
      }}
      role="tablist"
    >
      {/* spring-animated sliding indicator */}
      <div
        className="absolute top-[3px] bottom-[3px] rounded-full pointer-events-none"
        style={{
          background: "var(--prv-text-1)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          left: ind.left,
          width: ind.width,
          // skip transition on initial mount to avoid animating from 0→position
          transition: ready
            ? "left 280ms cubic-bezier(0.34,1.56,0.64,1), width 280ms cubic-bezier(0.34,1.56,0.64,1)"
            : "none",
        }}
        aria-hidden="true"
      />

      {items.map((item) => {
        const isActive = item.id === activeId
        return (
          <button
            key={item.id}
            data-seg-btn
            role="tab"
            aria-selected={isActive}
            className={clsx(
              "relative z-10 flex items-center gap-1.5 rounded-full",
              "font-medium whitespace-nowrap transition-colors duration-200 focus-visible:outline-none",
              fullWidth && "flex-1 justify-center"
            )}
            style={{
              padding: padding[size],
              fontSize: fontSize[size],
              color: isActive ? "#000" : "var(--prv-text-3)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
            onClick={() => onChange(item.id)}
          >
            {item.icon && <span className="shrink-0">{item.icon}</span>}
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
