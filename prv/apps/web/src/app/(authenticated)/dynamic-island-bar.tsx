"use client"

import { useState, useEffect } from "react"
import type { SystemRole } from "@prv/auth"
import { resolveShell } from "@/lib/shell-config"

// Live context data shape — populated by role-specific Supabase Realtime subscriptions in Phase 06
interface LiveContext {
  primary: string
  secondary?: string
  indicator?: "normal" | "warning" | "critical"
}

function useLiveContext(role: SystemRole, diLabel: string): LiveContext {
  const [ctx] = useState<LiveContext>({ primary: diLabel, secondary: "Live" })
  // Phase 06: subscribe to Supabase Realtime channels scoped to role + company
  // useEffect(() => { ... }, [role])
  return ctx
}

const PulseIcon = ({ indicator }: { indicator?: LiveContext["indicator"] }) => {
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
}

export function DynamicIslandBar({ role }: DynamicIslandBarProps) {
  const { diLabel } = resolveShell(role)
  const ctx = useLiveContext(role, diLabel)
  const [expanded, setExpanded] = useState(false)

  // Auto-collapse after 4 s when a critical indicator fires
  useEffect(() => {
    if (ctx.indicator === "critical") {
      setExpanded(true)
      const t = setTimeout(() => setExpanded(false), 4000)
      return () => clearTimeout(t)
    }
  }, [ctx.indicator])

  return (
    <div
      className="fixed top-0 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center"
      style={{
        width: "min(calc(100vw - 32px), 320px)",
        paddingTop: "env(safe-area-inset-top, 12px)",
      }}
      aria-live="polite"
      aria-atomic="true"
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

      {/* Expanded tray — Phase 06 will inject role-specific live widgets here */}
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
          <div
            className="px-4 py-6 text-center text-xs"
            style={{ color: "rgba(255,255,255,0.28)" }}
          >
            {diLabel} · Live data in Phase 06
          </div>
        </div>
      )}
    </div>
  )
}
