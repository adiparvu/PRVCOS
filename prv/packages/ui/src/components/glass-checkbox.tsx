"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GlassCheckboxProps {
  checked: boolean
  indeterminate?: boolean
  onChange: (checked: boolean) => void
  label?: string
  hint?: string
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
}

export interface RadioItem {
  value: string
  label: string
  description?: string
}

export interface GlassRadioGroupProps {
  items: RadioItem[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
}

// ── GlassCheckbox ─────────────────────────────────────────────────────────────

export function GlassCheckbox({
  checked,
  indeterminate = false,
  onChange,
  label,
  hint,
  disabled = false,
  className,
  style,
}: GlassCheckboxProps) {
  const isOn = checked || indeterminate

  const box = (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 20,
        height: 20,
        flexShrink: 0,
        borderRadius: 6,
        border: `1.5px solid ${isOn ? "#0a84ff" : "var(--prv-border)"}`,
        background: isOn ? "#0a84ff" : "var(--prv-g1)",
        transition: "background 180ms, border-color 180ms",
        marginTop: label ? 1 : 0,
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          opacity: isOn ? 1 : 0,
          transform: isOn ? "scale(1)" : "scale(0.5)",
          transition: "opacity 160ms, transform 220ms cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {indeterminate ? (
          <line x1="5" y1="12" x2="19" y2="12" />
        ) : (
          <polyline points="20 6 9 17 4 12" />
        )}
      </svg>
    </span>
  )

  if (!label) {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={indeterminate ? "mixed" : checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx("focus-visible:outline-none", className)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.4 : 1,
          ...style,
        }}
      >
        {box}
      </button>
    )
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx("flex items-start gap-2.5 text-left focus-visible:outline-none", className)}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        fontFamily: "inherit",
        ...style,
      }}
    >
      {box}
      <div>
        <p style={{ fontSize: 14, color: "var(--prv-text-1)", lineHeight: 1.4 }}>{label}</p>
        {hint && (
          <p
            style={{
              fontSize: 12,
              color: "var(--prv-text-3)",
              marginTop: 2,
              lineHeight: 1.4,
            }}
          >
            {hint}
          </p>
        )}
      </div>
    </button>
  )
}

// ── GlassRadioGroup ───────────────────────────────────────────────────────────

export function GlassRadioGroup({
  items,
  value,
  onChange,
  disabled = false,
  className,
  style,
}: GlassRadioGroupProps) {
  return (
    <div role="radiogroup" className={clsx("flex flex-col gap-2.5", className)} style={style}>
      {items.map((item) => {
        const isSelected = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange(item.value)}
            className="flex items-start gap-2.5 text-left focus-visible:outline-none"
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.4 : 1,
              fontFamily: "inherit",
            }}
          >
            {/* radio dot */}
            <span
              aria-hidden="true"
              className="flex items-center justify-center"
              style={{
                width: 20,
                height: 20,
                flexShrink: 0,
                borderRadius: "50%",
                border: `1.5px solid ${isSelected ? "#0a84ff" : "var(--prv-border)"}`,
                background: isSelected ? "rgba(10,132,255,0.12)" : "var(--prv-g1)",
                transition: "border-color 180ms, background 180ms",
                marginTop: item.description ? 1 : 0,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#0a84ff",
                  opacity: isSelected ? 1 : 0,
                  transform: isSelected ? "scale(1)" : "scale(0)",
                  transition: "opacity 160ms, transform 240ms cubic-bezier(0.34,1.56,0.64,1)",
                }}
              />
            </span>

            <div>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--prv-text-1)",
                  lineHeight: 1.4,
                  fontWeight: isSelected ? 500 : 400,
                }}
              >
                {item.label}
              </p>
              {item.description && (
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--prv-text-3)",
                    marginTop: 2,
                    lineHeight: 1.4,
                  }}
                >
                  {item.description}
                </p>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
