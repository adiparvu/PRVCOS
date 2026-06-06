"use client"

import type { NotificationCounts, NotificationFilter } from "@prv/db"

interface Props {
  filter: NotificationFilter
  counts: NotificationCounts
  onChange: (f: NotificationFilter) => void
}

const TABS: { key: NotificationFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "alerts", label: "Alerts" },
  { key: "approvals", label: "Approvals" },
  { key: "inbox", label: "Inbox" },
  { key: "system", label: "System" },
]

export function NotificationFilters({ filter, counts, onChange }: Props) {
  return (
    <div className="flex gap-1.5 overflow-x-auto mb-3.5 pb-0.5" style={{ scrollbarWidth: "none" }}>
      {TABS.map(({ key, label }) => {
        const count = counts[key]
        const active = filter === key
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[100px] text-[11px] font-semibold transition-all"
            style={{
              background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${active ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.09)"}`,
              color: active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.38)",
              boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.18)" : "none",
            }}
          >
            {label}
            {count > 0 && (
              <span
                className="flex items-center justify-center min-w-[16px] h-4 rounded-full text-[9px] font-bold px-1"
                style={{
                  background: active
                    ? "rgba(255,255,255,0.25)"
                    : key === "alerts"
                      ? "rgba(255,69,58,0.80)"
                      : key === "approvals"
                        ? "rgba(10,132,255,0.80)"
                        : "rgba(255,255,255,0.18)",
                  color: active ? "rgba(255,255,255,0.90)" : "#fff",
                }}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
