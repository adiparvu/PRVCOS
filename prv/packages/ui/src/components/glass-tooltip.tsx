"use client"

import React, { useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export type TooltipSide = "top" | "bottom" | "left" | "right"

export interface GlassTooltipProps {
  /** The element that triggers the tooltip on hover/focus. */
  children: React.ReactNode
  /** Tooltip text or content. */
  content: React.ReactNode
  side?: TooltipSide
  /** Optional keyboard shortcut shown after the content (e.g. "⌘K"). */
  shortcut?: string
  /** Delay in ms before the tooltip appears. */
  delay?: number
  /** When true, the tooltip never shows. */
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
}

// ── Positioning ───────────────────────────────────────────────────────────────

function tipStyle(side: TooltipSide, open: boolean): React.CSSProperties {
  const gap = 9
  const base: React.CSSProperties = {
    position: "absolute",
    zIndex: 60,
    background: "rgba(28,28,28,0.94)",
    backdropFilter: "blur(24px) saturate(160%)",
    WebkitBackdropFilter: "blur(24px) saturate(160%)",
    border: "1px solid var(--prv-border)",
    borderRadius: 9,
    padding: "7px 11px",
    fontSize: 12,
    fontWeight: 500,
    color: "var(--prv-text-1)",
    whiteSpace: "nowrap",
    boxShadow: "0 8px 24px rgba(0,0,0,0.55)",
    pointerEvents: "none",
    opacity: open ? 1 : 0,
    transition: "opacity 140ms, transform 200ms cubic-bezier(0.34,1.56,0.64,1)",
  }

  if (side === "top") {
    base.bottom = `calc(100% + ${gap}px)`
    base.left = "50%"
    base.transformOrigin = "bottom center"
    base.transform = open
      ? "translateX(-50%) translateY(0) scale(1)"
      : "translateX(-50%) translateY(4px) scale(0.96)"
  } else if (side === "bottom") {
    base.top = `calc(100% + ${gap}px)`
    base.left = "50%"
    base.transformOrigin = "top center"
    base.transform = open
      ? "translateX(-50%) translateY(0) scale(1)"
      : "translateX(-50%) translateY(-4px) scale(0.96)"
  } else if (side === "left") {
    base.right = `calc(100% + ${gap}px)`
    base.top = "50%"
    base.transformOrigin = "right center"
    base.transform = open
      ? "translateY(-50%) translateX(0) scale(1)"
      : "translateY(-50%) translateX(4px) scale(0.96)"
  } else {
    base.left = `calc(100% + ${gap}px)`
    base.top = "50%"
    base.transformOrigin = "left center"
    base.transform = open
      ? "translateY(-50%) translateX(0) scale(1)"
      : "translateY(-50%) translateX(-4px) scale(0.96)"
  }

  return base
}

function arrowStyle(side: TooltipSide): React.CSSProperties {
  const base: React.CSSProperties = {
    position: "absolute",
    width: 8,
    height: 8,
    background: "rgba(28,28,28,0.94)",
    border: "1px solid var(--prv-border)",
    transform: "rotate(45deg)",
  }
  if (side === "top") {
    Object.assign(base, {
      bottom: -5,
      left: "50%",
      marginLeft: -4,
      borderTop: "none",
      borderLeft: "none",
    })
  } else if (side === "bottom") {
    Object.assign(base, {
      top: -5,
      left: "50%",
      marginLeft: -4,
      borderBottom: "none",
      borderRight: "none",
    })
  } else if (side === "left") {
    Object.assign(base, {
      right: -5,
      top: "50%",
      marginTop: -4,
      borderTop: "none",
      borderRight: "none",
    })
  } else {
    Object.assign(base, {
      left: -5,
      top: "50%",
      marginTop: -4,
      borderBottom: "none",
      borderLeft: "none",
    })
  }
  return base
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassTooltip({
  children,
  content,
  side = "top",
  shortcut,
  delay = 200,
  disabled = false,
  className,
  style,
}: GlassTooltipProps) {
  const [open, setOpen] = useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => {
    if (disabled) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setOpen(true), delay)
  }

  const hide = () => {
    if (timer.current) clearTimeout(timer.current)
    setOpen(false)
  }

  React.useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  return (
    <span
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}

      <span
        role="tooltip"
        aria-hidden={!open}
        className={clsx(className)}
        style={{ ...tipStyle(side, open), ...style }}
      >
        <span aria-hidden="true" style={arrowStyle(side)} />
        {content}
        {shortcut && (
          <span
            style={{
              color: "var(--prv-text-3)",
              marginLeft: 8,
              fontFamily: '"SF Mono", monospace',
              fontSize: 11,
            }}
          >
            {shortcut}
          </span>
        )}
      </span>
    </span>
  )
}
