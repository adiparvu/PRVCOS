"use client"

import React, { useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export type AlertType = "info" | "success" | "warning" | "error"

export interface GlassAlertBannerProps {
  type?: AlertType
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  dismissable?: boolean
  onDismiss?: () => void
  className?: string
  style?: React.CSSProperties
}

// ── Token maps ────────────────────────────────────────────────────────────────

const ACCENT: Record<AlertType, string> = {
  info: "rgba(10,132,255,1)",
  success: "rgba(48,209,88,1)",
  warning: "rgba(255,149,0,1)",
  error: "rgba(255,59,48,1)",
}

const BG: Record<AlertType, string> = {
  info: "rgba(10,132,255,0.06)",
  success: "rgba(48,209,88,0.06)",
  warning: "rgba(255,149,0,0.06)",
  error: "rgba(255,59,48,0.06)",
}

const BORDER: Record<AlertType, string> = {
  info: "rgba(10,132,255,0.2)",
  success: "rgba(48,209,88,0.2)",
  warning: "rgba(255,149,0,0.2)",
  error: "rgba(255,59,48,0.2)",
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function AlertIcon({ type }: { type: AlertType }) {
  const color = ACCENT[type]

  if (type === "info") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    )
  }
  if (type === "success") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    )
  }
  if (type === "warning") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    )
  }
  // error
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassAlertBanner({
  type = "info",
  title,
  description,
  action,
  dismissable = true,
  onDismiss,
  className,
  style,
}: GlassAlertBannerProps) {
  const [dismissing, setDismissing] = useState(false)
  const [gone, setGone] = useState(false)

  if (gone) return null

  const handleDismiss = () => {
    setDismissing(true)
    setTimeout(() => {
      setGone(true)
      onDismiss?.()
    }, 260)
  }

  return (
    <div
      role="alert"
      className={clsx("relative overflow-hidden", className)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "14px 16px",
        borderRadius: 14,
        background: BG[type],
        border: `1px solid ${BORDER[type]}`,
        transition: "opacity 250ms, transform 250ms",
        opacity: dismissing ? 0 : 1,
        transform: dismissing ? "translateX(10px)" : "none",
        ...style,
      }}
    >
      {/* Specular top edge */}
      <div
        style={{
          position: "absolute",
          inset: "0 0 auto",
          height: 1,
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)",
          pointerEvents: "none",
        }}
        aria-hidden="true"
      />

      {/* Left accent bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: ACCENT[type],
          borderRadius: "14px 0 0 14px",
        }}
        aria-hidden="true"
      />

      {/* Icon */}
      <div style={{ marginTop: 1, marginLeft: 4 }}>
        <AlertIcon type={type} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--prv-text-1)", lineHeight: 1.4 }}>
          {title}
        </p>
        {description && (
          <p style={{ fontSize: 12, color: "var(--prv-text-3)", marginTop: 3, lineHeight: 1.5 }}>
            {description}
          </p>
        )}
      </div>

      {/* Actions */}
      {(action || dismissable) && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginTop: 1 }}>
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              style={{
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "inherit",
                padding: "5px 12px",
                borderRadius: 8,
                background: "var(--prv-g3)",
                border: "1px solid var(--prv-border-subtle)",
                color: "var(--prv-text-1)",
                cursor: "pointer",
                transition: "background 150ms",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--prv-g4)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--prv-g3)"
              }}
            >
              {action.label}
            </button>
          )}

          {dismissable && (
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss"
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: "transparent",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--prv-text-3)",
                transition: "background 150ms, color 150ms",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--prv-g3)"
                e.currentTarget.style.color = "var(--prv-text-1)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent"
                e.currentTarget.style.color = "var(--prv-text-3)"
              }}
            >
              <svg
                width="11"
                height="11"
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
            </button>
          )}
        </div>
      )}
    </div>
  )
}
