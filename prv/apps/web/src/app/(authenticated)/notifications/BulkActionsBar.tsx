"use client"

import type { NotificationFilter } from "@prv/db"

interface Props {
  unreadCount: number
  filter: NotificationFilter
  onMarkAllRead: () => void
  onDismissAll: () => void
}

export function BulkActionsBar({
  unreadCount,
  filter: _filter,
  onMarkAllRead,
  onDismissAll,
}: Props) {
  return (
    <div className="flex items-center justify-between mb-2.5 px-0.5">
      <span className="text-[11px] font-medium" style={{ color: "var(--prv-text-3)" }}>
        {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={onMarkAllRead}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-[7px]"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.09)",
            color: "rgba(255,255,255,0.50)",
          }}
        >
          Mark all read
        </button>
        <button
          onClick={onDismissAll}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-[7px]"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.09)",
            color: "rgba(255,255,255,0.50)",
          }}
        >
          Dismiss all
        </button>
      </div>
    </div>
  )
}
