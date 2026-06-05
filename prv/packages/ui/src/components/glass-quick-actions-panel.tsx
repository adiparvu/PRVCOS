"use client"

import React, { useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QAPAction {
  id: string
  label: string
  icon: React.ReactNode
}

export interface GlassQuickActionsPanelProps {
  actions: QAPAction[]
  onSelect: (id: string) => void
  open?: boolean
  onOpenChange?: (v: boolean) => void
  fabIcon?: React.ReactNode
  position?: "bottom-right" | "bottom-left"
  className?: string
}

// ── Default FAB icon ──────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="12" x2="12" y1="5" y2="19" />
      <line x1="5" x2="19" y1="12" y2="12" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassQuickActionsPanel({
  actions,
  onSelect,
  open: controlledOpen,
  onOpenChange,
  fabIcon,
  position = "bottom-right",
  className,
}: GlassQuickActionsPanelProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen

  const toggle = () => {
    const next = !isOpen
    setInternalOpen(next)
    onOpenChange?.(next)
  }

  const close = () => {
    setInternalOpen(false)
    onOpenChange?.(false)
  }

  const isRight = position === "bottom-right"

  return (
    <div className={clsx("absolute inset-0", className)} style={{ pointerEvents: "none" }}>
      {/* semi-transparent backdrop — dims content and closes on tap */}
      <div
        className="absolute inset-0 transition-colors duration-[250ms]"
        style={{
          background: isOpen ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0)",
          pointerEvents: isOpen ? "auto" : "none",
          transitionTimingFunction: "cubic-bezier(0.4,0,0.2,1)",
        }}
        onClick={close}
        aria-hidden="true"
      />

      {/* staggered action list above FAB */}
      <div
        className="absolute flex flex-col-reverse gap-2"
        style={{
          bottom: 88,
          ...(isRight ? { right: 20 } : { left: 20 }),
          alignItems: isRight ? "flex-end" : "flex-start",
          pointerEvents: "none",
        }}
        role="group"
        aria-label="Quick actions"
      >
        {actions.map((action, i) => (
          <div
            key={action.id}
            className="flex items-center gap-2.5"
            style={{
              flexDirection: isRight ? "row" : "row-reverse",
              opacity: isOpen ? 1 : 0,
              transform: isOpen ? "translateY(0) scale(1)" : "translateY(16px) scale(0.9)",
              transition: `opacity 220ms cubic-bezier(0.4,0,0.2,1) ${i * 40}ms, transform 280ms cubic-bezier(0.34,1.56,0.64,1) ${i * 40}ms`,
              pointerEvents: isOpen ? "auto" : "none",
            }}
          >
            {/* label bubble */}
            <span
              className="text-[12px] font-medium whitespace-nowrap px-3 py-1.5 rounded-full border backdrop-blur-[32px]"
              style={{
                background: "var(--prv-g3)",
                borderColor: "var(--prv-border)",
                color: "var(--prv-text-1)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 var(--prv-g3-spec)",
              }}
            >
              {action.label}
            </span>

            {/* icon button */}
            <button
              className="w-[42px] h-[42px] rounded-full flex items-center justify-center shrink-0 border backdrop-blur-[32px] transition-[background,transform] duration-200 focus-visible:outline-none"
              style={{
                background: "var(--prv-g2)",
                borderColor: "var(--prv-border)",
                color: "var(--prv-text-1)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 var(--prv-g2-spec)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--prv-g3)"
                e.currentTarget.style.transform = "scale(1.08)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--prv-g2)"
                e.currentTarget.style.transform = "scale(1)"
              }}
              onClick={(e) => {
                e.stopPropagation()
                onSelect(action.id)
                close()
              }}
              aria-label={action.label}
            >
              {action.icon}
            </button>
          </div>
        ))}
      </div>

      {/* FAB — always clickable */}
      <button
        className="absolute w-[52px] h-[52px] rounded-full flex items-center justify-center border backdrop-blur-[48px] backdrop-saturate-[180%] transition-[transform,background] duration-300 focus-visible:outline-none"
        style={{
          bottom: 20,
          ...(isRight ? { right: 20 } : { left: 20 }),
          background: "var(--prv-g3)",
          borderColor: "var(--prv-border)",
          color: "var(--prv-text-1)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.6), inset 0 1px 0 var(--prv-g3-spec)",
          transform: isOpen ? "rotate(45deg) scale(1.06)" : "rotate(0deg) scale(1)",
          transitionTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)",
          pointerEvents: "auto",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--prv-g4)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--prv-g3)")}
        onClick={(e) => {
          e.stopPropagation()
          toggle()
        }}
        aria-label={isOpen ? "Close quick actions" : "Open quick actions"}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {fabIcon ?? <PlusIcon />}
      </button>
    </div>
  )
}
