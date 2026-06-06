"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GlassCarouselProps {
  /** Slides to render (each takes the full viewport width). */
  slides: React.ReactNode[]
  /** Controlled active index. */
  index?: number
  onChange?: (index: number) => void
  /** Auto-advance interval in ms. 0 / undefined disables it. */
  autoPlay?: number
  /** Wrap around at the ends. Default true. */
  loop?: boolean
  showDots?: boolean
  showArrows?: boolean
  /** Viewport height. */
  height?: number | string
  className?: string
  style?: React.CSSProperties
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassCarousel({
  slides,
  index: controlledIndex,
  onChange,
  autoPlay = 0,
  loop = true,
  showDots = true,
  showArrows = true,
  height = 220,
  className,
  style,
}: GlassCarouselProps) {
  const isControlled = controlledIndex !== undefined
  const [internal, setInternal] = useState(0)
  const active = isControlled ? controlledIndex : internal
  const count = slides.length
  const touchStartX = useRef<number | null>(null)

  const goTo = useCallback(
    (next: number) => {
      let target = next
      if (target < 0) target = loop ? count - 1 : 0
      else if (target >= count) target = loop ? 0 : count - 1
      if (!isControlled) setInternal(target)
      onChange?.(target)
    },
    [count, loop, isControlled, onChange]
  )

  // Auto-play
  useEffect(() => {
    if (!autoPlay || count <= 1) return
    const t = setInterval(() => goTo(active + 1), autoPlay)
    return () => clearInterval(t)
  }, [autoPlay, active, count, goTo])

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current
    if (Math.abs(dx) > 40) goTo(active + (dx < 0 ? 1 : -1))
    touchStartX.current = null
  }

  return (
    <div
      className={clsx("relative", className)}
      style={{ position: "relative", ...style }}
      role="region"
      aria-roledescription="carousel"
    >
      {/* Viewport */}
      <div
        style={{ overflow: "hidden", borderRadius: 16 }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          style={{
            display: "flex",
            transform: `translateX(-${active * 100}%)`,
            transition: "transform 420ms cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          {slides.map((slide, i) => (
            <div
              key={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={i !== active}
              style={{ flex: "0 0 100%", height }}
            >
              {slide}
            </div>
          ))}
        </div>
      </div>

      {/* Arrows */}
      {showArrows && count > 1 && (
        <>
          <CarouselArrow
            dir="prev"
            disabled={!loop && active === 0}
            onClick={() => goTo(active - 1)}
          />
          <CarouselArrow
            dir="next"
            disabled={!loop && active === count - 1}
            onClick={() => goTo(active + 1)}
          />
        </>
      )}

      {/* Dots */}
      {showDots && count > 1 && (
        <div
          style={{
            display: "flex",
            gap: 7,
            justifyContent: "center",
            marginTop: 16,
          }}
        >
          {slides.map((_, i) => {
            const isActive = i === active
            return (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                aria-current={isActive}
                onClick={() => goTo(i)}
                style={{
                  width: isActive ? 22 : 7,
                  height: 7,
                  borderRadius: 100,
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  background: isActive ? "var(--prv-text-1)" : "var(--prv-text-4)",
                  transition: "width 250ms, background 250ms",
                }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Arrow ─────────────────────────────────────────────────────────────────────

function CarouselArrow({
  dir,
  disabled,
  onClick,
}: {
  dir: "prev" | "next"
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={dir === "prev" ? "Previous slide" : "Next slide"}
      disabled={disabled}
      onClick={onClick}
      style={{
        position: "absolute",
        top: "50%",
        transform: "translateY(-50%)",
        [dir === "prev" ? "left" : "right"]: 12,
        width: 38,
        height: 38,
        borderRadius: "50%",
        background: "rgba(22,22,22,0.6)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid var(--prv-border)",
        color: "var(--prv-text-1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.35 : 1,
        zIndex: 2,
        transition: "background 150ms",
      }}
      onMouseEnter={(e) => {
        if (disabled) return
        ;(e.currentTarget as HTMLButtonElement).style.background = "rgba(40,40,40,0.8)"
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.background = "rgba(22,22,22,0.6)"
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        aria-hidden="true"
      >
        {dir === "prev" ? (
          <polyline points="15 18 9 12 15 6" />
        ) : (
          <polyline points="9 18 15 12 9 6" />
        )}
      </svg>
    </button>
  )
}
