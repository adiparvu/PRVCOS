"use client"

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastSeverity = "success" | "error" | "warning" | "info"

export interface ToastOptions {
  duration?: number
}

interface ToastEntry {
  id: string
  severity: ToastSeverity
  title: string
  description?: string
  duration: number
  visible: boolean
}

interface ToastApi {
  success: (title: string, description?: string, opts?: ToastOptions) => void
  error: (title: string, description?: string, opts?: ToastOptions) => void
  warning: (title: string, description?: string, opts?: ToastOptions) => void
  info: (title: string, description?: string, opts?: ToastOptions) => void
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): { toast: ToastApi } {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>")
  return { toast: ctx }
}

// ── Provider ──────────────────────────────────────────────────────────────────

const MAX_TOASTS = 3
const DEFAULT_DURATION = 3500

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, visible: false } : t)))
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 420)
  }, [])

  const add = useCallback(
    (severity: ToastSeverity, title: string, description?: string, opts?: ToastOptions) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const duration = opts?.duration ?? DEFAULT_DURATION

      setToasts((prev) => {
        const next = [...prev, { id, severity, title, description, duration, visible: false }]
        return next.slice(-MAX_TOASTS)
      })

      // trigger enter transition on next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, visible: true } : t)))
        })
      })

      setTimeout(() => dismiss(id), duration)
    },
    [dismiss]
  )

  const api: ToastApi = {
    success: (t, d, o) => add("success", t, d, o),
    error: (t, d, o) => add("error", t, d, o),
    warning: (t, d, o) => add("warning", t, d, o),
    info: (t, d, o) => add("info", t, d, o),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastPortal toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

// ── Portal ────────────────────────────────────────────────────────────────────

function ToastPortal({
  toasts,
  onDismiss,
}: {
  toasts: ToastEntry[]
  onDismiss: (id: string) => void
}) {
  if (typeof document === "undefined") return null

  return createPortal(
    <div
      aria-live="assertive"
      aria-atomic="false"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9500] flex flex-col-reverse gap-2 items-center pointer-events-none"
      style={{ width: "100%", maxWidth: 400, padding: "0 16px" }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  )
}

// ── Single Toast Item ─────────────────────────────────────────────────────────

const iconMap: Record<ToastSeverity, React.ReactNode> = {
  success: (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#30d158"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#ff3b30"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="18" x2="6" y1="6" y2="18" />
      <line x1="6" x2="18" y1="6" y2="18" />
    </svg>
  ),
  warning: (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#ff9500"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" x2="12" y1="9" y2="13" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
    </svg>
  ),
  info: (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0a84ff"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  ),
}

const iconBg: Record<ToastSeverity, string> = {
  success: "rgba(48,209,88,0.14)",
  error: "rgba(255,59,48,0.14)",
  warning: "rgba(255,149,0,0.14)",
  info: "rgba(10,132,255,0.14)",
}
const iconBorder: Record<ToastSeverity, string> = {
  success: "rgba(48,209,88,0.24)",
  error: "rgba(255,59,48,0.24)",
  warning: "rgba(255,149,0,0.24)",
  info: "rgba(10,132,255,0.24)",
}
const barColor: Record<ToastSeverity, string> = {
  success: "#30d158",
  error: "#ff3b30",
  warning: "#ff9500",
  info: "#0a84ff",
}

function ToastItem({ toast, onDismiss }: { toast: ToastEntry; onDismiss: (id: string) => void }) {
  const barRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)

  // animate progress bar
  useEffect(() => {
    if (!toast.visible || !barRef.current) return
    const bar = barRef.current
    bar.style.transition = "none"
    bar.style.width = "100%"
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!paused) {
          bar.style.transition = `width ${toast.duration}ms linear`
          bar.style.width = "0%"
        }
      })
    })
  }, [toast.visible, toast.duration, paused])

  return (
    <div
      role="alert"
      className={clsx(
        "w-full flex items-center gap-3 px-4 py-[13px]",
        "border rounded-[18px] pointer-events-auto",
        "relative overflow-hidden",
        "backdrop-blur-[48px] backdrop-saturate-[180%]",
        "transition-[transform,opacity] duration-[400ms]"
      )}
      style={{
        background: "var(--prv-g3)",
        borderColor: "var(--prv-border)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 var(--prv-g3-spec)",
        transitionTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)",
        transform: toast.visible ? "translateY(0) scale(1)" : "translateY(24px) scale(0.94)",
        opacity: toast.visible ? 1 : 0,
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* icon */}
      <div
        className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 border"
        style={{ background: iconBg[toast.severity], borderColor: iconBorder[toast.severity] }}
      >
        {iconMap[toast.severity]}
      </div>

      {/* text */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[14px] font-semibold leading-tight"
          style={{ color: "var(--prv-text-1)" }}
        >
          {toast.title}
        </p>
        {toast.description && (
          <p className="text-[12px] mt-0.5" style={{ color: "var(--prv-text-3)" }}>
            {toast.description}
          </p>
        )}
      </div>

      {/* close */}
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex items-center shrink-0 transition-colors duration-150"
        style={{ color: "var(--prv-text-4)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--prv-text-2)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--prv-text-4)")}
        aria-label="Dismiss"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <line x1="18" x2="6" y1="6" y2="18" />
          <line x1="6" x2="18" y1="6" y2="18" />
        </svg>
      </button>

      {/* progress bar */}
      <div
        ref={barRef}
        className="absolute bottom-0 left-0 h-[2px] rounded-bl-[18px]"
        style={{ background: barColor[toast.severity], width: "100%" }}
        aria-hidden="true"
      />
    </div>
  )
}
