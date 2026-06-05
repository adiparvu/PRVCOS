"use client"

import { useEffect, useRef } from "react"
import type { PreviewAction } from "./types"

interface Props {
  actions: PreviewAction[]
  entityName: string
  isOpen: boolean
  onClose: () => void
  onAction: (actionId: string) => void
  anchorRef: React.RefObject<HTMLElement | null>
}

export function ContextMenuBuilder({
  actions,
  entityName,
  isOpen,
  onClose,
  onAction,
  anchorRef,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const primary = actions.filter((a) => !a.destructive)
  const destructive = actions.filter((a) => a.destructive)

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-56 rounded-[16px] overflow-hidden"
      style={{
        background: "rgba(30,30,30,0.92)",
        backdropFilter: "blur(48px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow:
          "0 24px 64px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.10)",
        top: anchorRef.current ? anchorRef.current.getBoundingClientRect().bottom + 8 : "50%",
        left: anchorRef.current
          ? Math.min(anchorRef.current.getBoundingClientRect().left, window.innerWidth - 232)
          : "50%",
      }}
    >
      {/* Section header */}
      <div className="px-3 py-2.5 border-b border-white/[0.06]">
        <p className="text-[12px] font-semibold text-white/40 truncate">{entityName}</p>
      </div>

      {/* Primary actions */}
      <div className="py-1">
        {primary.map((action) => (
          <button
            key={action.id}
            onClick={() => {
              onAction(action.id)
              onClose()
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06] active:bg-white/[0.10]"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white/60 shrink-0"
            >
              <path d={action.icon} />
            </svg>
            <span className="text-[14px] text-white/85">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Destructive actions */}
      {destructive.length > 0 && (
        <div className="py-1 border-t border-white/[0.06]">
          {destructive.map((action) => (
            <button
              key={action.id}
              onClick={() => {
                onAction(action.id)
                onClose()
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white/30 shrink-0"
              >
                <path d={action.icon} />
              </svg>
              <span className="text-[14px] text-white/40">{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
