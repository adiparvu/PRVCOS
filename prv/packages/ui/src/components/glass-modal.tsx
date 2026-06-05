"use client"

import React, { useEffect, useRef } from "react"
import { clsx } from "clsx"

export type ModalSize = "sm" | "md" | "lg" | "xl"

const sizeMap: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
}

export interface GlassModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  size?: ModalSize
  /** Prevent closing by clicking backdrop */
  persistent?: boolean
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function GlassModal({
  open,
  onClose,
  title,
  description,
  size = "md",
  persistent = false,
  children,
  footer,
  className,
}: GlassModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !persistent) onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onClose, persistent])

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      aria-describedby={description ? "modal-description" : undefined}
      className={clsx(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
    >
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className={clsx(
          "absolute inset-0 backdrop-blur-sm transition-opacity duration-250",
          open ? "opacity-100" : "opacity-0"
        )}
        style={{ background: "rgba(0,0,0,0.7)" }}
        onClick={() => !persistent && onClose()}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className={clsx(
          "relative w-full",
          sizeMap[size],
          "border rounded-[24px]",
          "backdrop-blur-[64px] backdrop-saturate-[200%]",
          "transition-all duration-250",
          open ? "opacity-100 scale-100" : "opacity-0 scale-95",
          className
        )}
        style={{
          background: "var(--prv-g3)",
          borderColor: "var(--prv-border)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.8), inset 0 1px 0 var(--prv-g3-spec)",
        }}
      >
        {/* Header */}
        {(title || description) && (
          <div className="px-6 pt-6 pb-4">
            {title && (
              <h2
                id="modal-title"
                className="text-[18px] font-semibold"
                style={{ color: "var(--prv-text-1)" }}
              >
                {title}
              </h2>
            )}
            {description && (
              <p
                id="modal-description"
                className="mt-1 text-[14px]"
                style={{ color: "var(--prv-text-3)" }}
              >
                {description}
              </p>
            )}
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div
            className="flex items-center justify-end gap-3 px-6 pb-6 pt-2 border-t"
            style={{ borderColor: "var(--prv-border-subtle)" }}
          >
            {footer}
          </div>
        )}

        {/* Close button (no title) */}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border transition-colors"
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
        )}
      </div>
    </div>
  )
}
