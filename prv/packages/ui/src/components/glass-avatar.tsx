"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export type AvatarPresence = "online" | "away" | "busy" | "offline"
export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl"

interface SizeSpec {
  px: number
  font: number
  dot: number
}

const sizeMap: Record<AvatarSize, SizeSpec> = {
  xs: { px: 24, font: 9, dot: 7 },
  sm: { px: 32, font: 11, dot: 9 },
  md: { px: 40, font: 14, dot: 10 },
  lg: { px: 52, font: 18, dot: 13 },
  xl: { px: 64, font: 22, dot: 15 },
}

const presenceColor: Record<AvatarPresence, string> = {
  online: "#30d158",
  away: "#ff9500",
  busy: "#ff3b30",
  offline: "rgba(255,255,255,0.25)",
}

// ── GlassAvatar ───────────────────────────────────────────────────────────────

export interface GlassAvatarProps {
  initials?: string
  src?: string
  size?: AvatarSize
  presence?: AvatarPresence
  ring?: boolean
  alt?: string
  className?: string
  style?: React.CSSProperties
}

export function GlassAvatar({
  initials,
  src,
  size = "md",
  presence,
  ring = false,
  alt,
  className,
  style,
}: GlassAvatarProps) {
  const { px, font, dot } = sizeMap[size]

  return (
    <div
      className={clsx("relative inline-flex shrink-0", className)}
      style={{ width: px, height: px, ...style }}
      aria-label={alt ?? initials}
    >
      {/* avatar face */}
      <div
        className="w-full h-full rounded-full flex items-center justify-center overflow-hidden"
        style={{
          background: "var(--prv-g2)",
          border: ring ? "2px solid var(--prv-text-1)" : "1.5px solid var(--prv-border)",
          color: ring ? "var(--prv-text-1)" : "var(--prv-text-2)",
          fontSize: font,
          fontWeight: 700,
          letterSpacing: "-0.01em",
          userSelect: "none",
        }}
      >
        {src ? (
          <img src={src} alt={alt ?? initials ?? ""} className="w-full h-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {/* presence dot */}
      {presence && (
        <span
          className="absolute bottom-0 right-0 rounded-full pointer-events-none"
          style={{
            width: dot,
            height: dot,
            background: presenceColor[presence],
            border: "2px solid var(--prv-bg)",
          }}
          aria-label={presence}
        />
      )}
    </div>
  )
}

// ── GlassAvatarGroup ──────────────────────────────────────────────────────────

export interface GlassAvatarGroupProps {
  avatars: Omit<GlassAvatarProps, "size">[]
  max?: number
  size?: AvatarSize
  className?: string
}

export function GlassAvatarGroup({
  avatars,
  max = 3,
  size = "md",
  className,
}: GlassAvatarGroupProps) {
  const { px, font } = sizeMap[size]
  const visible = avatars.slice(0, max)
  const overflow = avatars.length - visible.length

  return (
    <div className={clsx("flex items-center", className)}>
      {visible.map((avatar, i) => (
        <div
          key={i}
          style={{
            marginLeft: i === 0 ? 0 : -10,
            zIndex: visible.length - i,
            borderRadius: "50%",
            // box-shadow ring creates the dark separation between stacked avatars
            boxShadow: "0 0 0 2px var(--prv-bg)",
          }}
        >
          <GlassAvatar {...avatar} size={size} />
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="rounded-full flex items-center justify-center shrink-0"
          style={{
            width: px,
            height: px,
            marginLeft: -10,
            background: "var(--prv-g2)",
            boxShadow: "0 0 0 2px var(--prv-bg)",
            fontSize: font - 2,
            fontWeight: 600,
            color: "var(--prv-text-2)",
          }}
          aria-label={`${overflow} more`}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}
