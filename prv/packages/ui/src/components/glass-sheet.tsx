"use client"

import React, { useEffect, useRef } from "react"
import { clsx } from "clsx"

export type SheetSide = "bottom" | "right" | "left"

const translateFrom: Record<SheetSide, string> = {
  bottom: "translate-y-full",
  right: "translate-x-full",
  left: "-translate-x-full",
}

const sizeClasses: Record<SheetSide, string> = {
  bottom: "w-full rounded-t-[32px] max-h-[92dvh]",
  right: "h-full rounded-l-[32px] w-full max-w-md",
  left: "h-full rounded-r-[32px] w-full max-w-md",
}

const positionClasses: Record<SheetSide, string> = {
  bottom: "bottom-0 left-0 right-0",
  right: "top-0 right-0 bottom-0",
  left: "top-0 left-0 bottom-0",
}

export interface GlassSheetProps {
  open: boolean
  onClose: () => void
  side?: SheetSide
  title?: string
  children: React.ReactNode
  className?: string
  /** Extra inline styles applied to the sheet panel — useful for overriding max-height */
  panelStyle?: React.CSSProperties
}

export function GlassSheet({
  open,
  onClose,
  side = "bottom",
  title,
  children,
  className,
  panelStyle,
}: GlassSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={clsx("fixed inset-0 z-50", open ? "pointer-events-auto" : "pointer-events-none")}
    >
      {/* Backdrop */}
      <div
        className={clsx(
          "absolute inset-0 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0"
        )}
        style={{ background: "var(--prv-scrim)" }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={clsx(
          "absolute overflow-hidden",
          "border backdrop-blur-[48px] backdrop-saturate-[180%]",
          "transition-transform duration-[400ms] will-change-transform",
          positionClasses[side],
          sizeClasses[side],
          open ? "translate-x-0 translate-y-0" : translateFrom[side],
          className
        )}
        style={{
          background: "var(--prv-g2)",
          borderColor: "var(--prv-border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.7), inset 0 1px 0 var(--prv-g2-spec)",
          transitionTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)",
          ...panelStyle,
        }}
      >
        {/* Drag indicator (bottom sheet only) */}
        {side === "bottom" && (
          <div className="flex justify-center pt-3 pb-1">
            <div
              className="h-1 w-10 rounded-full"
              style={{ background: "var(--prv-border-strong)" }}
            />
          </div>
        )}

        {title && (
          <div
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: "var(--prv-border-subtle)" }}
          >
            <h2 className="text-[17px] font-semibold" style={{ color: "var(--prv-text-1)" }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border transition-colors"
              style={{
                background: "var(--prv-g1)",
                borderColor: "var(--prv-border)",
                color: "var(--prv-text-2)",
              }}
              aria-label="Close"
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

        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
