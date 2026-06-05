"use client"

import React, { useState } from "react"
import { clsx } from "clsx"

export interface GlassExpandableCardProps {
  icon?: React.ReactNode
  title: string
  subtitle?: string
  badge?: React.ReactNode
  open?: boolean
  onOpenChange?: (v: boolean) => void
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function GlassExpandableCard({
  icon,
  title,
  subtitle,
  badge,
  open: controlledOpen,
  onOpenChange,
  children,
  className,
  style,
}: GlassExpandableCardProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen

  const toggle = () => {
    const next = !isOpen
    setInternalOpen(next)
    onOpenChange?.(next)
  }

  return (
    <div
      className={clsx(
        "relative rounded-[20px] overflow-hidden border cursor-pointer",
        "transition-[background,border-color] duration-[320ms]",
        className
      )}
      style={{
        background: isOpen ? "var(--prv-g2)" : "var(--prv-g1)",
        borderColor: isOpen ? "var(--prv-border)" : "var(--prv-border-subtle)",
        transitionTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)",
        ...style,
      }}
      onClick={toggle}
      role="button"
      aria-expanded={isOpen}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          toggle()
        }
      }}
    >
      {/* specular highlight */}
      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent)",
        }}
        aria-hidden="true"
      />

      {/* header */}
      <div className="flex items-center gap-3 p-4">
        {icon && (
          <div
            className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 border"
            style={{
              background: "var(--prv-g2)",
              borderColor: "var(--prv-border-subtle)",
              color: "var(--prv-text-2)",
            }}
          >
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold truncate" style={{ color: "var(--prv-text-1)" }}>
            {title}
          </p>
          {subtitle && (
            <p className="text-[12px] mt-0.5 truncate" style={{ color: "var(--prv-text-3)" }}>
              {subtitle}
            </p>
          )}
          {badge && <div className="mt-1">{badge}</div>}
        </div>

        {/* chevron */}
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 border"
          style={{
            background: isOpen ? "var(--prv-g2)" : "var(--prv-g1)",
            borderColor: "var(--prv-border-subtle)",
            color: "var(--prv-text-3)",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 300ms cubic-bezier(0.34,1.56,0.64,1), background 200ms",
          }}
          aria-hidden="true"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* body — CSS grid trick for smooth height animation to/from auto */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: isOpen ? "1fr" : "0fr",
          transition: "grid-template-rows 320ms cubic-bezier(0.4,0,0.2,1)",
        }}
        aria-hidden={!isOpen}
      >
        <div style={{ overflow: "hidden", minHeight: 0 }}>
          <div
            className="h-px mx-4"
            style={{ background: "var(--prv-border-subtle)" }}
            aria-hidden="true"
          />
          <div
            className="p-4 pt-3.5"
            style={{
              opacity: isOpen ? 1 : 0,
              transition: "opacity 220ms cubic-bezier(0.4,0,0.2,1)",
              transitionDelay: isOpen ? "60ms" : "0ms",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
