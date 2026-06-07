import type { CSSProperties } from "react"

// ── PRV Mark ──────────────────────────────────────────────────────────────────
// Bold geometric P with a small filled square inside the upper counter.
// fillRule="evenodd" compound path:
//   subpath 1 → outer P (filled)
//   subpath 2 → inner counter (hole)
//   subpath 3 → square in upper counter (re-fills through the hole)

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
      width={Math.round(size * 0.7)}
      height={size}
      viewBox="0 0 56 80"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 0H36Q56 0 56 22Q56 44 36 44H12V80H0Z M12 12H32Q44 12 44 22Q44 32 32 32H12Z M12 12H24V24H12Z"
      />
    </svg>
  )
}

// ── PRV Logo (mark + wordmark) ─────────────────────────────────────────────────

export function PRVLogo({
  height = 28,
  color = "currentColor",
  gap = 9,
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
      <PRVMark size={Math.round(height * 0.86)} color={color} />
      <span
        style={{
          fontSize: Math.round(height * 0.82),
          fontWeight: 700,
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

// ── PRV App Icon (mark on glass square) ────────────────────────────────────────

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
        size={Math.round(size * 0.5)}
        color={dark ? "rgba(255,255,255,0.90)" : "rgba(0,0,0,0.82)"}
      />
    </div>
  )
}
