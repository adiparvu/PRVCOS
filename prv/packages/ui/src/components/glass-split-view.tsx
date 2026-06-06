"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export type SplitOrientation = "horizontal" | "vertical"

export interface GlassSplitViewProps {
  /** First pane (left in horizontal, top in vertical). */
  left: React.ReactNode
  /** Second pane (right in horizontal, bottom in vertical). */
  right: React.ReactNode
  orientation?: SplitOrientation
  /** Initial size of the first pane, as a percentage (0–100). */
  defaultSize?: number
  /** Controlled size of the first pane (percentage). */
  size?: number
  /** Min / max size of the first pane, as percentages. */
  min?: number
  max?: number
  onResize?: (size: number) => void
  className?: string
  style?: React.CSSProperties
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassSplitView({
  left,
  right,
  orientation = "horizontal",
  defaultSize = 38,
  size: controlledSize,
  min = 20,
  max = 70,
  onResize,
  className,
  style,
}: GlassSplitViewProps) {
  const isControlled = controlledSize !== undefined
  const [internal, setInternal] = useState(defaultSize)
  const sizePct = isControlled ? controlledSize : internal
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const isH = orientation === "horizontal"

  const setSize = useCallback(
    (v: number) => {
      const clamped = Math.max(min, Math.min(max, v))
      if (!isControlled) setInternal(clamped)
      onResize?.(clamped)
    },
    [min, max, isControlled, onResize]
  )

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current || !containerRef.current) return
      const r = containerRef.current.getBoundingClientRect()
      const point =
        "touches" in e
          ? isH
            ? e.touches[0]?.clientX
            : e.touches[0]?.clientY
          : isH
            ? (e as MouseEvent).clientX
            : (e as MouseEvent).clientY
      if (point === undefined) return
      const pct = isH ? ((point - r.left) / r.width) * 100 : ((point - r.top) / r.height) * 100
      setSize(pct)
    }
    const onUp = () => {
      dragging.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
    document.addEventListener("touchmove", onMove, { passive: false })
    document.addEventListener("touchend", onUp)
    return () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
      document.removeEventListener("touchmove", onMove)
      document.removeEventListener("touchend", onUp)
    }
  }, [isH, setSize])

  const startDrag = () => {
    dragging.current = true
    document.body.style.cursor = isH ? "col-resize" : "row-resize"
    document.body.style.userSelect = "none"
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const dec = isH ? "ArrowLeft" : "ArrowUp"
    const inc = isH ? "ArrowRight" : "ArrowDown"
    if (e.key === dec) {
      e.preventDefault()
      setSize(sizePct - 2)
    } else if (e.key === inc) {
      e.preventDefault()
      setSize(sizePct + 2)
    }
  }

  return (
    <div
      ref={containerRef}
      className={clsx(className)}
      style={{
        display: "flex",
        flexDirection: isH ? "row" : "column",
        height: isH ? 300 : 400,
        ...style,
      }}
    >
      {/* First pane */}
      <div
        style={{
          flex: `0 0 ${sizePct}%`,
          overflow: "auto",
          padding: 18,
        }}
      >
        {left}
      </div>

      {/* Divider */}
      <div
        role="separator"
        aria-orientation={isH ? "vertical" : "horizontal"}
        aria-valuenow={Math.round(sizePct)}
        aria-valuemin={min}
        aria-valuemax={max}
        tabIndex={0}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        onKeyDown={onKeyDown}
        style={{
          flex: `0 0 9px`,
          cursor: isH ? "col-resize" : "row-resize",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          touchAction: "none",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            background: "var(--prv-border-subtle)",
            ...(isH ? { width: 1, height: "100%" } : { height: 1, width: "100%" }),
          }}
        />
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            borderRadius: 100,
            background: "var(--prv-g3)",
            border: "1px solid var(--prv-border-subtle)",
            ...(isH ? { width: 4, height: 34 } : { height: 4, width: 34 }),
          }}
        />
      </div>

      {/* Second pane */}
      <div style={{ flex: 1, overflow: "auto", padding: 18 }}>{right}</div>
    </div>
  )
}
