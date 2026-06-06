"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HeroAction {
  label: string
  onClick?: () => void
  variant?: "primary" | "ghost"
}

export interface GlassHeroProps {
  /** Headline. Wrap part of it in <span className="grad"> for the gradient effect, or pass `gradientText`. */
  title: React.ReactNode
  /** Small pill above the title. */
  eyebrow?: React.ReactNode
  description?: React.ReactNode
  actions?: HeroAction[]
  /** Trust/stat strings shown under the CTAs. */
  trust?: React.ReactNode[]
  align?: "center" | "left"
  className?: string
  style?: React.CSSProperties
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassHero({
  title,
  eyebrow,
  description,
  actions = [],
  trust = [],
  align = "center",
  className,
  style,
}: GlassHeroProps) {
  const centered = align === "center"

  return (
    <div
      className={clsx("relative overflow-hidden", className)}
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "64px 32px",
        textAlign: centered ? "center" : "left",
        borderRadius: 24,
        border: "1px solid var(--prv-border-subtle)",
        background:
          "radial-gradient(circle at 30% 0%, rgba(10,132,255,0.22), transparent 50%), radial-gradient(circle at 80% 100%, rgba(94,92,230,0.20), transparent 50%), var(--prv-g1)",
        ...style,
      }}
    >
      {eyebrow && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "5px 13px",
            borderRadius: 100,
            background: "var(--prv-g2)",
            border: "1px solid var(--prv-border-subtle)",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--prv-text-2)",
            marginBottom: 20,
          }}
        >
          {eyebrow}
        </div>
      )}

      <h1
        style={{
          fontSize: 42,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 1.05,
          maxWidth: 640,
          margin: centered ? "0 auto" : 0,
          color: "var(--prv-text-1)",
        }}
      >
        {title}
      </h1>

      {description && (
        <p
          style={{
            fontSize: 16,
            color: "var(--prv-text-2)",
            maxWidth: 520,
            margin: centered ? "18px auto 0" : "18px 0 0",
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
      )}

      {actions.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: centered ? "center" : "flex-start",
            marginTop: 30,
            flexWrap: "wrap",
          }}
        >
          {actions.map((a, i) => {
            const primary = a.variant !== "ghost"
            return (
              <button
                key={i}
                type="button"
                onClick={a.onClick}
                style={{
                  padding: "13px 26px",
                  borderRadius: 14,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  border: primary ? "1px solid transparent" : "1px solid var(--prv-border)",
                  background: primary ? "var(--prv-text-1)" : "var(--prv-g2)",
                  color: primary ? "#000" : "var(--prv-text-1)",
                }}
              >
                {a.label}
              </button>
            )
          })}
        </div>
      )}

      {trust.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 24,
            justifyContent: centered ? "center" : "flex-start",
            marginTop: 34,
            fontSize: 12,
            color: "var(--prv-text-3)",
            flexWrap: "wrap",
          }}
        >
          {trust.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
      )}
    </div>
  )
}
