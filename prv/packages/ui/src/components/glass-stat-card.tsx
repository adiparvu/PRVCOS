"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StatTrend {
  direction: "up" | "down" | "flat"
  value: string
}

export interface GlassStatCardProps {
  value: string | number
  label: string
  icon?: React.ReactNode
  trend?: StatTrend
  sparkline?: number[]
  wide?: boolean
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const trendStyles: Record<"up" | "down" | "flat", React.CSSProperties> = {
  up: {
    color: "rgba(48,209,88,0.9)",
    borderColor: "rgba(48,209,88,0.2)",
    background: "rgba(48,209,88,0.08)",
  },
  down: {
    color: "rgba(255,59,48,0.9)",
    borderColor: "rgba(255,59,48,0.2)",
    background: "rgba(255,59,48,0.08)",
  },
  flat: {
    color: "var(--prv-text-3)",
    borderColor: "var(--prv-border-subtle)",
    background: "var(--prv-g1)",
  },
}

const trendArrow: Record<"up" | "down" | "flat", string> = {
  up: "↑",
  down: "↓",
  flat: "→",
}

function TrendBadge({ trend }: { trend: StatTrend }) {
  return (
    <span
      className="flex items-center gap-[3px] text-[11px] font-semibold px-[7px] py-[3px] rounded-full border shrink-0"
      style={trendStyles[trend.direction]}
    >
      {trendArrow[trend.direction]} {trend.value}
    </span>
  )
}

function Sparkline({ data, height = 28 }: { data: number[]; height?: number }) {
  const sum = data.reduce((a, b) => a + b, 0)
  const median = sum / data.length
  return (
    <div className="flex items-end gap-[3px]" style={{ height, minWidth: 0 }} aria-hidden="true">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-[2px]"
          style={{
            height: `${Math.max(v * 100, 4)}%`,
            background: v > median ? "var(--prv-text-2)" : "var(--prv-border-subtle)",
            transition: "height 300ms cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      ))}
    </div>
  )
}

// ── GlassStatCard ─────────────────────────────────────────────────────────────

export function GlassStatCard({
  value,
  label,
  icon,
  trend,
  sparkline,
  wide = false,
  onClick,
  className,
  style,
}: GlassStatCardProps) {
  const isClickable = !!onClick

  return (
    <div
      className={clsx(
        "relative overflow-hidden border rounded-[20px]",
        "transition-[background,border-color,transform] duration-[250ms]",
        wide && "flex items-center gap-5",
        isClickable && "cursor-pointer focus-visible:outline-none",
        className
      )}
      style={{
        background: "var(--prv-g1)",
        borderColor: "var(--prv-border-subtle)",
        padding: wide ? "20px 24px" : "18px 20px",
        transitionTimingFunction: "cubic-bezier(0.4,0,0.2,1)",
        ...style,
      }}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
      onMouseEnter={
        isClickable
          ? (e) => {
              const el = e.currentTarget as HTMLDivElement
              el.style.background = "var(--prv-g2)"
              el.style.borderColor = "var(--prv-border)"
              el.style.transform = "translateY(-1px)"
            }
          : undefined
      }
      onMouseLeave={
        isClickable
          ? (e) => {
              const el = e.currentTarget as HTMLDivElement
              el.style.background = "var(--prv-g1)"
              el.style.borderColor = "var(--prv-border-subtle)"
              el.style.transform = "translateY(0)"
            }
          : undefined
      }
    >
      {/* specular top edge */}
      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent)",
        }}
        aria-hidden="true"
      />

      {/* ── standard (non-wide) layout ── */}
      {!wide && (
        <>
          <div className="flex items-center justify-between mb-3.5">
            {icon ? (
              <div
                className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center border"
                style={{
                  background: "var(--prv-g2)",
                  borderColor: "var(--prv-border-subtle)",
                  color: "var(--prv-text-2)",
                }}
              >
                {icon}
              </div>
            ) : (
              <div />
            )}
            {trend && <TrendBadge trend={trend} />}
          </div>
          <p
            className="text-[26px] font-bold leading-none"
            style={{ letterSpacing: "-0.02em", color: "var(--prv-text-1)" }}
          >
            {value}
          </p>
          <p className="text-[12px] mt-1" style={{ color: "var(--prv-text-3)" }}>
            {label}
          </p>
          {sparkline && sparkline.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Sparkline data={sparkline} height={28} />
            </div>
          )}
        </>
      )}

      {/* ── wide layout ── */}
      {wide && (
        <>
          {icon && (
            <div className="flex items-center justify-between shrink-0">
              <div
                className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center border"
                style={{
                  background: "var(--prv-g2)",
                  borderColor: "var(--prv-border-subtle)",
                  color: "var(--prv-text-2)",
                }}
              >
                {icon}
              </div>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-0.5">
              <p
                className="text-[22px] font-bold leading-none"
                style={{ letterSpacing: "-0.02em", color: "var(--prv-text-1)" }}
              >
                {value}
              </p>
              {trend && <TrendBadge trend={trend} />}
            </div>
            <p className="text-[12px] mt-1" style={{ color: "var(--prv-text-3)" }}>
              {label}
            </p>
          </div>
          {sparkline && sparkline.length > 0 && (
            <div style={{ flex: "0 0 120px" }}>
              <Sparkline data={sparkline} height={40} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
