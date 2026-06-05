"use client"

import React, { useEffect, useRef, useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotificationEntryType = "info" | "success" | "warning" | "error"

export interface NotificationEntry {
  id: string
  type?: NotificationEntryType
  title: string
  description?: string
  timestamp: string
  read?: boolean
  icon?: React.ReactNode
}

export interface GlassNotificationBellProps {
  entries?: NotificationEntry[]
  onMarkAllRead?: () => void
  onDismiss?: (id: string) => void
  onSelect?: (id: string) => void
  onViewAll?: () => void
  className?: string
  style?: React.CSSProperties
}

export interface GlassNotificationPanelProps {
  entries?: NotificationEntry[]
  onMarkAllRead?: () => void
  onDismiss?: (id: string) => void
  onSelect?: (id: string) => void
  onViewAll?: () => void
  className?: string
  style?: React.CSSProperties
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const typeColor: Record<NotificationEntryType, string> = {
  info: "rgba(10,132,255,0.85)",
  success: "rgba(48,209,88,0.85)",
  warning: "rgba(255,149,0,0.85)",
  error: "rgba(255,59,48,0.85)",
}

function TypeIcon({ type }: { type?: NotificationEntryType }) {
  const t = type ?? "info"
  const color = typeColor[t]

  if (t === "success") {
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )
  }
  if (t === "warning") {
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    )
  }
  if (t === "error") {
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    )
  }
  // info
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// ── Panel (standalone) ────────────────────────────────────────────────────────

export function GlassNotificationPanel({
  entries = [],
  onMarkAllRead,
  onDismiss,
  onSelect,
  onViewAll,
  className,
  style,
}: GlassNotificationPanelProps) {
  const unread = entries.filter((e) => !e.read)
  const read = entries.filter((e) => e.read)

  return (
    <div
      className={clsx("relative overflow-hidden border rounded-[20px] flex flex-col", className)}
      style={{
        width: 320,
        background: "var(--prv-g1)",
        borderColor: "var(--prv-border-subtle)",
        backdropFilter: "blur(32px) saturate(160%)",
        WebkitBackdropFilter: "blur(32px) saturate(160%)",
        ...style,
      }}
    >
      {/* specular top */}
      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)",
        }}
        aria-hidden="true"
      />

      {/* header */}
      <div
        className="flex items-center justify-between px-4"
        style={{ height: 48, borderBottom: "1px solid var(--prv-border-subtle)" }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--prv-text-1)" }}>
          Notifications
        </span>
        {unread.length > 0 && onMarkAllRead && (
          <button
            onClick={onMarkAllRead}
            style={{
              fontSize: 12,
              color: "var(--prv-text-3)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              padding: "4px 0",
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* entries */}
      <div style={{ overflowY: "auto", maxHeight: 380, flex: 1 }}>
        {entries.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-10"
            style={{ color: "var(--prv-text-4)", fontSize: 13 }}
          >
            <BellIcon />
            <span style={{ marginTop: 8 }}>No notifications</span>
          </div>
        )}

        {unread.length > 0 && (
          <>
            <div
              className="px-4 pt-3 pb-1.5"
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--prv-text-3)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              New
            </div>
            {unread.map((entry) => (
              <NotificationRow
                key={entry.id}
                entry={entry}
                onSelect={onSelect}
                onDismiss={onDismiss}
              />
            ))}
          </>
        )}

        {read.length > 0 && (
          <>
            <div
              className="px-4 pt-3 pb-1.5"
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--prv-text-3)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Earlier
            </div>
            {read.map((entry) => (
              <NotificationRow
                key={entry.id}
                entry={entry}
                onSelect={onSelect}
                onDismiss={onDismiss}
              />
            ))}
          </>
        )}
      </div>

      {/* footer */}
      {onViewAll && (
        <button
          onClick={onViewAll}
          className="flex items-center justify-center gap-1"
          style={{
            height: 44,
            fontSize: 13,
            fontWeight: 500,
            color: "var(--prv-text-2)",
            background: "none",
            border: "none",
            borderTop: "1px solid var(--prv-border-subtle)",
            cursor: "pointer",
            fontFamily: "inherit",
            width: "100%",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--prv-text-1)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--prv-text-2)"
          }}
        >
          View all notifications →
        </button>
      )}
    </div>
  )
}

