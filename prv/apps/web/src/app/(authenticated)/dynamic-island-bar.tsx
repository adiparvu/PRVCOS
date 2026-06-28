"use client"

import { useState, useEffect } from "react"
import type { SystemRole } from "@prv/auth"
import { resolveShell } from "@/lib/shell-config"
import { useLiveContext } from "@/hooks/realtime"

const PulseIcon = ({ indicator }: { indicator?: "normal" | "warning" | "critical" }) => {
  const color =
    indicator === "critical"
      ? "#FF453A"
      : indicator === "warning"
        ? "#FF9F0A"
        : "rgba(255,255,255,0.45)"
  return (
    <span
      aria-hidden="true"
      className="inline-block w-[6px] h-[6px] rounded-full flex-shrink-0"
      style={{
        background: color,
        boxShadow: indicator === "critical" ? `0 0 6px ${color}` : "none",
      }}
    />
  )
}

interface DynamicIslandBarProps {
  role: SystemRole
  userId: string
  companyId: string
}

export function DynamicIslandBar({ role, userId, companyId }: DynamicIslandBarProps) {
  const { diLabel } = resolveShell(role)
  const ctx = useLiveContext({ role, diLabel, companyId, userId })
  const [expanded, setExpanded] = useState(false)

  // Auto-expand 4 s when a critical indicator fires
  useEffect(() => {
    if (ctx.indicator === "critical") {
      // Auto-expand the island for a critical indicator, then collapse on a timer.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpanded(true)
      const t = setTimeout(() => setExpanded(false), 4_000)
      return () => clearTimeout(t)
    }
  }, [ctx.indicator])

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
      style={{
        paddingTop: "env(safe-area-inset-top, 12px)",
        paddingLeft: "var(--prv-sidebar-w, 0px)",
        transition: "padding-left 300ms cubic-bezier(0.34,1.56,0.64,1)",
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className="flex flex-col items-center pointer-events-auto"
        style={{ width: "min(calc(100vw - 32px), 320px)" }}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 px-4 h-9 rounded-[100px]"
          style={{
            background: "rgba(10,10,12,0.90)",
            border: "1px solid rgba(255,255,255,0.10)",
            backdropFilter: "blur(48px) saturate(200%)",
            WebkitBackdropFilter: "blur(48px) saturate(200%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 8px 24px rgba(0,0,0,0.6)",
            transition: "all 400ms cubic-bezier(0.34,1.56,0.64,1)",
            minWidth: expanded ? "200px" : "100px",
          }}
          aria-label={`Dynamic Island — ${ctx.primary}`}
          aria-expanded={expanded}
        >
          <PulseIcon indicator={ctx.indicator} />
          <span
            className="text-[12px] font-semibold tracking-tight flex-1 text-left truncate"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            {ctx.primary}
          </span>
          {ctx.secondary && (
            <span className="text-[11px] font-normal" style={{ color: "rgba(255,255,255,0.38)" }}>
              {ctx.secondary}
            </span>
          )}
        </button>

        {expanded && (
          <div
            className="mt-[2px] w-full rounded-[20px] overflow-hidden"
            style={{
              background: "rgba(14,14,16,0.92)",
              border: "1px solid rgba(255,255,255,0.10)",
              backdropFilter: "blur(64px) saturate(220%)",
              WebkitBackdropFilter: "blur(64px) saturate(220%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14), 0 24px 64px rgba(0,0,0,0.75)",
            }}
          >
            <div className="px-4 py-4">
              <p
                className="text-[11px] font-semibold uppercase tracking-widest mb-1"
                style={{ color: "rgba(255,255,255,0.30)" }}
              >
                {diLabel}
              </p>
              <p
                className="text-[22px] font-bold tracking-tight"
                style={{ color: "rgba(255,255,255,0.90)" }}
              >
                {ctx.primary.includes("·") ? ctx.primary.split("·")[1]?.trim() : ctx.primary}
              </p>
              {ctx.secondary && (
                <p className="text-[12px] mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {ctx.secondary}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
