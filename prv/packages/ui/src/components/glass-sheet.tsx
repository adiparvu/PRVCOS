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
}

export function GlassSheet({
  open,
  onClose,
  side = "bottom",
  title,
  children,
  className,
}: GlassSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onClose])

  // Lock body scroll
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
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={clsx(
          "absolute overflow-hidden",
          "bg-white/[0.10] backdrop-blur-[48px]",
          "border border-white/[0.12]",
          "shadow-[0_24px_64px_rgba(0,0,0,0.7)]",
          "ring-[0.5px] ring-inset ring-white/20",
          "transition-transform duration-[400ms]",
          "will-change-transform",
          positionClasses[side],
          sizeClasses[side],
          open ? "translate-x-0 translate-y-0" : translateFrom[side],
          className
        )}
        style={{ transitionTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)" }}
      >
        {/* Drag indicator (bottom sheet only) */}
        {side === "bottom" && (
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-white/25" />
          </div>
        )}

        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
            <h2 className="text-[17px] font-semibold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08] text-white/50 hover:bg-white/[0.14] hover:text-white transition-colors"
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
