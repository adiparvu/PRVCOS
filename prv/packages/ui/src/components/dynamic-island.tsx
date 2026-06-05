"use client"

import React from "react"
import { clsx } from "clsx"

export type DynamicIslandState = "idle" | "compact" | "expanded"

export interface DynamicIslandProps {
  state?: DynamicIslandState
  onToggle?: () => void
  compactContent?: React.ReactNode
  expandedContent?: React.ReactNode
  liveActivity?: boolean
  className?: string
  style?: React.CSSProperties
}

const sizes: Record<DynamicIslandState, { width: string; height: string; borderRadius: string }> = {
  idle: { width: "96px", height: "28px", borderRadius: "20px" },
  compact: { width: "144px", height: "32px", borderRadius: "20px" },
  expanded: { width: "260px", height: "72px", borderRadius: "24px" },
}

export function DynamicIsland({
  state = "idle",
  onToggle,
  compactContent,
  expandedContent,
  liveActivity = false,
  className,
  style,
}: DynamicIslandProps) {
  const sz = sizes[state]

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Dynamic Island — ${state}`}
      onClick={onToggle}
      className={clsx(
        "relative overflow-hidden flex items-center justify-center",
        "transition-all will-change-[width,height,border-radius]",
        onToggle && "cursor-pointer",
        className
      )}
      style={{
        background: "#000",
        border: "1px solid rgba(255,255,255,0.07)",
        width: sz.width,
        height: sz.height,
        borderRadius: sz.borderRadius,
        transitionDuration: "400ms",
        transitionTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)",
        ...style,
      }}
    >
      {/* Idle — three faint dots */}
      <div
        className={clsx(
          "flex items-center gap-1 transition-opacity duration-[200ms]",
          state !== "idle" && "opacity-0 pointer-events-none"
        )}
        aria-hidden="true"
      >
        <span
          className="w-[6px] h-[6px] rounded-full"
          style={{ background: "rgba(255,255,255,0.2)" }}
        />
        <span
          className="w-[6px] h-[6px] rounded-full"
          style={{ background: "rgba(255,255,255,0.2)" }}
        />
        <span
          className="w-[6px] h-[6px] rounded-full"
          style={{ background: "rgba(255,255,255,0.2)" }}
        />
      </div>

      {/* Compact */}
      <div
        className={clsx(
          "absolute inset-0 flex items-center px-3 gap-2",
          "transition-opacity duration-[200ms]",
          state === "compact" ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {liveActivity && (
          <span
            className="w-[6px] h-[6px] rounded-full shrink-0"
            style={{
              background: "#30d158",
              animation: "prv-di-pulse 2s ease-in-out infinite",
            }}
            aria-hidden="true"
          />
        )}
        <div className="flex-1 min-w-0">{compactContent}</div>
      </div>

      {/* Expanded */}
      <div
        className={clsx(
          "absolute inset-0 px-3.5 py-2.5",
          "transition-opacity duration-[220ms]",
          state === "expanded" ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {liveActivity && (
          <span
            className="absolute top-2.5 left-3.5 w-[6px] h-[6px] rounded-full"
            style={{
              background: "#30d158",
              animation: "prv-di-pulse 2s ease-in-out infinite",
            }}
            aria-hidden="true"
          />
        )}
        <div className={liveActivity ? "pl-4" : ""}>{expandedContent}</div>
      </div>

      <style>{`
        @keyframes prv-di-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
