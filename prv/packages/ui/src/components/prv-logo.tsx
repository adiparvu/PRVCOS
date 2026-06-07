import type { CSSProperties } from "react"

// ── PRV Mark ──────────────────────────────────────────────────────────────────
// Compound SVG path with evenodd fill rule:
//   subpath 1 → outer P (filled)
//   subpath 2 → counter (hole)
//   subpath 3 → small square at upper-left of counter (re-fills through hole)
//
// ViewBox 52×80 — stem ≈ 35% of width, bowl covers top 57% of height.

export interface PRVMarkProps {
  size?: number
  color?: string
  className?: string
  style?: CSSProperties
}

export function PRVMark({ size = 32, color = "currentColor", className, style }: PRVMarkProps) {
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

export interface PRVLogoProps {
  height?: number
  color?: string
  gap?: number
  className?: string
  style?: CSSProperties
}

export function PRVLogo({
  height = 28,
  color = "currentColor",
  gap = 10,
  className,
  style,
}: PRVLogoProps) {
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

// ── PRV App Icon (solid square with mark, iOS squircle corners) ────────────────

export interface PRVAppIconProps {
  size?: number
  dark?: boolean
  className?: string
  style?: CSSProperties
}

export function PRVAppIcon({ size = 56, dark = true, className, style }: PRVAppIconProps) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.22),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        backgroundColor: dark ? "#0d0d0d" : "#ffffff",
        boxShadow: dark
          ? "inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 24px rgba(0,0,0,0.5)"
          : "inset 0 -1px 0 rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.10)",
        ...style,
      }}
    >
      <PRVMark
        size={Math.round(size * 0.52)}
        color={dark ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.85)"}
      />
    </div>
  )
}

// ── PRV Avatar (circular, always dark — brand identity for chat / social) ──────

export interface PRVAvatarProps {
  size?: number
  className?: string
  style?: CSSProperties
}

export function PRVAvatar({ size = 40, className, style }: PRVAvatarProps) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        backgroundColor: "#1a1a1a",
        ...style,
      }}
    >
      <PRVMark size={Math.round(size * 0.5)} color="rgba(255,255,255,0.92)" />
    </div>
  )
}
