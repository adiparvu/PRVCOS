"use client"

import { usePresenceStore } from "./store/presenceStore"
import type { PresenceStatus } from "./PresenceDot"
import { PresenceDot } from "./PresenceDot"

interface Props {
  userId: string
  children: React.ReactNode
  size?: 24 | 32 | 40 | 64 | 96
  className?: string
}

const RING_CONFIG: Record<number, { ring: number; dot: number; offset: number }> = {
  24: { ring: 2, dot: 6, offset: -1 },
  32: { ring: 2, dot: 8, offset: -1 },
  40: { ring: 3, dot: 8, offset: -1 },
  64: { ring: 3, dot: 10, offset: -1 },
  96: { ring: 4, dot: 12, offset: -2 },
}

export function PresenceRing({ userId, children, size = 40, className = "" }: Props) {
  const presence = usePresenceStore((s) => s.members.get(userId))
  const status: PresenceStatus = (presence?.status as PresenceStatus) ?? "offline"
  const cfg = RING_CONFIG[size] ?? RING_CONFIG[40]

  const isOffline = status === "offline"

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {/* Ring border — wraps the avatar slot */}
      <div
        style={{
          borderRadius: "inherit",
          padding: isOffline ? 0 : cfg.ring,
          background: isOffline
            ? "transparent"
            : `rgba(255,255,255,${status === "online" ? 0.9 : status === "away" || status === "on_break" ? 0.4 : 0.9})`,
          transition: "background 400ms ease",
        }}
      >
        <div style={{ borderRadius: "inherit", overflow: "hidden" }}>{children}</div>
      </div>

      {/* Presence dot — bottom-right corner */}
      {!isOffline && (
        <div
          style={{
            position: "absolute",
            bottom: cfg.offset,
            right: cfg.offset,
            border: "2px solid #000",
            borderRadius: "50%",
          }}
        >
          <PresenceDot status={status} size={cfg.dot} />
        </div>
      )}
    </div>
  )
}
