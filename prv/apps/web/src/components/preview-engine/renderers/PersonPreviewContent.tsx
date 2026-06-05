"use client"

import type { PreviewPayload } from "../types"
import { PresenceDot } from "@/components/presence/PresenceDot"
import { PresenceStatusBadge } from "@/components/presence/PresenceStatusBadge"

interface Props {
  payload: PreviewPayload
  onAction: (actionId: string) => void
}

const QUICK_ACTIONS = [
  {
    id: "call",
    label: "Call",
    icon: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 13 19.79 19.79 0 0 1 1 4.18 2 2 0 0 1 2.98 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 17Z",
  },
  {
    id: "mail",
    label: "Mail",
    icon: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2ZM22 6l-10 7L2 6",
  },
  {
    id: "message",
    label: "Message",
    icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z",
  },
  {
    id: "share_card",
    label: "Card",
    icon: "M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z",
  },
]

export function PersonPreviewContent({ payload, onAction }: Props) {
  const initials = payload.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <div className="flex flex-col gap-5">
      {/* Header — avatar + name + presence */}
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          {payload.avatarUrl ? (
            <img
              src={payload.avatarUrl}
              alt={payload.name}
              className="w-16 h-16 rounded-[18px] object-cover"
              style={{ border: "1px solid rgba(255,255,255,0.12)" }}
            />
          ) : (
            <div
              className="w-16 h-16 rounded-[18px] flex items-center justify-center text-white/70 text-[20px] font-semibold"
              style={{
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              {initials}
            </div>
          )}
          {payload.presence && (
            <div className="absolute -bottom-0.5 -right-0.5">
              <PresenceDot status={payload.presence.status as never} size={12} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white/90 text-[17px] font-semibold truncate">{payload.name}</p>
          {payload.subtitle && (
            <p className="text-white/50 text-[13px] mt-0.5 truncate">{payload.subtitle}</p>
          )}
          {payload.presence && (
            <div className="mt-1.5">
              <PresenceStatusBadge
                status={payload.presence.status as never}
                message={payload.presence.statusMessage}
              />
            </div>
          )}
        </div>
      </div>

      {/* Quick action buttons */}
      <div className="grid grid-cols-4 gap-2">
        {QUICK_ACTIONS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => onAction(id)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-[14px] transition-all active:scale-95"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white/70"
            >
              <path d={icon} />
            </svg>
            <span className="text-[10px] font-medium text-white/50">{label}</span>
          </button>
        ))}
      </div>

      {/* Metadata rows */}
      {payload.metadata.length > 0 && (
        <div
          className="rounded-[14px] overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {payload.metadata.map(({ label, value }, i) => (
            <div
              key={label}
              className="flex items-center justify-between px-4 py-3"
              style={{
                borderTop: i > 0 ? "1px solid rgba(255,255,255,0.06)" : undefined,
              }}
            >
              <span className="text-[13px] text-white/40">{label}</span>
              <span className="text-[13px] text-white/80 font-medium">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
