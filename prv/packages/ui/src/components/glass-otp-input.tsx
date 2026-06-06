"use client"

import React, { useEffect, useRef } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GlassOTPInputProps {
  /** Number of cells. Default 6. */
  length?: number
  /** Current code (controlled). */
  value: string
  onChange: (value: string) => void
  /** Fired once the code reaches full length. */
  onComplete?: (value: string) => void
  /** Render dots instead of characters (for PINs). */
  masked?: boolean
  /** Show error styling + shake animation. */
  error?: boolean
  /** Focus the first cell on mount. */
  autoFocus?: boolean
  /** Accepted characters. Default: digits only. */
  pattern?: RegExp
  disabled?: boolean
  /** Insert a separator dot after this 0-based index (e.g. 2 → 3·3 split). */
  separatorAfter?: number
  ariaLabel?: string
  className?: string
  style?: React.CSSProperties
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassOTPInput({
  length = 6,
  value,
  onChange,
  onComplete,
  masked = false,
  error = false,
  autoFocus = false,
  pattern = /[0-9]/,
  disabled = false,
  separatorAfter,
  ariaLabel = "Verification code",
  className,
  style,
}: GlassOTPInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const completedFor = useRef<string | null>(null)

  // Normalize the controlled value to exactly `length` slots.
  const chars = Array.from({ length }, (_, i) => value[i] ?? "")

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus()
  }, [autoFocus])

  // Fire onComplete once per fully-entered code.
  useEffect(() => {
    if (value.length === length && completedFor.current !== value) {
      completedFor.current = value
      onComplete?.(value)
    }
    if (value.length < length) completedFor.current = null
  }, [value, length, onComplete])

  const setChar = (index: number, char: string) => {
    const next = chars.slice()
    next[index] = char
    onChange(next.join("").slice(0, length))
  }

  const handleInput = (index: number, raw: string) => {
    const char =
      raw
        .split("")
        .reverse()
        .find((c) => pattern.test(c)) ?? ""
    if (!char && raw !== "") return
    setChar(index, char)
    if (char && index < length - 1) refs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (chars[index]) {
        setChar(index, "")
      } else if (index > 0) {
        refs.current[index - 1]?.focus()
        setChar(index - 1, "")
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus()
    } else if (e.key === "ArrowRight" && index < length - 1) {
      refs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData("text")
    const digits = text
      .split("")
      .filter((c) => pattern.test(c))
      .slice(0, length)
    if (digits.length === 0) return
    onChange(digits.join(""))
    const focusIndex = Math.min(digits.length, length - 1)
    refs.current[focusIndex]?.focus()
  }

  return (
    <div
      className={clsx(className)}
      role="group"
      aria-label={ariaLabel}
      style={{
        display: "inline-flex",
        gap: 10,
        animation: error ? "prvOtpShake 360ms" : undefined,
        ...style,
      }}
    >
      <style>{`@keyframes prvOtpShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-5px)}40%,80%{transform:translateX(5px)}}`}</style>

      {chars.map((char, i) => (
        <React.Fragment key={i}>
          <input
            ref={(el) => {
              refs.current[i] = el
            }}
            type={masked ? "password" : "text"}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            disabled={disabled}
            aria-label={`Digit ${i + 1}`}
            value={char}
            onChange={(e) => handleInput(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.currentTarget.select()}
            style={{
              width: 48,
              height: 56,
              textAlign: "center",
              fontSize: 22,
              fontWeight: 700,
              color: "var(--prv-text-1)",
              background: "var(--prv-g2)",
              border: `1px solid ${error ? "rgba(255,59,48,0.5)" : "var(--prv-border)"}`,
              borderRadius: 13,
              outline: "none",
              fontFamily: "inherit",
              caretColor: "var(--prv-accent, rgba(10,132,255,0.9))",
              opacity: disabled ? 0.5 : 1,
              transition: "border-color 150ms, background 150ms, transform 150ms",
            }}
            onFocusCapture={(e) => {
              if (!error)
                e.currentTarget.style.borderColor = "var(--prv-accent, rgba(10,132,255,0.9))"
              e.currentTarget.style.background = "var(--prv-g3)"
              e.currentTarget.style.transform = "translateY(-2px)"
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = error
                ? "rgba(255,59,48,0.5)"
                : "var(--prv-border)"
              e.currentTarget.style.background = "var(--prv-g2)"
              e.currentTarget.style.transform = "translateY(0)"
            }}
          />
          {separatorAfter === i && i < length - 1 && (
            <span
              aria-hidden="true"
              style={{
                display: "flex",
                alignItems: "center",
                color: "var(--prv-text-4)",
                fontSize: 22,
              }}
            >
              ·
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
