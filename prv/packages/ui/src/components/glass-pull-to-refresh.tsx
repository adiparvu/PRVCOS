"use client"

import React, { useRef, useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GlassPullToRefreshProps {
  children: React.ReactNode
  /** Called when the pull passes the threshold and is released. May return a Promise. */
  onRefresh: () => void | Promise<void>
  /** Controlled refreshing state (also reflects an async onRefresh internally). */
  refreshing?: boolean
  /** Pull distance (px) required to trigger. Default 64. */
  threshold?: number
  /** Container height. Default 240. */
  height?: number | string
  /** Label shown while refreshing. */
  label?: string
  className?: string
  style?: React.CSSProperties
}

const KEYFRAMES = `@keyframes prvPtrSpin{to{transform:rotate(360deg)}}`

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassPullToRefresh({
  children,
  onRefresh,
  refreshing: controlledRefreshing,
  threshold = 64,
  height = 240,
  label = "Refreshing…",
  className,
  style,
}: GlassPullToRefreshProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const startY = useRef<number | null>(null)
  const [pull, setPull] = useState(0)
  const [internalRefreshing, setInternalRefreshing] = useState(false)
  const refreshing = controlledRefreshing ?? internalRefreshing

  const onPointerDown = (e: React.PointerEvent) => {
    // Only start a pull when scrolled to the very top.
    if ((scrollRef.current?.scrollTop ?? 0) <= 0) {
      startY.current = e.clientY
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (startY.current === null || refreshing) return
    const delta = e.clientY - startY.current
    if (delta > 0) {
      // Resistance curve so it feels rubber-banded.
      setPull(Math.min(delta * 0.5, threshold * 1.5))
    }
  }

  const finish = () => {
    setInternalRefreshing(false)
    setPull(0)
  }

  const onPointerUp = async () => {
    if (startY.current === null) return
    const triggered = pull >= threshold
    startY.current = null
    if (triggered && !refreshing) {
      setPull(threshold)
      setInternalRefreshing(true)
      try {
        await onRefresh()
      } finally {
        if (controlledRefreshing === undefined) finish()
        else setPull(0)
      }
    } else {
      setPull(0)
    }
  }

  const showSpinner = refreshing || pull > 0
  const offset = refreshing ? threshold * 0.6 : pull

  return (
    <div
      className={clsx(className)}
      style={{
        position: "relative",
        height,
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid var(--prv-border-subtle)",
        background: "var(--prv-g1)",
        ...style,
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Spinner header */}
      {showSpinner && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 9,
            color: "var(--prv-text-2)",
            fontSize: 12,
          }}
        >
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              border: "2px solid var(--prv-g3)",
              borderTopColor: "var(--prv-accent, rgba(10,132,255,0.9))",
              animation: refreshing ? "prvPtrSpin 0.8s linear infinite" : undefined,
              transform: refreshing ? undefined : `rotate(${(pull / threshold) * 270}deg)`,
            }}
          />
          {refreshing ? label : pull >= threshold ? "Release to refresh" : "Pull to refresh"}
        </div>
      )}

      {/* Scroll content */}
      <div
        ref={scrollRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: "absolute",
          inset: 0,
          padding: "16px",
          overflowY: "auto",
          touchAction: "pan-y",
          transform: `translateY(${offset}px)`,
          transition:
            startY.current === null ? "transform 300ms cubic-bezier(0.34,1.56,0.64,1)" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  )
}
