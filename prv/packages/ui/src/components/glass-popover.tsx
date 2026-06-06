"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export type PopoverSide = "top" | "bottom" | "left" | "right"
export type PopoverAlign = "start" | "center" | "end"

export interface GlassPopoverProps {
  trigger: React.ReactNode
  content: React.ReactNode
  side?: PopoverSide
  align?: PopoverAlign
  open?: boolean
  onOpenChange?: (open: boolean) => void
  minWidth?: number
  className?: string
  style?: React.CSSProperties
}

// ── Arrow ─────────────────────────────────────────────────────────────────────

function arrowStyle(side: PopoverSide): React.CSSProperties {
  const base: React.CSSProperties = {
    position: "absolute",
    width: 10,
    height: 10,
    background: "rgba(22,22,22,0.92)",
    border: "1px solid var(--prv-border)",
    transform: "rotate(45deg)",
  }
  if (side === "top") {
    Object.assign(base, {
      bottom: -6,
      left: "50%",
      marginLeft: -5,
      borderTop: "none",
      borderLeft: "none",
    })
  } else if (side === "bottom") {
    Object.assign(base, {
      top: -6,
      left: "50%",
      marginLeft: -5,
      borderBottom: "none",
      borderRight: "none",
    })
  } else if (side === "left") {
    Object.assign(base, {
      right: -6,
      top: "50%",
      marginTop: -5,
      borderTop: "none",
      borderRight: "none",
    })
  } else {
    Object.assign(base, {
      left: -6,
      top: "50%",
      marginTop: -5,
      borderBottom: "none",
      borderLeft: "none",
    })
  }
  return base
}

function popoverPositionStyle(
  side: PopoverSide,
  align: PopoverAlign,
  open: boolean
): React.CSSProperties {
  const gap = 10
  const base: React.CSSProperties = {
    position: "absolute",
    zIndex: 50,
    background: "rgba(22,22,22,0.92)",
    backdropFilter: "blur(32px) saturate(160%)",
    WebkitBackdropFilter: "blur(32px) saturate(160%)",
    border: "1px solid var(--prv-border)",
    borderRadius: 14,
    boxShadow: "0 16px 48px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.4)",
    padding: "14px 16px",
    pointerEvents: open ? "all" : "none",
    transition: "opacity 160ms, transform 220ms cubic-bezier(0.34,1.56,0.64,1)",
    opacity: open ? 1 : 0,
  }

  // Alignment offset helper
  const alignOffset = align === "start" ? "0%" : align === "end" ? "auto" : "50%"
  const translateX =
    side === "top" || side === "bottom" ? (align === "center" ? "translateX(-50%)" : "") : ""
  const translateY =
    side === "left" || side === "right" ? (align === "center" ? "translateY(-50%)" : "") : ""

  if (side === "top") {
    base.bottom = `calc(100% + ${gap}px)`
    base.left = align === "end" ? "auto" : alignOffset
    if (align === "end") base.right = 0
    base.transformOrigin = "bottom center"
    base.transform = open
      ? `${translateX} scale(1) translateY(0)`
      : `${translateX} scale(0.95) translateY(4px)`
  } else if (side === "bottom") {
    base.top = `calc(100% + ${gap}px)`
    base.left = align === "end" ? "auto" : alignOffset
    if (align === "end") base.right = 0
    base.transformOrigin = "top center"
    base.transform = open
      ? `${translateX} scale(1) translateY(0)`
      : `${translateX} scale(0.95) translateY(-4px)`
  } else if (side === "left") {
    base.right = `calc(100% + ${gap}px)`
    base.top = align === "end" ? "auto" : alignOffset
    if (align === "end") base.bottom = 0
    base.transformOrigin = "right center"
    base.transform = open
      ? `${translateY} scale(1) translateX(0)`
      : `${translateY} scale(0.95) translateX(4px)`
  } else {
    base.left = `calc(100% + ${gap}px)`
    base.top = align === "end" ? "auto" : alignOffset
    if (align === "end") base.bottom = 0
    base.transformOrigin = "left center"
    base.transform = open
      ? `${translateY} scale(1) translateX(0)`
      : `${translateY} scale(0.95) translateX(-4px)`
  }

  return base
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassPopover({
  trigger,
  content,
  side = "top",
  align = "center",
  open: controlledOpen,
  onOpenChange,
  minWidth = 220,
  className,
  style,
}: GlassPopoverProps) {
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

  return (
    <div ref={anchorRef} style={{ position: "relative", display: "inline-block" }}>
      {/* Trigger */}
      <div onClick={() => setOpen(!open)} style={{ display: "inline-flex" }}>
        {trigger}
      </div>

      {/* Popover panel */}
      <div
        role="dialog"
        aria-hidden={!open}
        className={clsx(className)}
        style={{
          ...popoverPositionStyle(side, align, open),
          minWidth,
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

        {/* Arrow */}
        <div aria-hidden="true" style={arrowStyle(side)} />

        {content}
      </div>
    </div>
  )
}
