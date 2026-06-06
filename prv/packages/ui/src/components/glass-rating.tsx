"use client"

import React, { useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export type RatingSize = "sm" | "md" | "lg"

export interface GlassRatingProps {
  value: number
  onChange?: (value: number) => void
  /** Number of stars. Default 5. */
  max?: number
  size?: RatingSize
  /** Disable interaction; renders the value as-is (supports fractional fill). */
  readonly?: boolean
  /** Render fractional fill for read-only averages (e.g. 4.6). Interactive picks whole stars. */
  allowHalf?: boolean
  /** Show the numeric value next to the stars. */
  showValue?: boolean
  /** Review count appended after the stars (e.g. "318 reviews"). */
  count?: number | string
  className?: string
  style?: React.CSSProperties
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STAR_PX: Record<RatingSize, number> = { sm: 16, md: 24, lg: 30 }
const STAR_COLOR = "var(--prv-star, rgba(255,204,0,0.95))"
const EMPTY_COLOR = "var(--prv-text-4)"

function StarShape({ px }: { px: number }) {
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

/** A single star with a fractional fill (0–1) overlaid on an empty base. */
function Star({ px, fill }: { px: number; fill: number }) {
  const clamped = Math.max(0, Math.min(1, fill))
  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        width: px,
        height: px,
        color: EMPTY_COLOR,
      }}
    >
      <StarShape px={px} />
      {clamped > 0 && (
        <span
          style={{
            position: "absolute",
            inset: 0,
            width: `${clamped * 100}%`,
            overflow: "hidden",
            color: STAR_COLOR,
            display: "inline-flex",
          }}
        >
          <StarShape px={px} />
        </span>
      )}
    </span>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassRating({
  value,
  onChange,
  max = 5,
  size = "md",
  readonly = false,
  allowHalf = false,
  showValue = false,
  count,
  className,
  style,
}: GlassRatingProps) {
  const [hover, setHover] = useState<number | null>(null)
  const px = STAR_PX[size]
  const interactive = !readonly && !!onChange

  // While hovering, preview whole stars; otherwise show the actual value.
  const display = hover ?? value

  const fillFor = (index: number): number => {
    // index is 1-based star position
    if (hover !== null) return index <= hover ? 1 : 0
    if (allowHalf) return Math.max(0, Math.min(1, value - (index - 1)))
    return index <= Math.round(value) ? 1 : 0
  }

  return (
    <span
      className={clsx(className)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        ...style,
      }}
    >
      <span
        role={interactive ? "slider" : "img"}
        aria-label={`Rating: ${value} out of ${max}`}
        aria-valuenow={interactive ? value : undefined}
        aria-valuemin={interactive ? 0 : undefined}
        aria-valuemax={interactive ? max : undefined}
        style={{ display: "inline-flex", gap: 4 }}
        onMouseLeave={() => interactive && setHover(null)}
      >
        {Array.from({ length: max }, (_, i) => i + 1).map((idx) => (
          <span
            key={idx}
            role={interactive ? "button" : undefined}
            aria-label={interactive ? `Rate ${idx}` : undefined}
            onMouseEnter={() => interactive && setHover(idx)}
            onClick={() => interactive && onChange?.(idx)}
            style={{
              cursor: interactive ? "pointer" : "default",
              display: "inline-flex",
              transform: interactive && hover === idx ? "scale(1.18)" : "scale(1)",
              transition: "transform 150ms cubic-bezier(0.34,1.56,0.64,1), color 150ms",
            }}
          >
            <Star px={px} fill={fillFor(idx)} />
          </span>
        ))}
      </span>

      {showValue && (
        <span
          style={{
            fontSize: size === "sm" ? 12 : 13,
            color: "var(--prv-text-2)",
            fontWeight: 600,
          }}
        >
          {Number(display).toFixed(1)}
        </span>
      )}

      {count !== undefined && (
        <span style={{ fontSize: 12, color: "var(--prv-text-3)" }}>
          · {typeof count === "number" ? `${count} reviews` : count}
        </span>
      )}
    </span>
  )
}
