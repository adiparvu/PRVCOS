"use client"

import React, { useEffect, useRef } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export type DrawerSide = "left" | "right" | "top" | "bottom"
export type DrawerSize = "sm" | "md" | "lg" | "full"

export interface GlassDrawerProps {
  open: boolean
  onClose: () => void
  side?: DrawerSide
  size?: DrawerSize
  title?: string
  subtitle?: string
  footer?: React.ReactNode
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

// ── Size map ──────────────────────────────────────────────────────────────────

const SIZE: Record<DrawerSize, number | string> = {
  sm: 300,
  md: 380,
  lg: 480,
  full: "100%",
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function CloseIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function panelStyle(side: DrawerSide, size: DrawerSize, open: boolean): React.CSSProperties {
  const dim = SIZE[size]
  const isHorizontal = side === "left" || side === "right"

  const base: React.CSSProperties = {
    position: "fixed",
    zIndex: 101,
    background: "rgba(18,18,18,0.92)",
    backdropFilter: "blur(48px) saturate(180%)",
    WebkitBackdropFilter: "blur(48px) saturate(180%)",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    transition: "transform 380ms cubic-bezier(0.34,1.56,0.64,1)",
  }

  if (isHorizontal) {
    Object.assign(base, {
      top: 0,
      bottom: 0,
      width: dim,
      maxWidth: "90vw",
      boxShadow: side === "right" ? "-24px 0 64px rgba(0,0,0,0.7)" : "24px 0 64px rgba(0,0,0,0.7)",
    })
    if (side === "right") {
      base.right = 0
      base.borderLeft = "1px solid var(--prv-border-subtle)"
      base.transform = open ? "translateX(0)" : "translateX(100%)"
    } else {
      base.left = 0
      base.borderRight = "1px solid var(--prv-border-subtle)"
      base.transform = open ? "translateX(0)" : "translateX(-100%)"
    }
  } else {
    Object.assign(base, {
      left: 0,
      right: 0,
      height: dim,
      maxHeight: "90vh",
      boxShadow: side === "bottom" ? "0 -24px 64px rgba(0,0,0,0.7)" : "0 24px 64px rgba(0,0,0,0.7)",
    })
    if (side === "bottom") {
      base.bottom = 0
      base.borderTop = "1px solid var(--prv-border-subtle)"
      base.transform = open ? "translateY(0)" : "translateY(100%)"
    } else {
      base.top = 0
      base.borderBottom = "1px solid var(--prv-border-subtle)"
      base.transform = open ? "translateY(0)" : "translateY(-100%)"
    }
  }

  return base
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassDrawer({
  open,
  onClose,
  side = "right",
  size = "md",
  title,
  subtitle,
  footer,
  children,
  className,
  style,
}: GlassDrawerProps) {
  const firstFocusRef = useRef<HTMLButtonElement>(null)

  // Keyboard close + scroll lock
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    firstFocusRef.current?.focus()
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "all" : "none",
          transition: "opacity 300ms",
        }}
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Drawer"}
        className={clsx(className)}
        style={{ ...panelStyle(side, size, open), ...style }}
      >
        {/* Top specular edge */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "0 0 auto",
            height: 1,
            background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)",
            pointerEvents: "none",
          }}
        />

        {/* Header */}
        {(title || subtitle) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "20px 20px 16px",
              borderBottom: "1px solid var(--prv-border-subtle)",
              flexShrink: 0,
            }}
          >
            <div>
              {title && (
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--prv-text-1)",
                  }}
                >
                  {title}
                </div>
              )}
              {subtitle && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--prv-text-3)",
                    marginTop: 2,
                  }}
                >
                  {subtitle}
                </div>
              )}
            </div>

            <button
              ref={firstFocusRef}
              type="button"
              aria-label="Close drawer"
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: "var(--prv-g2)",
                border: "1px solid var(--prv-border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--prv-text-2)",
                flexShrink: 0,
                transition: "background 150ms",
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = "var(--prv-g3)"
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = "var(--prv-g2)"
              }}
            >
              <CloseIcon />
            </button>
          </div>
        )}

        {/* Body */}
        <div
          style={{
            flex: 1,
            padding: 20,
            overflowY: "auto",
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: "16px 20px",
              borderTop: "1px solid var(--prv-border-subtle)",
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </>
  )
}
