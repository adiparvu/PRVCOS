"use client"

import React, { useLayoutEffect, useRef, useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TabItem {
  value: string
  label: string
  icon?: React.ReactNode
  badge?: string | number
  content?: React.ReactNode
}

export type TabVariant = "pill" | "underline"

export interface GlassTabsProps {
  tabs: TabItem[]
  defaultValue?: string
  value?: string
  onChange?: (value: string) => void
  variant?: TabVariant
  animated?: boolean
  className?: string
  style?: React.CSSProperties
}

// ── CSS ───────────────────────────────────────────────────────────────────────

const TABS_CSS = `@keyframes prvTabFade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassTabs({
  tabs,
  defaultValue,
  value: controlledValue,
  onChange,
  variant = "pill",
  animated = true,
  className,
  style,
}: GlassTabsProps) {
  const isControlled = controlledValue !== undefined
  const [internal, setInternal] = useState<string>(defaultValue ?? tabs[0]?.value ?? "")
  const active = isControlled ? controlledValue : internal

  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([])
  const stripRef = useRef<HTMLDivElement>(null)

  const measure = () => {
    const idx = tabs.findIndex((t) => t.value === active)
    const btn = btnRefs.current[idx]
    if (btn) setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth })
  }

  useLayoutEffect(() => {
    measure()
  }, [active, tabs]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-measure on container resize
  useLayoutEffect(() => {
    const strip = stripRef.current
    if (!strip || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(measure)
    ro.observe(strip)
    return () => ro.disconnect()
  }, [active, tabs]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (v: string) => {
    if (!isControlled) setInternal(v)
    onChange?.(v)
  }

  const isPill = variant === "pill"
  const activeTab = tabs.find((t) => t.value === active)
  const hasContent = tabs.some((t) => t.content !== undefined)

  return (
    <div
      className={clsx("relative overflow-hidden border", className)}
      style={{
        borderRadius: 20,
        background: "var(--prv-g1)",
        borderColor: "var(--prv-border-subtle)",
        ...style,
      }}
    >
      {animated && <style>{TABS_CSS}</style>}
      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)",
        }}
        aria-hidden="true"
      />

      {/* Tab strip wrapper */}
      <div style={{ padding: isPill ? "12px 12px 0" : "0 0 0" }}>
        <div
          ref={stripRef}
          role="tablist"
          style={{
            display: "flex",
            alignItems: "center",
            gap: isPill ? 2 : 0,
            position: "relative",
            ...(isPill
              ? {
                  padding: 4,
                  background: "var(--prv-g2)",
                  borderRadius: 14,
                  border: "1px solid var(--prv-border-subtle)",
                }
              : {
                  borderBottom: "1px solid var(--prv-border-subtle)",
                }),
          }}
        >
          {/* Sliding indicator */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              pointerEvents: "none",
              left: indicator.left,
              width: indicator.width,
              transition: animated
                ? "left 280ms cubic-bezier(0.34,1.56,0.64,1), width 220ms cubic-bezier(0.4,0,0.2,1)"
                : undefined,
              ...(isPill
                ? {
                    top: 4,
                    height: "calc(100% - 8px)",
                    background: "var(--prv-g3)",
                    borderRadius: 10,
                    border: "1px solid var(--prv-border)",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                  }
                : {
                    bottom: -1,
                    height: 2,
                    background: "var(--prv-text-1)",
                    borderRadius: "2px 2px 0 0",
                  }),
            }}
          />

          {tabs.map((tab, i) => {
            const isActive = tab.value === active
            return (
              <button
                key={tab.value}
                ref={(el) => {
                  btnRefs.current[i] = el
                }}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => handleSelect(tab.value)}
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: isPill ? "8px 16px" : "10px 16px 12px",
                  borderRadius: isPill ? 10 : 0,
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  fontFamily: "inherit",
                  color: isActive ? "var(--prv-text-1)" : "var(--prv-text-3)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  transition: "color 180ms",
                  whiteSpace: "nowrap",
                }}
              >
                {tab.icon && (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexShrink: 0,
                      opacity: isActive ? 1 : 0.65,
                      transition: "opacity 180ms",
                    }}
                  >
                    {tab.icon}
                  </span>
                )}
                {tab.label}
                {tab.badge !== undefined && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 18,
                      height: 16,
                      borderRadius: 8,
                      background: isActive ? "var(--prv-g3)" : "var(--prv-g2)",
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--prv-text-2)",
                      padding: "0 5px",
                      flexShrink: 0,
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content panel */}
      {hasContent && activeTab?.content !== undefined && (
        <div
          key={active}
          role="tabpanel"
          style={{
            padding: 20,
            animation: animated ? "prvTabFade 200ms ease" : undefined,
          }}
        >
          {activeTab.content}
        </div>
      )}
    </div>
  )
}