// ── Single row ────────────────────────────────────────────────────────────────

function NotificationRow({
  entry,
  onSelect,
  onDismiss,
}: {
  entry: NotificationEntry
  onSelect?: (id: string) => void
  onDismiss?: (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="relative flex items-start gap-3 px-4 py-3"
      style={{
        cursor: onSelect ? "pointer" : "default",
        background: hovered ? "var(--prv-g2)" : "transparent",
        transition: "background 150ms",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect?.(entry.id)}
    >
      {/* unread dot */}
      {!entry.read && (
        <div
          style={{
            position: "absolute",
            left: 8,
            top: "50%",
            transform: "translateY(-50%)",
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "#0a84ff",
            flexShrink: 0,
          }}
        />
      )}

      {/* icon container */}
      <div
        className="flex items-center justify-center rounded-xl border shrink-0"
        style={{
          width: 32,
          height: 32,
          background: "var(--prv-g2)",
          borderColor: "var(--prv-border-subtle)",
          marginLeft: 4,
        }}
      >
        {entry.icon ?? <TypeIcon type={entry.type} />}
      </div>

      {/* text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: entry.read ? 400 : 600,
            color: "var(--prv-text-1)",
            lineHeight: 1.3,
            marginBottom: 2,
          }}
        >
          {entry.title}
        </p>
        {entry.description && (
          <p
            style={{
              fontSize: 12,
              color: "var(--prv-text-3)",
              lineHeight: 1.4,
              marginBottom: 2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {entry.description}
          </p>
        )}
        <p style={{ fontSize: 11, color: "var(--prv-text-4)" }}>{entry.timestamp}</p>
      </div>

      {/* dismiss */}
      {onDismiss && hovered && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDismiss(entry.id)
          }}
          className="flex items-center justify-center rounded-full shrink-0"
          style={{
            width: 20,
            height: 20,
            background: "var(--prv-g3)",
            border: "none",
            cursor: "pointer",
            color: "var(--prv-text-3)",
          }}
        >
          <XIcon />
        </button>
      )}
    </div>
  )
}

// ── Bell (with dropdown) ──────────────────────────────────────────────────────

export function GlassNotificationBell({
  entries = [],
  onMarkAllRead,
  onDismiss,
  onSelect,
  onViewAll,
  className,
  style,
}: GlassNotificationBellProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const unreadCount = entries.filter((e) => !e.read).length
  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount)

  useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onMouseDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onMouseDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className={clsx("relative inline-block", className)} style={style}>
      {/* bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        className="relative flex items-center justify-center rounded-full border focus-visible:outline-none"
        style={{
          width: 36,
          height: 36,
          background: open ? "var(--prv-g2)" : "var(--prv-g1)",
          borderColor: "var(--prv-border-subtle)",
          color: "var(--prv-text-2)",
          cursor: "pointer",
          transition: "background 150ms",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--prv-g2)"
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.background = "var(--prv-g1)"
        }}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span
            className="absolute flex items-center justify-center rounded-full"
            style={{
              top: -2,
              right: -2,
              minWidth: 16,
              height: 16,
              padding: "0 3px",
              background: "#0a84ff",
              fontSize: 9,
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1,
            }}
          >
            {badgeLabel}
          </span>
        )}
      </button>

      {/* dropdown */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: "100%",
          marginTop: 8,
          zIndex: 50,
          transformOrigin: "top right",
          transform: open ? "scale(1) translateY(0)" : "scale(0.92) translateY(-8px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "transform 220ms cubic-bezier(0.34,1.56,0.64,1), opacity 180ms ease",
        }}
      >
        <GlassNotificationPanel
          entries={entries}
          onMarkAllRead={onMarkAllRead}
          onDismiss={onDismiss}
          onSelect={(id) => {
            onSelect?.(id)
          }}
          onViewAll={onViewAll}
        />
      </div>
    </div>
  )
}
