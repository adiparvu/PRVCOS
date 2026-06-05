"use client"

import { useEffect } from "react"
import { usePresenceStore } from "./store/presenceStore"
import { usePresence } from "./hooks/usePresence"
import { PresenceDot } from "./PresenceDot"
import type { PresenceStatus } from "./PresenceDot"

interface Props {
  companyId: string
  currentUserId?: string
}

const VISIBLE_LIMIT = 7

export function OnlineNowPanel({ companyId, currentUserId = "" }: Props) {
  usePresence({ companyId, currentUserId })

  const members = usePresenceStore((s) => s.members)
  const online = Array.from(members.values()).filter((m) => m.status !== "offline")

  const visible = online.slice(0, VISIBLE_LIMIT)
  const overflow = Math.max(0, online.length - VISIBLE_LIMIT)

  if (online.length === 0) return null

  return (
    <div
      className="rounded-[20px] p-5"
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-medium text-white/35 uppercase tracking-widest">
            Online Now
          </p>
          <div
            className="px-1.5 py-0.5 rounded-[100px] text-[10px] font-semibold text-white/50"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            {online.length}
          </div>
        </div>
        <a
          href="/people?status=online"
          className="text-[12px] text-white/35 hover:text-white/60 transition-colors"
        >
          See all →
        </a>
      </div>

      <div className="flex items-center gap-2">
        {visible.map((member) => (
          <OnlineAvatar key={member.userId} member={member} />
        ))}
        {overflow > 0 && (
          <div
            className="w-9 h-9 rounded-[12px] flex items-center justify-center text-[11px] font-semibold text-white/40 shrink-0"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            +{overflow}
          </div>
        )}
      </div>
    </div>
  )
}

function OnlineAvatar({ member }: { member: { userId: string; status: string } }) {
  const initials = member.userId.slice(0, 2).toUpperCase()

  return (
    <div className="relative shrink-0" title={member.status}>
      <div
        className="w-9 h-9 rounded-[12px] flex items-center justify-center text-[11px] font-semibold text-white/50"
        style={{
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        {initials}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: -1,
          right: -1,
          border: "2px solid #000",
          borderRadius: "50%",
        }}
      >
        <PresenceDot status={member.status as PresenceStatus} size={8} />
      </div>
    </div>
  )
}
