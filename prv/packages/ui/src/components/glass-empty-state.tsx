"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GlassEmptyStateAction {
  label: string
  onClick: () => void
  variant?: "primary" | "ghost"
}

export interface GlassEmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: GlassEmptyStateAction
  compact?: boolean
  className?: string
  style?: React.CSSProperties
}

// ── Default icon ──────────────────────────────────────────────────────────────

function InboxIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassEmptyState({
  title,
  description,
  icon,
  action,
  compact = false,
  className,
  style,
}: GlassEmptyStateProps) {
  const isPrimary = !action?.variant || action.variant === "primary"

  return (
    <div
      className={clsx(
        "relative flex flex-col items-center text-center overflow-hidden border rounded-[20px]",
        compact ? "py-8 px-6" : "py-10 px-6",
        className
      )}
      style={{
        background: "var(--prv-g1)",
        borderColor: "var(--prv-border-subtle)",
        ...style,
      }}
    >
      {/* specular */}
      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)",
        }}
        aria-hidden="true"
      />

      {/* icon */}
      <div
        className={clsx(
          "flex items-center justify-center rounded-2xl border",
          compact ? "w-11 h-11 mb-3.5" : "w-[52px] h-[52px] mb-4"
        )}
        style={{
          background: "var(--prv-g2)",
          borderColor: "var(--prv-border-subtle)",
          color: "var(--prv-text-3)",
        }}
      >
        {icon ?? <InboxIcon />}
      </div>

      {/* title */}
      <p
        className={clsx("font-semibold", compact ? "text-[14px] mb-1" : "text-[15px] mb-1.5")}
        style={{ color: "var(--prv-text-1)" }}
      >
        {title}
      </p>

      {/* description */}
      {description && (
        <p
          className={clsx("leading-relaxed max-w-[200px]", compact ? "text-[11px]" : "text-[12px]")}
          style={{
            color: "var(--prv-text-3)",
            marginBottom: action ? (compact ? 16 : 20) : 0,
          }}
        >
          {description}
        </p>
      )}

      {/* action */}
      {action && (
        <button
          onClick={action.onClick}
          className={clsx(
            "flex items-center gap-1.5 rounded-full border font-semibold focus-visible:outline-none transition-[background,opacity] duration-150",
            compact ? "text-[12px] px-4 py-2" : "text-[13px] px-5 py-2.5"
          )}
          style={
            isPrimary
              ? {
                  background: "var(--prv-text-1)",
                  color: "var(--prv-bg)",
                  borderColor: "transparent",
                }
              : {
                  background: "var(--prv-g2)",
                  color: "var(--prv-text-2)",
                  borderColor: "var(--prv-border-subtle)",
                  boxShadow: "inset 0 1px 0 var(--prv-g2-spec)",
                }
          }
          onMouseEnter={(e) => {
            if (isPrimary) {
              e.currentTarget.style.opacity = "0.85"
            } else {
              e.currentTarget.style.background = "var(--prv-g3)"
            }
          }}
          onMouseLeave={(e) => {
            if (isPrimary) {
              e.currentTarget.style.opacity = "1"
            } else {
              e.currentTarget.style.background = "var(--prv-g2)"
            }
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
