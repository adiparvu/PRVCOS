"use client"

import React, { useEffect, useRef, useState } from "react"

export type SnapPoint = "peek" | "mid" | "full"

function snapPx(snap: SnapPoint, wh: number): number {
  if (snap === "peek") return 260
  if (snap === "mid") return Math.round(wh * 0.55)
  return Math.round(wh * 0.92)
}

const VELOCITY_THRESHOLD = 0.35 // px/ms

export interface SnapSheetProps {
  open: boolean
  onClose: () => void
  snapPoints?: SnapPoint[]
  defaultSnap?: SnapPoint
  stackOffset?: number
  zIndex?: number
  title?: string
  children: React.ReactNode
}

export function SnapSheet({
  open,
  onClose,
  snapPoints = ["mid", "full"],
  defaultSnap,
  stackOffset = 0,
  zIndex = 60,
  title,
  children,
}: SnapSheetProps) {
  const resolvedDefault: SnapPoint = defaultSnap ?? snapPoints[0] ?? "mid"
  const wh = typeof window !== "undefined" ? window.innerHeight : 800

  const [snap, setSnap] = useState<SnapPoint>(resolvedDefault)
  const [height, setHeight] = useState(() => snapPx(resolvedDefault, wh))
  const [dragging, setDragging] = useState(false)

  const startY = useRef(0)
  const startH = useRef(0)
  const lastY = useRef(0)
  const lastT = useRef(0)
  const defaultRef = useRef(resolvedDefault)
  defaultRef.current = resolvedDefault

  // Reset to default snap on open
  useEffect(() => {
    if (open) {
      const vh = window.innerHeight
      setSnap(defaultRef.current)
      setHeight(snapPx(defaultRef.current, vh))
    }
  }, [open])

  // Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onClose])

  // Body scroll lock
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0]!.clientY
    startH.current = height
    lastY.current = e.touches[0]!.clientY
    lastT.current = Date.now()
    setDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const vh = window.innerHeight
    const deltaY = startY.current - e.touches[0]!.clientY
    setHeight(Math.max(80, Math.min(vh * 0.95, startH.current + deltaY)))
    lastY.current = e.touches[0]!.clientY
    lastT.current = Date.now()
  }

  const handleTouchEnd = () => {
    setDragging(false)
    const vh = window.innerHeight
    const dt = Date.now() - lastT.current
    const vy = dt > 0 ? (startY.current - lastY.current) / dt : 0
    const currentIdx = snapPoints.indexOf(snap)

    if (vy < -VELOCITY_THRESHOLD) {
      if (currentIdx > 0) {
        const prev = snapPoints[currentIdx - 1]!
        setSnap(prev)
        setHeight(snapPx(prev, vh))
      } else {
        onClose()
      }
      return
    }

    if (vy > VELOCITY_THRESHOLD && currentIdx < snapPoints.length - 1) {
      const next = snapPoints[currentIdx + 1]!
      setSnap(next)
      setHeight(snapPx(next, vh))
      return
    }

    let nearest = snapPoints[0]!
    let minDist = Math.abs(snapPx(nearest, vh) - height)
    for (const sp of snapPoints) {
      const d = Math.abs(snapPx(sp, vh) - height)
      if (d < minDist) {
        minDist = d
        nearest = sp
      }
    }
    setSnap(nearest)
    setHeight(snapPx(nearest, vh))
  }

  const stackScale = Math.max(0.82, 1 - stackOffset * 0.06)
  const stackTY = stackOffset * 22
  const panelTransform = open
    ? `translateY(-${stackTY}px) scale(${stackScale})`
    : "translateY(100%)"

  const spring = "cubic-bezier(0.34,1.56,0.64,1) 0.42s"
  const transition = dragging
    ? "opacity 0.15s ease"
    : `height ${spring}, transform ${spring}, opacity 0.28s ease`

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "Sheet"}
      style={{ position: "fixed", inset: 0, zIndex, pointerEvents: "none" }}
    >
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height,
          borderRadius: "32px 32px 0 0",
          background: "var(--prv-g2)",
          border: "1px solid var(--prv-border)",
          borderBottom: "none",
          boxShadow:
            "0 -8px 48px rgba(0,0,0,0.45), 0 24px 64px rgba(0,0,0,0.7), inset 0 1px 0 var(--prv-g2-spec)",
          backdropFilter: "blur(48px) saturate(180%)",
          WebkitBackdropFilter: "blur(48px) saturate(180%)",
          transform: panelTransform,
          transformOrigin: "bottom center",
          opacity: open ? Math.max(0.55, 1 - stackOffset * 0.14) : 0,
          transition,
          overflow: "hidden",
          pointerEvents: open ? "auto" : "none",
          willChange: "transform, height",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Drag handle + snap indicator dots */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 12,
            paddingBottom: snapPoints.length > 1 ? 8 : 6,
            flexShrink: 0,
            cursor: "grab",
            userSelect: "none",
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 9999,
              background: "var(--prv-border-strong)",
              marginBottom: snapPoints.length > 1 ? 8 : 0,
            }}
          />
          {snapPoints.length > 1 && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {snapPoints.map((sp) => (
                <button
                  key={sp}
                  aria-label={`Snap to ${sp}`}
                  onClick={() => {
                    const vh = window.innerHeight
                    setSnap(sp)
                    setHeight(snapPx(sp, vh))
                  }}
                  style={{
                    width: snap === sp ? 18 : 5,
                    height: 5,
                    borderRadius: 9999,
                    background: snap === sp ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.22)",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    transition: "width 0.32s cubic-bezier(0.34,1.56,0.64,1), background 0.2s ease",
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Optional title bar */}
        {title !== undefined && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 20px 14px",
              borderBottom: "1px solid var(--prv-border-subtle)",
              flexShrink: 0,
            }}
          >
            <h2
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: "var(--prv-text-1)",
                margin: 0,
              }}
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--prv-g1)",
                border: "1px solid var(--prv-border)",
                color: "var(--prv-text-2)",
                cursor: "pointer",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M1 1l12 12M13 1L1 13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>{children}</div>
      </div>
    </div>
  )
}
