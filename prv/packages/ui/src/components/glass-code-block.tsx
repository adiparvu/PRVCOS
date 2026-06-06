"use client"

import React, { useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GlassCodeBlockProps {
  code: string
  /** Language label shown in the header. */
  language?: string
  /** Show the gutter with line numbers. Default true. */
  showLineNumbers?: boolean
  /** Show the copy button. Default true. */
  copyable?: boolean
  /** Show the macOS-style window chrome dots. Default true. */
  chrome?: boolean
  /** Optional filename shown next to the language. */
  filename?: string
  className?: string
  style?: React.CSSProperties
}

// ── Copy icon ─────────────────────────────────────────────────────────────────

function CopyIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassCodeBlock({
  code,
  language,
  showLineNumbers = true,
  copyable = true,
  chrome = true,
  filename,
  className,
  style,
}: GlassCodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const lines = code.replace(/\n$/, "").split("\n")

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard may be unavailable (e.g. insecure context) — fail silently.
    }
  }

  const hasHeader = chrome || language || filename || copyable

  return (
    <div
      className={clsx(className)}
      style={{
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid var(--prv-border-subtle)",
        background: "rgba(16,16,18,0.6)",
        ...style,
      }}
    >
      {hasHeader && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderBottom: "1px solid var(--prv-border-subtle)",
            background: "var(--prv-g1)",
          }}
        >
          {chrome && (
            <div style={{ display: "flex", gap: 6 }} aria-hidden="true">
              {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
                <span
                  key={c}
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: "50%",
                    background: c,
                  }}
                />
              ))}
            </div>
          )}

          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--prv-text-3)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              flex: 1,
            }}
          >
            {filename ? <span style={{ textTransform: "none" }}>{filename}</span> : language}
          </span>

          {copyable && (
            <button
              type="button"
              onClick={copy}
              aria-label="Copy code"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 10px",
                borderRadius: 8,
                background: "var(--prv-g2)",
                border: "1px solid var(--prv-border-subtle)",
                color: copied ? "rgba(48,209,88,0.9)" : "var(--prv-text-2)",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background 150ms, color 150ms",
              }}
              onMouseEnter={(e) => {
                if (copied) return
                const el = e.currentTarget as HTMLButtonElement
                el.style.background = "var(--prv-g3)"
                el.style.color = "var(--prv-text-1)"
              }}
              onMouseLeave={(e) => {
                if (copied) return
                const el = e.currentTarget as HTMLButtonElement
                el.style.background = "var(--prv-g2)"
                el.style.color = "var(--prv-text-2)"
              }}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>
      )}

      <div
        style={{
          display: "flex",
          fontFamily: '"SF Mono", ui-monospace, monospace',
          fontSize: 13,
          lineHeight: 1.7,
          overflowX: "auto",
        }}
      >
        {showLineNumbers && (
          <div
            aria-hidden="true"
            style={{
              padding: "14px 0 14px 14px",
              textAlign: "right",
              color: "var(--prv-text-4)",
              userSelect: "none",
              flexShrink: 0,
            }}
          >
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
        )}
        <pre
          style={{
            padding: "14px 16px",
            margin: 0,
            whiteSpace: "pre",
            color: "var(--prv-text-1)",
          }}
        >
          <code>{code.replace(/\n$/, "")}</code>
        </pre>
      </div>
    </div>
  )
}
