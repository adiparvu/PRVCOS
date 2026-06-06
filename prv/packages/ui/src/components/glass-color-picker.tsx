"use client"

import React, { useRef } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GlassColorPickerProps {
  /** Selected color as a hex string (e.g. "#0A84FF"). */
  value: string
  onChange: (hex: string) => void
  /** Palette swatches. Defaults to the Apple system palette. */
  swatches?: string[]
  /** Show the draggable hue strip. */
  showHue?: boolean
  /** Show the hex text input. */
  showHex?: boolean
  /** Show the large live preview block. */
  showPreview?: boolean
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_SWATCHES = [
  "#0A84FF",
  "#30D158",
  "#FF9F0A",
  "#FF375F",
  "#BF5AF2",
  "#64D2FF",
  "#FFD60A",
  "#FF453A",
  "#5E5CE6",
  "#AC8E68",
  "#98989D",
  "#FFFFFF",
  "#1C1C1E",
  "#8E8E93",
  "#00C7BE",
  "#FF6482",
]

// ── Color helpers ─────────────────────────────────────────────────────────────

function normalizeHex(input: string): string | null {
  const cleaned = input.replace(/[^0-9a-fA-F]/g, "")
  if (cleaned.length === 6) return `#${cleaned.toUpperCase()}`
  if (cleaned.length === 3) {
    const [r, g, b] = cleaned.split("")
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase()
  }
  return null
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const toHex = (x: number) =>
    Math.round(255 * x)
      .toString(16)
      .padStart(2, "0")
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`.toUpperCase()
}

function hexToHue(hex: string): number {
  const m = normalizeHex(hex)
  if (!m) return 0
  const r = parseInt(m.slice(1, 3), 16) / 255
  const g = parseInt(m.slice(3, 5), 16) / 255
  const b = parseInt(m.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  if (d === 0) return 0
  let h = 0
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h = Math.round(h * 60)
  return h < 0 ? h + 360 : h
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassColorPicker({
  value,
  onChange,
  swatches = DEFAULT_SWATCHES,
  showHue = true,
  showHex = true,
  showPreview = true,
  disabled = false,
  className,
  style,
}: GlassColorPickerProps) {
  const hueRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const normalized = (normalizeHex(value) ?? "#000000").toUpperCase()
  const huePct = (hexToHue(normalized) / 360) * 100

  const pickFromHue = (clientX: number) => {
    const el = hueRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (clientX - r.left) / r.width))
    onChange(hslToHex(Math.round(pct * 360), 90, 55))
  }

  return (
    <div
      className={clsx(className)}
      style={{
        display: "flex",
        gap: 28,
        flexWrap: "wrap",
        alignItems: "flex-start",
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? "none" : "auto",
        ...style,
      }}
    >
      {/* Swatch grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(8, 1fr)",
          gap: 10,
          maxWidth: 340,
        }}
      >
        {swatches.map((c) => {
          const selected = c.toUpperCase() === normalized
          return (
            <button
              key={c}
              type="button"
              aria-label={c}
              aria-pressed={selected}
              onClick={() => onChange(c.toUpperCase())}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                cursor: "pointer",
                background: c,
                border: selected ? "2px solid #fff" : "2px solid transparent",
                boxShadow: selected ? "0 0 0 2px rgba(0,0,0,0.6)" : undefined,
                position: "relative",
                transition: "transform 150ms cubic-bezier(0.34,1.56,0.64,1)",
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.transform = "scale(1.12)"
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"
              }}
            >
              {selected && (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                    textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                  }}
                >
                  ✓
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Side panel */}
      {(showPreview || showHue || showHex) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {showPreview && (
            <div
              aria-hidden="true"
              style={{
                width: 120,
                height: 120,
                borderRadius: 18,
                background: normalized,
                border: "1px solid var(--prv-border)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
              }}
            />
          )}

          {showHue && (
            <div
              ref={hueRef}
              role="slider"
              aria-label="Hue"
              aria-valuenow={hexToHue(normalized)}
              aria-valuemin={0}
              aria-valuemax={360}
              onMouseDown={(e) => {
                dragging.current = true
                pickFromHue(e.clientX)
              }}
              onMouseMove={(e) => dragging.current && pickFromHue(e.clientX)}
              onMouseUp={() => (dragging.current = false)}
              onMouseLeave={() => (dragging.current = false)}
              style={{
                width: 220,
                height: 14,
                borderRadius: 100,
                background: "linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)",
                position: "relative",
                cursor: "pointer",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: "50%",
                  left: `${huePct}%`,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "#fff",
                  border: "2px solid rgba(0,0,0,0.3)",
                  transform: "translate(-50%,-50%)",
                  pointerEvents: "none",
                }}
              />
            </div>
          )}

          {showHex && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: "var(--prv-text-3)" }}>#</span>
              <input
                value={normalized.replace("#", "")}
                maxLength={6}
                onChange={(e) => {
                  const hex = normalizeHex(e.target.value)
                  if (hex) onChange(hex)
                }}
                style={{
                  width: 110,
                  padding: "9px 12px",
                  borderRadius: 10,
                  background: "var(--prv-g2)",
                  border: "1px solid var(--prv-border)",
                  color: "var(--prv-text-1)",
                  fontSize: 13,
                  fontFamily: '"SF Mono", monospace',
                  outline: "none",
                  textTransform: "uppercase",
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
