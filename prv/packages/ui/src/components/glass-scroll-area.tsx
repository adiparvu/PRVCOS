"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export type ScrollAxis = "vertical" | "horizontal" | "both"

export interface GlassScrollAreaProps {
  children: React.ReactNode
  /** Scroll axis. Default "vertical". */
  axis?: ScrollAxis
  maxHeight?: number | string
  maxWidth?: number | string
  className?: string
  style?: React.CSSProperties
}

// ── Styled scrollbar (WebKit + Firefox) ────────────────────────────────────────
// Scoped via a generated class so it doesn't leak to other scrollers.

let counter = 0

function useScopedClass() {
  // Stable per-instance class name.
  const [name] = React.useState(() => `prv-sa-${(counter++).toString(36)}`)
  return name
}

function scrollbarCss(cls: string): string {
  return `
.${cls}{scrollbar-width:thin;scrollbar-color:var(--prv-g3) transparent;}
.${cls}::-webkit-scrollbar{width:8px;height:8px;}
.${cls}::-webkit-scrollbar-track{background:transparent;}
.${cls}::-webkit-scrollbar-thumb{background:var(--prv-g3);border-radius:100px;border:2px solid transparent;background-clip:padding-box;}
.${cls}::-webkit-scrollbar-thumb:hover{background:var(--prv-g4);background-clip:padding-box;}
.${cls}::-webkit-scrollbar-corner{background:transparent;}
`
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassScrollArea({
  children,
  axis = "vertical",
  maxHeight,
  maxWidth,
  className,
  style,
}: GlassScrollAreaProps) {
  const cls = useScopedClass()

  const overflowX = axis === "horizontal" || axis === "both" ? "auto" : "hidden"
  const overflowY = axis === "vertical" || axis === "both" ? "auto" : "hidden"

  return (
    <>
      <style>{scrollbarCss(cls)}</style>
      <div
        className={clsx(cls, className)}
        style={{
          overflowX,
          overflowY,
          maxHeight,
          maxWidth,
          ...style,
        }}
      >
        {children}
      </div>
    </>
  )
}
