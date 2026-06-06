"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PricingFeature {
  label: string
  /** false renders the feature as excluded (×, muted). Default true. */
  included?: boolean
}

export interface PricingPlan {
  name: string
  /** Price string (e.g. "€49", "€0", "Custom"). */
  price: string
  /** Suffix after the price (e.g. "/user/mo"). */
  period?: string
  description?: string
  features: PricingFeature[]
  /** Highlight as the featured plan. */
  featured?: boolean
  /** Badge text for the featured plan. */
  badge?: string
  /** CTA button label. */
  cta: string
}

export interface GlassPricingTableProps {
  plans: PricingPlan[]
  onSelect?: (plan: PricingPlan) => void
  className?: string
  style?: React.CSSProperties
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function Check() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      aria-hidden="true"
      style={{ flexShrink: 0, marginTop: 1 }}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function Cross() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      aria-hidden="true"
      style={{ flexShrink: 0, marginTop: 1 }}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassPricingTable({ plans, onSelect, className, style }: GlassPricingTableProps) {
  return (
    <div
      className={clsx(className)}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${plans.length}, minmax(0, 1fr))`,
        gap: 16,
        ...style,
      }}
    >
      {plans.map((plan, i) => (
        <div
          key={i}
          style={{
            padding: 24,
            borderRadius: 18,
            position: "relative",
            display: "flex",
            flexDirection: "column",
            border: `1px solid ${plan.featured ? "var(--prv-accent, rgba(10,132,255,0.9))" : "var(--prv-border-subtle)"}`,
            background: plan.featured
              ? "linear-gradient(180deg, rgba(10,132,255,0.08), var(--prv-g1))"
              : "var(--prv-g1)",
          }}
        >
          {plan.featured && plan.badge && (
            <span
              style={{
                position: "absolute",
                top: -11,
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: 10,
                fontWeight: 700,
                padding: "4px 12px",
                borderRadius: 100,
                background: "var(--prv-accent, rgba(10,132,255,0.9))",
                color: "#fff",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                whiteSpace: "nowrap",
              }}
            >
              {plan.badge}
            </span>
          )}

          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--prv-text-2)" }}>
            {plan.name}
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              margin: "10px 0 2px",
              color: "var(--prv-text-1)",
            }}
          >
            {plan.price}
            {plan.period && (
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--prv-text-3)" }}>
                {plan.period}
              </span>
            )}
          </div>
          {plan.description && (
            <div style={{ fontSize: 12, color: "var(--prv-text-3)", marginBottom: 18 }}>
              {plan.description}
            </div>
          )}

          <ul
            style={{
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              margin: 0,
              padding: 0,
              marginBottom: 22,
              flex: 1,
            }}
          >
            {plan.features.map((f, j) => {
              const included = f.included !== false
              return (
                <li
                  key={j}
                  style={{
                    fontSize: 13,
                    color: included ? "var(--prv-text-2)" : "var(--prv-text-4)",
                    display: "flex",
                    gap: 9,
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    style={{
                      color: included
                        ? "var(--prv-green, rgba(48,209,88,0.95))"
                        : "var(--prv-text-4)",
                    }}
                  >
                    {included ? <Check /> : <Cross />}
                  </span>
                  {f.label}
                </li>
              )
            })}
          </ul>

          <button
            type="button"
            onClick={() => onSelect?.(plan)}
            style={{
              width: "100%",
              padding: "13px 0",
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              border: plan.featured ? "1px solid transparent" : "1px solid var(--prv-border)",
              background: plan.featured ? "var(--prv-text-1)" : "var(--prv-g2)",
              color: plan.featured ? "#000" : "var(--prv-text-1)",
            }}
          >
            {plan.cta}
          </button>
        </div>
      ))}
    </div>
  )
}
