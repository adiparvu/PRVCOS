"use client"

import React, { useRef, useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SwipeAction {
  label: string
  icon?: React.ReactNode
  /** Background color of the action. */
  color?: string
  onAction: () => void
}

export interface GlassSwipeActionsProps {
  children: React.ReactNode
  /** Actions revealed on swipe-left (rendered right-to-left edge). */
  actions: SwipeAction[]
  /** Width of each action button (px). Default 76. */
  actionWidth?: number
  className?: string
  style?: React.CSSProperties
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassSwipeActions({
  children,
  actions,
  actionWidth = 76,
  className,
  style,
}: GlassSwipeActionsProps) {
  const fullWidth = actions.length * actionWidth
  const startX = useRef<number | null>(null)
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)

  const open = offset <= -fullWidth + 4

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX - offset
    setDragging(true)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current === null) return
    const next = e.clientX - startX.current
    // Clamp between fully-open (negative) and closed (0).
    setOffset(Math.max(-fullWidth, Math.min(0, next)))
  }

  const settle = () => {
    if (startX.current === null) return
    startX.current = null
    setDragging(false)
    // Snap open or closed based on the halfway point.
    setOffset(offset < -fullWidth / 2 ? -fullWidth : 0)
  }

  // Tap toggles when there was no drag (click without movement).
  const toggle = () => setOffset(open ? 0 : -fullWidth)

  return (
    <div
      className={clsx(className)}
      style={{
        position: "relative",
        borderRadius: 12,
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Revealed actions */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          display: "flex",
        }}
      >
        {actions.map((a, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              a.onAction()
              setOffset(0)
            }}
            style={{
              width: actionWidth,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              border: "none",
              cursor: "pointer",
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "inherit",
              background: a.color ?? "var(--prv-red, rgba(255,69,58,0.95))",
            }}
          >
            {a.icon}
            {a.label}
          </button>
        ))}
      </div>

      {/* Front (draggable) */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={settle}
        onPointerCancel={settle}
        onClick={(e) => {
          // Treat as a tap only if there was effectively no drag.
          if (Math.abs(offset) < 4 || open) {
            e.preventDefault()
            toggle()
          }
        }}
        style={{
          position: "relative",
          background: "rgba(20,20,22,1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 12,
          transform: `translateX(${offset}px)`,
          transition: dragging ? undefined : "transform 320ms cubic-bezier(0.34,1.56,0.64,1)",
          touchAction: "pan-y",
          cursor: "grab",
        }}
      >
        {children}
      </div>
    </div>
  )
}
