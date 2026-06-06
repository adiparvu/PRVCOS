"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GlassTestimonialProps {
  quote: React.ReactNode
  author: string
  role?: string
  /** Avatar node, or short initials rendered on a gradient. */
  avatar?: React.ReactNode
  /** Background for the initials avatar. */
  avatarColor?: string
  /** Star rating 0–5. Omit to hide stars. */
  rating?: number
  className?: string
  style?: React.CSSProperties
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassTestimonial({
  quote,
  author,
  role,
  avatar,
  avatarColor = "linear-gradient(135deg,#0A84FF,#5E5CE6)",
  rating,
  className,
  style,
}: GlassTestimonialProps) {
  const stars = rating !== undefined ? Math.max(0, Math.min(5, Math.round(rating))) : null

  return (
    <figure
      className={clsx("relative", className)}
      style={{
        padding: 22,
        borderRadius: 18,
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        position: "relative",
        margin: 0,
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
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)",
          pointerEvents: "none",
        }}
      />

      {stars !== null && (
        <div
          aria-label={`${stars} out of 5 stars`}
          style={{
            color: "var(--prv-star, rgba(255,204,0,0.95))",
            fontSize: 14,
            letterSpacing: 2,
            marginBottom: 12,
          }}
        >
          {"★".repeat(stars)}
          <span style={{ color: "var(--prv-text-4)" }}>{"★".repeat(5 - stars)}</span>
        </div>
      )}

      <blockquote
        style={{
          fontSize: 15,
          lineHeight: 1.6,
          color: "var(--prv-text-1)",
          marginBottom: 18,
          margin: "0 0 18px",
        }}
      >
        {quote}
      </blockquote>

      <figcaption style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
            color: "#fff",
            background: avatarColor,
            flexShrink: 0,
          }}
        >
          {avatar}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--prv-text-1)" }}>{author}</div>
          {role && <div style={{ fontSize: 12, color: "var(--prv-text-3)" }}>{role}</div>}
        </div>
      </figcaption>
    </figure>
  )
}
