import type { ReactNode } from "react"
import type { QuickAction } from "@/lib/quick-actions"
import Link from "next/link"

// ── Glass card primitives ─────────────────────────────────────────────────────

export function GlassCard({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-[18px] p-4 relative ${className}`}
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
      }}
    >
      {children}
    </div>
  )
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p
      className="text-[11px] font-semibold uppercase tracking-widest mb-3"
      style={{ color: "var(--prv-text-3)" }}
    >
      {children}
    </p>
  )
}

export function formatCurrency(raw: string | number): string {
  const n = typeof raw === "number" ? raw : parseFloat(raw)
  if (isNaN(n)) return "0 RON"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M RON`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K RON`
  return `${n.toLocaleString("en-US")} RON`
}

// ── Quick actions grid ────────────────────────────────────────────────────────

export function QuickActionsGrid({ actions }: { actions: QuickAction[] }) {
  return (
    <GlassCard className="mb-3.5">
      <SectionLabel>Quick Actions</SectionLabel>
      <div className="grid grid-cols-3 gap-2">
        {actions.map(({ label, icon, href }) => {
          const inner = (
            <>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--prv-text-3)"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={icon} />
              </svg>
              <span
                className="text-[11px] font-medium text-center leading-tight px-1"
                style={{ color: "var(--prv-text-3)" }}
              >
                {label}
              </span>
            </>
          )
          return href ? (
            <Link
              key={label}
              href={href}
              className="flex flex-col items-center gap-1.5 h-[68px] rounded-[12px] justify-center"
              style={{
                background: "var(--prv-g2)",
                border: "1px solid var(--prv-border-subtle)",
              }}
            >
              {inner}
            </Link>
          ) : (
            <div
              key={label}
              className="flex flex-col items-center gap-1.5 h-[68px] rounded-[12px] justify-center cursor-default"
              style={{
                background: "var(--prv-g2)",
                border: "1px solid var(--prv-border-subtle)",
              }}
            >
              {inner}
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}

// ── Alert banner (inline, not full-width) ─────────────────────────────────────

export function InlineAlert({
  type,
  title,
  description,
}: {
  type: "error" | "warning" | "info"
  title: string
  description?: string
}) {
  const colors = {
    error: {
      bg: "rgba(255,59,48,0.12)",
      border: "rgba(255,59,48,0.20)",
      text: "rgba(255,99,90,0.90)",
    },
    warning: {
      bg: "rgba(255,159,10,0.12)",
      border: "rgba(255,159,10,0.20)",
      text: "rgba(255,179,64,0.90)",
    },
    info: {
      bg: "rgba(10,132,255,0.12)",
      border: "rgba(10,132,255,0.20)",
      text: "rgba(80,160,255,0.90)",
    },
  }
  const c = colors[type]
  return (
    <div
      className="flex gap-3 items-start px-4 py-3 rounded-[14px] mb-3.5"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      <span className="font-bold text-sm leading-tight" style={{ color: c.text }}>
        {type === "error" ? "⚠" : type === "warning" ? "⚠" : "ℹ"}
      </span>
      <div>
        <p className="text-[13px] font-semibold leading-tight" style={{ color: c.text }}>
          {title}
        </p>
        {description && (
          <p className="text-[12px] mt-0.5" style={{ color: "var(--prv-text-3)" }}>
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
