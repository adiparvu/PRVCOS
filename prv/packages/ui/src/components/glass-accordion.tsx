"use client"

import React, { useRef, useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AccordionItem {
  id: string
  title: string
  subtitle?: string
  icon?: React.ReactNode
  content: React.ReactNode
}

export interface GlassAccordionProps {
  items: AccordionItem[]
  defaultOpen?: string | string[]
  multiple?: boolean
  animated?: boolean
  onOpenChange?: (openIds: string[]) => void
  className?: string
  style?: React.CSSProperties
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ChevronIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function AccordionRow({
  item,
  isOpen,
  animated,
  onToggle,
}: {
  item: AccordionItem
  isOpen: boolean
  animated: boolean
  onToggle: () => void
}) {
  const bodyRef = useRef<HTMLDivElement>(null)

  return (
    <div
      style={{
        borderTop: "1px solid var(--prv-border-subtle)",
      }}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "16px 20px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
          transition: "background 120ms",
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background = "var(--prv-g2)"
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background = "transparent"
        }}
      >
        {item.icon && (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "var(--prv-g2)",
              border: "1px solid var(--prv-border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: "var(--prv-text-2)",
            }}
          >
            {item.icon}
          </div>
        )}

        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--prv-text-1)",
            }}
          >
            {item.title}
          </div>
          {item.subtitle && (
            <div
              style={{
                fontSize: 12,
                color: "var(--prv-text-3)",
                marginTop: 1,
              }}
            >
              {item.subtitle}
            </div>
          )}
        </div>

        <div
          style={{
            flexShrink: 0,
            color: "var(--prv-text-4)",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: animated ? "transform 320ms cubic-bezier(0.4,0,0.2,1)" : undefined,
          }}
        >
          <ChevronIcon />
        </div>
      </button>

      {/* Animated body */}
      <div
        ref={bodyRef}
        style={{
          overflow: "hidden",
          maxHeight: isOpen ? 400 : 0,
          transition: animated ? "max-height 380ms cubic-bezier(0.4,0,0.2,1)" : undefined,
        }}
      >
        <div
          style={{
            padding: `0 20px 20px ${item.icon ? 64 : 20}px`,
            fontSize: 13,
            color: "var(--prv-text-3)",
            lineHeight: 1.65,
          }}
        >
          {item.content}
        </div>
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassAccordion({
  items,
  defaultOpen,
  multiple = false,
  animated = true,
  onOpenChange,
  className,
  style,
}: GlassAccordionProps) {
  const toArray = (v: string | string[] | undefined): string[] => {
    if (!v) return []
    return Array.isArray(v) ? v : [v]
  }

  const [openIds, setOpenIds] = useState<string[]>(toArray(defaultOpen))

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      let next: string[]
      const isOpen = prev.includes(id)
      if (isOpen) {
        next = prev.filter((x) => x !== id)
      } else {
        next = multiple ? [...prev, id] : [id]
      }
      onOpenChange?.(next)
      return next
    })
  }

  return (
    <div
      className={clsx("relative overflow-hidden", className)}
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        borderRadius: 20,
        ...style,
      }}
    >
      {/* Top specular edge */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "0 0 auto",
          height: 1,
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.09),transparent)",
          pointerEvents: "none",
        }}
      />

      {items.map((item, index) => (
        <div key={item.id} style={index === 0 ? { borderTop: "none" } : undefined}>
          <AccordionRow
            item={item}
            isOpen={openIds.includes(item.id)}
            animated={animated}
            onToggle={() => toggle(item.id)}
          />
        </div>
      ))}
    </div>
  )
}
