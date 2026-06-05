"use client"

import React from "react"
import { clsx } from "clsx"

export interface GlassTabItem {
  id: string
  label: string
  icon: React.ReactNode
  badge?: boolean | number
}

export interface GlassTabBarProps {
  items: GlassTabItem[]
  activeId: string
  onChange: (id: string) => void
  className?: string
  style?: React.CSSProperties
}

export function GlassTabBar({ items, activeId, onChange, className, style }: GlassTabBarProps) {
  return (
    <nav
      role="tablist"
      aria-label="Navigation"
      className={clsx(
        "flex items-center gap-1 px-2.5 py-2",
        "border rounded-[100px]",
        "backdrop-blur-[48px] backdrop-saturate-[180%]",
        className
      )}
      style={{
        background: "var(--prv-g3)",
        borderColor: "var(--prv-border)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 var(--prv-g3-spec)",
        ...style,
      }}
    >
      {items.map((item) => {
        const active = item.id === activeId
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={clsx(
              "relative flex flex-col items-center gap-[3px] px-3 py-2 min-w-[48px]",
              "rounded-[100px] transition-all duration-[300ms]",
              "focus-visible:outline-none",
              active
                ? "bg-[rgba(255,255,255,0.14)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                : ""
            )}
            style={{ transitionTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)" }}
          >
            {/* Badge dot */}
            {item.badge && (
              <span
                className="absolute top-[5px] right-[6px] w-[6px] h-[6px] rounded-full border-[1.5px]"
                style={{ background: "var(--prv-text-1)", borderColor: "var(--prv-bg)" }}
                aria-hidden="true"
              />
            )}

            {/* Icon */}
            <span
              className="flex items-center justify-center w-[22px] h-[22px] transition-transform duration-[300ms]"
              style={{
                color: active ? "var(--prv-text-1)" : "var(--prv-text-3)",
                transitionTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)",
                transform: active ? "scale(1.1)" : "scale(1)",
              }}
              aria-hidden="true"
            >
              {item.icon}
            </span>

            {/* Label */}
            <span
              className="text-[9px] font-medium leading-none tracking-[0.01em]"
              style={{ color: active ? "var(--prv-text-1)" : "var(--prv-text-3)" }}
            >
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
