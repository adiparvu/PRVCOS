"use client"

import React from "react"
import { clsx } from "clsx"
import { GlassTabBar } from "./glass-tab-bar"
import type { GlassTabItem } from "./glass-tab-bar"

export interface NavigationShellProps {
  tabs: GlassTabItem[]
  activeTabId: string
  onTabChange: (id: string) => void
  title?: string
  onBack?: () => void
  headerActions?: React.ReactNode
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function NavigationShell({
  tabs,
  activeTabId,
  onTabChange,
  title,
  onBack,
  headerActions,
  children,
  className,
  style,
}: NavigationShellProps) {
  const hasHeader = !!title || !!onBack || !!headerActions

  return (
    <div
      className={clsx("relative overflow-hidden", className)}
      style={{ background: "var(--prv-bg)", ...style }}
    >
      {/* ── Floating Header ── */}
      {hasHeader && (
        <div
          className={clsx(
            "absolute top-3.5 left-3.5 right-3.5 z-20",
            "flex items-center gap-2.5 px-4 py-2.5",
            "border rounded-[100px]",
            "backdrop-blur-[48px] backdrop-saturate-[180%]"
          )}
          style={{
            background: "var(--prv-g2)",
            borderColor: "var(--prv-border)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 var(--prv-g2-spec)",
          }}
        >
          {onBack && (
            <button
              onClick={onBack}
              className={clsx(
                "flex items-center justify-center w-7 h-7 rounded-full shrink-0",
                "border transition-colors duration-150 focus-visible:outline-none"
              )}
              style={{
                background: "var(--prv-g1)",
                borderColor: "var(--prv-border-subtle)",
                color: "var(--prv-text-2)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--prv-g2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--prv-g1)")}
              aria-label="Back"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}

          {title && (
            <h1
              className="flex-1 text-[15px] font-semibold truncate"
              style={{ color: "var(--prv-text-1)" }}
            >
              {title}
            </h1>
          )}

          {!title && <div className="flex-1" />}

          {headerActions && (
            <div className="flex items-center gap-1.5 shrink-0">{headerActions}</div>
          )}
        </div>
      )}

      {/* ── Scrollable Content ── */}
      <div
        className="absolute inset-0 overflow-y-auto"
        style={{
          paddingTop: hasHeader ? 72 : 0,
          paddingBottom: 96,
        }}
      >
        {children}
      </div>

      {/* ── Floating Tab Bar ── */}
      <div className="absolute bottom-3.5 left-0 right-0 flex justify-center z-20 pointer-events-none">
        <div className="pointer-events-auto">
          <GlassTabBar items={tabs} activeId={activeTabId} onChange={onTabChange} />
        </div>
      </div>
    </div>
  )
}

// ── HeaderIconButton — convenience button for headerActions ───────────────────

export interface HeaderIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string
}

export function HeaderIconButton({ children, className, ...props }: HeaderIconButtonProps) {
  return (
    <button
      className={clsx(
        "flex items-center justify-center w-7 h-7 rounded-full",
        "border transition-colors duration-150 focus-visible:outline-none",
        className
      )}
      style={{
        background: "var(--prv-g1)",
        borderColor: "var(--prv-border-subtle)",
        color: "var(--prv-text-2)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--prv-g2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "var(--prv-g1)")}
      {...props}
    >
      {children}
    </button>
  )
}
