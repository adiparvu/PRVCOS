"use client"

import React, { useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export type TimelineEntryType = "info" | "success" | "warning" | "error"

export interface TimelineEntry {
  id: string
  type?: TimelineEntryType
  title: string
  description?: string
  timestamp: string
  actor?: { name: string; initials: string }
  icon?: React.ReactNode
}

export interface GlassTimelineProps {
  entries: TimelineEntry[]
  maxVisible?: number
  compact?: boolean
  onEntryClick?: (id: string) => void
  className?: string
  style?: React.CSSProperties
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const dotBg: Record<TimelineEntryType, string> = {
  info: "rgba(10,132,255,0.18)",
  success: "rgba(48,209,88,0.18)",
  warning: "rgba(255,149,0,0.18)",
  error: "rgba(255,59,48,0.18)",
}

const dotStroke: Record<TimelineEntryType, string> = {
  info: "rgba(10,132,255,0.85)",
  success: "rgba(48,209,88,0.85)",
  warning: "rgba(255,149,0,0.85)",
  error: "rgba(255,59,48,0.85)",
}

function DefaultDotIcon({ type }: { type?: TimelineEntryType }) {
  const t = type ?? "info"
  const stroke = dotStroke[t]

  if (t === "success") {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )
  }
  if (t === "warning") {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <line x1="12" y1="8" x2="12" y2="13" />
        <line x1="12" y1="16.5" x2="12.01" y2="16.5" />
      </svg>
    )
  }
  if (t === "error") {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    )
  }
  // info dot
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
      <circle cx="4" cy="4" r="3" fill={stroke} />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassTimeline({
  entries,
  maxVisible,
  compact = false,
  onEntryClick,
  className,
  style,
}: GlassTimelineProps) {
  const [expanded, setExpanded] = useState(false)

  const visible = maxVisible && !expanded ? entries.slice(0, maxVisible) : entries
  const hiddenCount = maxVisible ? entries.length - maxVisible : 0

  return (
    <div className={clsx("flex flex-col", className)} style={style}>
      {visible.map((entry, i) => {
        const isLast = i === visible.length - 1 && (expanded || !hiddenCount)
        const t = entry.type ?? "info"
        const clickable = !!onEntryClick

        return (
          <div key={entry.id} className="flex gap-3">
            {/* spine column */}
            <div className="flex flex-col items-center" style={{ width: 28, flexShrink: 0 }}>
              {/* dot */}
              <div
                className="flex items-center justify-center rounded-full border"
                style={{
                  width: 28,
                  height: 28,
                  background: dotBg[t],
                  borderColor: dotStroke[t].replace("0.85", "0.3"),
                  flexShrink: 0,
                }}
              >
                {entry.icon ?? <DefaultDotIcon type={entry.type} />}
              </div>

              {/* connector */}
              {!isLast && (
                <div
                  style={{
                    width: 1,
                    flex: 1,
                    background: "var(--prv-border-subtle)",
                    marginTop: 4,
                    minHeight: compact ? 12 : 16,
                  }}
                />
              )}
            </div>

            {/* card */}
            <div
              className={clsx(
                "relative flex-1 overflow-hidden border rounded-2xl",
                compact ? "mb-3 p-3" : "mb-5 p-4",
                clickable && "cursor-pointer transition-transform duration-150"
              )}
              style={{
                background: "var(--prv-g1)",
                borderColor: "var(--prv-border-subtle)",
              }}
              onClick={() => onEntryClick?.(entry.id)}
              onMouseEnter={(e) => {
                if (clickable) {
                  ;(e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"
                  ;(e.currentTarget as HTMLDivElement).style.background = "var(--prv-g2)"
                }
              }}
              onMouseLeave={(e) => {
                if (clickable) {
                  ;(e.currentTarget as HTMLDivElement).style.transform = ""
                  ;(e.currentTarget as HTMLDivElement).style.background = "var(--prv-g1)"
                }
              }}
            >
              {/* specular */}
              <div
                className="absolute inset-x-0 top-0 h-px pointer-events-none"
                style={{
                  background:
                    "linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)",
                }}
                aria-hidden="true"
              />

              {/* header row */}
              <div className="flex items-start justify-between gap-2">
                <p
                  style={{
                    fontSize: compact ? 13 : 14,
                    fontWeight: 600,
                    color: "var(--prv-text-1)",
                    lineHeight: 1.3,
                  }}
                >
                  {entry.title}
                </p>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--prv-text-4)",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    paddingTop: 1,
                  }}
                >
                  {entry.timestamp}
                </span>
              </div>

              {/* description */}
              {entry.description && (
                <p
                  style={{
                    fontSize: compact ? 12 : 13,
                    color: "var(--prv-text-3)",
                    lineHeight: 1.45,
                    marginTop: 4,
                  }}
                >
                  {entry.description}
                </p>
              )}

              {/* actor */}
              {entry.actor && (
                <div className="flex items-center gap-1.5" style={{ marginTop: compact ? 6 : 8 }}>
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: 16,
                      height: 16,
                      background: "var(--prv-g3)",
                      fontSize: 8,
                      fontWeight: 700,
                      color: "var(--prv-text-2)",
                    }}
                  >
                    {entry.actor.initials}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--prv-text-3)" }}>
                    {entry.actor.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* show more */}
      {hiddenCount > 0 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="self-start flex items-center gap-1.5 rounded-full border font-medium focus-visible:outline-none"
          style={{
            marginLeft: 36,
            padding: "6px 14px",
            fontSize: 12,
            background: "var(--prv-g2)",
            borderColor: "var(--prv-border-subtle)",
            color: "var(--prv-text-2)",
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "background 150ms",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--prv-g3)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--prv-g2)"
          }}
        >
          Show {hiddenCount} more
        </button>
      )}
    </div>
  )
}
