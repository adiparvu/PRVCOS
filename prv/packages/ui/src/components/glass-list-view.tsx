"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ListViewItem {
  id: string
  icon?: React.ReactNode
  title: string
  subtitle?: string
  value?: string
  badge?: React.ReactNode
  chevron?: boolean
  onClick?: () => void
}

export interface ListViewSection {
  label?: string
  items: ListViewItem[]
}

export interface GlassListViewProps {
  sections: ListViewSection[]
  onItemClick?: (id: string) => void
  size?: "sm" | "md"
  className?: string
  style?: React.CSSProperties
}

// ── Icon ─────────────────────────────────────────────────────────────────────

function ChevronRight() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      style={{ color: "var(--prv-text-4)", flexShrink: 0 }}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassListView({
  sections,
  onItemClick,
  size = "md",
  className,
  style,
}: GlassListViewProps) {
  const iconSize = size === "sm" ? 30 : 36
  const rowPad = size === "sm" ? "8px 14px" : "11px 16px"
  const titleSize = size === "sm" ? 13 : 14
  const subSize = size === "sm" ? 11 : 12
  const sectionPad = size === "sm" ? "8px 14px 4px" : "10px 16px 6px"

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
      {/* specular */}
      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)",
        }}
        aria-hidden="true"
      />

      {sections.map((section, si) => (
        <div key={si}>
          {section.label && (
            <div
              style={{
                padding: sectionPad,
                fontSize: 11,
                fontWeight: 600,
                color: "var(--prv-text-3)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              {section.label}
            </div>
          )}

          {section.items.map((item, ii) => {
            const isFirst = si === 0 && ii === 0 && !section.label
            const handleClick =
              item.onClick ?? (onItemClick ? () => onItemClick(item.id) : undefined)
            const isClickable = !!handleClick

            return (
              <div
                key={item.id}
                onClick={handleClick}
                className="flex items-center gap-3"
                style={{
                  padding: rowPad,
                  borderTop: isFirst ? "none" : "1px solid var(--prv-border-subtle)",
                  cursor: isClickable ? "pointer" : "default",
                  transition: "background 100ms",
                }}
                onMouseEnter={(e) => {
                  if (isClickable)
                    (e.currentTarget as HTMLDivElement).style.background = "var(--prv-g2)"
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLDivElement).style.background = "transparent"
                }}
              >
                {/* leading icon */}
                {item.icon !== undefined && (
                  <div
                    className="flex items-center justify-center border shrink-0"
                    style={{
                      width: iconSize,
                      height: iconSize,
                      borderRadius: size === "sm" ? 8 : 10,
                      background: "var(--prv-g2)",
                      borderColor: "var(--prv-border-subtle)",
                      color: "var(--prv-text-2)",
                    }}
                  >
                    {item.icon}
                  </div>
                )}

                {/* content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: titleSize,
                      fontWeight: 500,
                      color: "var(--prv-text-1)",
                      lineHeight: 1.3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.title}
                  </p>
                  {item.subtitle && (
                    <p
                      style={{
                        fontSize: subSize,
                        color: "var(--prv-text-3)",
                        marginTop: 1,
                        lineHeight: 1.3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.subtitle}
                    </p>
                  )}
                </div>

                {/* trailing */}
                {(item.value || item.badge) && (
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {item.value && (
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--prv-text-1)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.value}
                      </span>
                    )}
                    {item.badge && item.badge}
                  </div>
                )}

                {/* chevron */}
                {item.chevron && <ChevronRight />}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
