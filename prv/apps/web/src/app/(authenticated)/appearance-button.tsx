"use client"

import { useState, useRef, useEffect } from "react"
import { AppearanceSettings } from "@prv/ui"

export function AppearanceButton() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Appearance settings"
        style={{
          position: "fixed",
          top: 14,
          right: 16,
          zIndex: 60,
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "var(--prv-g2)",
          border: "1px solid var(--prv-border)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          boxShadow: "inset 0 1px 0 var(--prv-g2-spec), var(--prv-shadow-e2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "opacity 0.15s, transform 0.15s",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--prv-text-2)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z" />
          <path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7" />
          <path d="M14.5 17.5 4.5 15" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 55,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: "0 16px 28px",
            animation: "prvFadeIn 0.2s ease",
          }}
        >
          <div
            ref={panelRef}
            style={{
              width: "100%",
              maxWidth: 480,
              animation: "prvSlideUp 0.32s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            <AppearanceSettings onSave={() => setOpen(false)} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes prvFadeIn {
          from { opacity: 0 }
          to   { opacity: 1 }
        }
        @keyframes prvSlideUp {
          from { opacity: 0; transform: translateY(32px) }
          to   { opacity: 1; transform: translateY(0) }
        }
      `}</style>
    </>
  )
}
