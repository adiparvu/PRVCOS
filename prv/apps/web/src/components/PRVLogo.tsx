import type { CSSProperties } from "react"

// ── PRV Mark ──────────────────────────────────────────────────────────────────
// Bold geometric P with a small filled square in the upper-left of the counter.
// fillRule="evenodd" compound path:
//   subpath 1 → outer P (filled)
//   subpath 2 → inner counter (creates hole)
//   subpath 3 → small square at upper-left of counter (re-fills through hole)
//
// ViewBox 52×80 — stem ≈ 35% width, bowl spans top 57% of height.
// Square is flush against the inner-left wall (stem) at the top of the counter.

export function PRVMark({
  size = 32,
  color = "currentColor",
  className,
  style,
}: {
  size?: number
  color?: string
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg
      width={Math.round(size * 0.65)}
      height={size}
      viewBox="0 0 52 80"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 0H36Q52 0 52 23Q52 46 36 46H18V80H0Z M18 12H32Q42 12 42 23Q42 34 32 34H18Z M18 12H30V24H18Z"
      />
    </svg>
  )
}

// ── PRV Logo (mark + wordmark) ─────────────────────────────────────────────────

export function PRVLogo({
  height = 28,
  color = "currentColor",
  gap = 10,
  className,
  style,
}: {
  height?: number
  color?: string
  gap?: number
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap, color, ...style }}
    >
      <PRVMark size={Math.round(height * 0.88)} color={color} />
      <span
        style={{
          fontSize: Math.round(height * 0.85),
          fontWeight: 800,
          letterSpacing: "-0.04em",
          lineHeight: 1,
          color,
        }}
      >
        PRV
      </span>
    </div>
  )
}

// ── PRV App Icon (mark on glass square, used on auth pages / splash) ───────────

export function PRVAppIcon({
  size = 56,
  dark = true,
  className,
  style,
}: {
  size?: number
  dark?: boolean
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.32),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        border: dark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.10)",
        boxShadow: dark
          ? "inset 0 1px 0 rgba(255,255,255,0.20), 0 12px 32px rgba(0,0,0,0.6)"
          : "inset 0 -1px 0 rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.12)",
        ...style,
      }}
    >
      <PRVMark
        size={Math.round(size * 0.52)}
        color={dark ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.82)"}
      />
    </div>
  )
}
