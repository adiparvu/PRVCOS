"use client"

import React, { useLayoutEffect, useRef } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GlassChatComposerProps {
  value: string
  onChange: (value: string) => void
  /** Fired on Enter (without Shift) or send-button click, when non-empty. */
  onSend: (value: string) => void
  placeholder?: string
  /** Show the attach button. Default true. */
  attachable?: boolean
  onAttach?: () => void
  /** Show the voice button. Default true. */
  voice?: boolean
  onVoice?: () => void
  disabled?: boolean
  /** Max auto-grow height in px. Default 120. */
  maxHeight?: number
  /** Hint line under the composer. */
  hint?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        width: 38,
        height: 38,
        borderRadius: 12,
        background: "transparent",
        border: "none",
        color: "var(--prv-text-3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
        transition: "background 150ms, color 150ms",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.background = "var(--prv-g2)"
        el.style.color = "var(--prv-text-1)"
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.background = "transparent"
        el.style.color = "var(--prv-text-3)"
      }}
    >
      {children}
    </button>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassChatComposer({
  value,
  onChange,
  onSend,
  placeholder = "Type a message…",
  attachable = true,
  onAttach,
  voice = true,
  onVoice,
  disabled = false,
  maxHeight = 120,
  hint,
  className,
  style,
}: GlassChatComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const canSend = value.trim() !== "" && !disabled

  // Auto-grow
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
  }, [value, maxHeight])

  const send = () => {
    if (!canSend) return
    onSend(value)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className={clsx(className)} style={style}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          padding: 8,
          borderRadius: 18,
          background: "var(--prv-g2)",
          border: "1px solid var(--prv-border)",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {attachable && (
          <IconBtn label="Attach" onClick={onAttach}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </IconBtn>
        )}

        <textarea
          ref={ref}
          rows={1}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            color: "var(--prv-text-1)",
            fontSize: 14,
            fontFamily: "inherit",
            lineHeight: 1.5,
            padding: "9px 4px",
            maxHeight,
          }}
        />

        {voice && (
          <IconBtn label="Voice message" onClick={onVoice}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
            </svg>
          </IconBtn>
        )}

        <button
          type="button"
          aria-label="Send"
          disabled={!canSend}
          onClick={send}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: "var(--prv-accent, rgba(10,132,255,0.9))",
            border: "none",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: canSend ? "pointer" : "not-allowed",
            opacity: canSend ? 1 : 0.35,
            flexShrink: 0,
            transition: "transform 150ms, opacity 150ms",
          }}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>

      {hint && (
        <div
          style={{
            fontSize: 11,
            color: "var(--prv-text-4)",
            marginTop: 8,
            paddingLeft: 6,
          }}
        >
          {hint}
        </div>
      )}
    </div>
  )
}
