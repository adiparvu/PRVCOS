"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RichTextAction {
  /** Unique command id (e.g. "bold", "h2", "bulletList", "link"). */
  command: string
  /** Button content — icon node or short text. */
  icon: React.ReactNode
  /** Accessible label / tooltip. */
  label: string
  /** Optional payload (e.g. heading level, block type). */
  value?: string
}

/** A group of actions; groups are separated by a divider. */
export type RichTextGroup = RichTextAction[]

export interface GlassRichTextToolbarProps {
  /** Toolbar contents, grouped. Defaults to a standard formatting set. */
  groups?: RichTextGroup[]
  /** Set of command ids currently active (highlighted). */
  activeCommands?: string[]
  /** Fired when a button is pressed. Parent applies the command to its editor. */
  onCommand: (command: string, value?: string) => void
  disabled?: boolean
  ariaLabel?: string
  className?: string
  style?: React.CSSProperties
}

// ── Default icon set (SF-Symbol-style strokes) ─────────────────────────────────

const ICON = {
  bold: <span style={{ fontWeight: 800 }}>B</span>,
  italic: <span style={{ fontStyle: "italic" }}>I</span>,
  underline: <span style={{ textDecoration: "underline" }}>U</span>,
  strike: <span style={{ textDecoration: "line-through" }}>S</span>,
  heading: <span style={{ fontWeight: 700 }}>H</span>,
  bulletList: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="3.5" cy="6" r="1" />
      <circle cx="3.5" cy="12" r="1" />
      <circle cx="3.5" cy="18" r="1" />
    </svg>
  ),
  orderedList: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="10" y1="6" x2="21" y2="6" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <line x1="10" y1="18" x2="21" y2="18" />
      <path d="M4 6h1v4" />
      <path d="M4 10h2" />
      <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
    </svg>
  ),
  link: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  quote: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2H4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h2" />
      <path d="M14 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2h-4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h2" />
    </svg>
  ),
  clear: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7V4h16v3" />
      <path d="M5 20h6" />
      <path d="M13 4 8 20" />
      <line x1="15" y1="15" x2="21" y2="21" />
      <line x1="21" y1="15" x2="15" y2="21" />
    </svg>
  ),
}

const DEFAULT_GROUPS: RichTextGroup[] = [
  [
    { command: "bold", icon: ICON.bold, label: "Bold" },
    { command: "italic", icon: ICON.italic, label: "Italic" },
    { command: "underline", icon: ICON.underline, label: "Underline" },
    { command: "strikeThrough", icon: ICON.strike, label: "Strikethrough" },
  ],
  [
    { command: "formatBlock", value: "h2", icon: ICON.heading, label: "Heading" },
    { command: "insertUnorderedList", icon: ICON.bulletList, label: "Bullet list" },
    { command: "insertOrderedList", icon: ICON.orderedList, label: "Numbered list" },
  ],
  [
    { command: "createLink", icon: ICON.link, label: "Insert link" },
    { command: "formatBlock", value: "blockquote", icon: ICON.quote, label: "Quote" },
  ],
  [{ command: "removeFormat", icon: ICON.clear, label: "Clear formatting" }],
]

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassRichTextToolbar({
  groups = DEFAULT_GROUPS,
  activeCommands = [],
  onCommand,
  disabled = false,
  ariaLabel = "Text formatting",
  className,
  style,
}: GlassRichTextToolbarProps) {
  const activeSet = new Set(activeCommands)

  return (
    <div
      role="toolbar"
      aria-label={ariaLabel}
      className={clsx(className)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: 6,
        borderRadius: 14,
        background: "rgba(22,22,22,0.6)",
        border: "1px solid var(--prv-border)",
        flexWrap: "wrap",
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? "none" : "auto",
        ...style,
      }}
    >
      {groups.map((group, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && (
            <span
              aria-hidden="true"
              style={{
                width: 1,
                height: 22,
                background: "var(--prv-border-subtle)",
                margin: "0 4px",
              }}
            />
          )}
          {group.map((action) => {
            const isActive = activeSet.has(action.command)
            return (
              <button
                key={`${action.command}-${action.value ?? ""}`}
                type="button"
                aria-label={action.label}
                aria-pressed={isActive}
                title={action.label}
                // Prevent the editor from losing its selection on click.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onCommand(action.command, action.value)}
                style={{
                  minWidth: 34,
                  height: 34,
                  padding: "0 8px",
                  borderRadius: 9,
                  background: isActive ? "var(--prv-g3)" : "transparent",
                  border: "none",
                  color: isActive ? "var(--prv-text-1)" : "var(--prv-text-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 14,
                  fontFamily: "inherit",
                  transition: "background 130ms, color 130ms",
                }}
                onMouseEnter={(e) => {
                  if (isActive) return
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.background = "var(--prv-g2)"
                  el.style.color = "var(--prv-text-1)"
                }}
                onMouseLeave={(e) => {
                  if (isActive) return
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.background = "transparent"
                  el.style.color = "var(--prv-text-2)"
                }}
              >
                {action.icon}
              </button>
            )
          })}
        </React.Fragment>
      ))}
    </div>
  )
}
