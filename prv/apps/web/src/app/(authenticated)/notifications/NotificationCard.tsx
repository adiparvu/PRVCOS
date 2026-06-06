"use client"

import { useRef, useState } from "react"

export interface ClientNotif {
  id: string
  type: "info" | "warning" | "error" | "success" | "action_required"
  title: string
  body: string | null
  actionUrl: string | null
  entityType: string | null
  entityId: string | null
  isRead: boolean
  isDismissed: boolean
  createdAt: string
  metadata: Record<string, unknown>
}

interface Props {
  notification: ClientNotif
  isExpanded: boolean
  onToggleExpand: (id: string) => void
  onRead: (id: string) => void
  onDismiss: (id: string) => void
  onAction: (id: string, action: "approve" | "decline") => void
}

const TYPE_CONFIG = {
  error: {
    bg: "rgba(255,59,48,0.18)",
    iconColor: "rgba(255,99,90,0.92)",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  warning: {
    bg: "rgba(255,159,10,0.16)",
    iconColor: "rgba(255,179,64,0.92)",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  success: {
    bg: "rgba(48,209,88,0.16)",
    iconColor: "rgba(48,209,88,0.92)",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  info: {
    bg: "rgba(255,255,255,0.10)",
    iconColor: "rgba(255,255,255,0.60)",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
  action_required: {
    bg: "rgba(10,132,255,0.16)",
    iconColor: "rgba(10,132,255,0.92)",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  if (hrs < 48) return "Yesterday"
  return `${Math.floor(hrs / 24)}d ago`
}

const SWIPE_THRESHOLD = 80

export function NotificationCard({
  notification: n,
  isExpanded,
  onToggleExpand,
  onRead,
  onDismiss,
  onAction,
}: Props) {
  const [swipeX, setSwipeX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const touchStartX = useRef(0)

  const cfg = TYPE_CONFIG[n.type]

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]!.clientX
    setDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0]!.clientX - touchStartX.current
    setSwipeX(delta)
  }

  const handleTouchEnd = () => {
    setDragging(false)
    if (swipeX < -SWIPE_THRESHOLD) {
      setSwipeX(-320)
      setTimeout(() => onDismiss(n.id), 180)
    } else if (swipeX > SWIPE_THRESHOLD && !n.isRead) {
      setSwipeX(320)
      setTimeout(() => onRead(n.id), 180)
    } else {
      setSwipeX(0)
    }
  }

  const springTransition = dragging
    ? "none"
    : "transform 0.38s cubic-bezier(0.34,1.56,0.64,1), opacity 0.22s ease"

  const opacity = n.isRead ? 0.6 : 1

  return (
    <div className="relative overflow-hidden rounded-[16px] mb-2">
      {/* Behind-swipe affordance indicators */}
      <div
        className="absolute inset-0 rounded-[16px] flex items-center"
        style={{
          background:
            swipeX < -20
              ? "rgba(255,59,48,0.18)"
              : swipeX > 20
                ? "rgba(48,209,88,0.18)"
                : "transparent",
          justifyContent: swipeX < 0 ? "flex-end" : "flex-start",
          paddingInline: 16,
          transition: "background 0.15s",
        }}
        aria-hidden="true"
      >
        {swipeX < -20 && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,99,90,0.8)"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
        )}
        {swipeX > 20 && !n.isRead && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(48,209,88,0.8)"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>

      {/* Card */}
      <div
        onClick={() => onToggleExpand(n.id)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative flex gap-3 p-3.5 cursor-pointer"
        style={{
          background: n.isRead ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.075)",
          border: `1px solid ${n.isRead ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.12)"}`,
          borderRadius: 16,
          backdropFilter: "blur(32px)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.09)",
          opacity,
          transform: `translateX(${swipeX}px)`,
          transition: springTransition,
        }}
      >
        {/* Icon */}
        <div
          className="w-9 h-9 rounded-[11px] flex items-center justify-center flex-shrink-0"
          style={{ background: cfg.bg, color: cfg.iconColor }}
        >
          {cfg.icon}
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[13px] leading-snug mb-0.5"
            style={{
              fontWeight: n.isRead ? 500 : 600,
              color: n.isRead ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.90)",
              textDecoration: n.isRead ? "none" : "none",
            }}
          >
            {n.title}
          </p>
          {n.body && (
            <p
              className="text-[12px] leading-relaxed mb-1.5"
              style={{ color: "rgba(255,255,255,0.40)" }}
            >
              {n.body}
            </p>
          )}
          <div className="flex items-center gap-2">
            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.26)" }}>
              {formatRelativeTime(n.createdAt)}
            </span>
            {n.entityType && n.entityType !== "system" && (
              <span
                className="text-[9px] font-semibold uppercase tracking-wider"
                style={{ color: "rgba(255,255,255,0.22)" }}
              >
                {n.entityType.replace(/_/g, " ")}
              </span>
            )}
          </div>

          {/* Inline actions — shown when expanded or always for action_required */}
          {(isExpanded || n.type === "action_required") && n.type === "action_required" && (
            <div className="flex gap-1.5 mt-2.5">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onAction(n.id, "approve")
                }}
                className="flex-1 text-center text-[11px] font-semibold py-1.5 rounded-[8px]"
                style={{
                  background: "rgba(255,255,255,0.14)",
                  border: "1px solid rgba(255,255,255,0.20)",
                  color: "rgba(255,255,255,0.92)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.20)",
                }}
              >
                Approve
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onAction(n.id, "decline")
                }}
                className="flex-1 text-center text-[11px] font-semibold py-1.5 rounded-[8px]"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                Decline
              </button>
            </div>
          )}
        </div>

        {/* Unread dot */}
        {!n.isRead && (
          <span
            className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
            style={{ background: "rgba(255,255,255,0.65)" }}
            aria-label="Unread"
          />
        )}
      </div>
    </div>
  )
}
