"use client"

import type { PresenceStatus } from "./PresenceDot"

const STATUS_LABELS: Record<PresenceStatus, string> = {
  online: "Available",
  away: "Away",
  busy: "Busy",
  offline: "Offline",
  in_meeting: "In a meeting",
  on_break: "On break",
  do_not_disturb: "Do not disturb",
}

interface Props {
  status: PresenceStatus
  message?: string | null
  compact?: boolean
}

export function PresenceStatusBadge({ status, message, compact = false }: Props) {
  const label = message || STATUS_LABELS[status]
  const isOffline = status === "offline"

  if (compact) {
    return (
      <span
        className="text-[11px] font-medium"
        style={{ color: `rgba(255,255,255,${isOffline ? 0.25 : 0.5})` }}
      >
        {label}
      </span>
    )
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[100px]"
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="rounded-full shrink-0"
        style={{
          width: 5,
          height: 5,
          background: `rgba(255,255,255,${isOffline ? 0.2 : 0.7})`,
        }}
      />
      <span className="text-[11px] font-medium text-white/50 max-w-[160px] truncate">{label}</span>
    </div>
  )
}
