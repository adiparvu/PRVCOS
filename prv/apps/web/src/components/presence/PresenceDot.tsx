"use client"

export type PresenceStatus =
  | "online"
  | "away"
  | "busy"
  | "offline"
  | "in_meeting"
  | "on_break"
  | "do_not_disturb"

const STATUS_CONFIG: Record<PresenceStatus, { opacity: number; pulse: boolean; glyph?: string }> = {
  online: { opacity: 0.9, pulse: true },
  away: { opacity: 0.4, pulse: false },
  busy: { opacity: 0.9, pulse: false, glyph: "slash" },
  offline: { opacity: 0.2, pulse: false },
  in_meeting: { opacity: 0.9, pulse: false, glyph: "calendar" },
  on_break: { opacity: 0.5, pulse: false, glyph: "pause" },
  do_not_disturb: { opacity: 0.9, pulse: false, glyph: "minus" },
}

interface Props {
  status: PresenceStatus
  size?: number
  className?: string
}

export function PresenceDot({ status, size = 8, className = "" }: Props) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.offline

  if (status === "offline") {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: `${Math.max(1, size / 6)}px solid rgba(255,255,255,0.20)`,
          background: "transparent",
        }}
      />
    )
  }

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `rgba(255,255,255,${cfg.opacity})`,
        boxShadow: cfg.pulse ? `0 0 0 0 rgba(255,255,255,0.4)` : undefined,
        animation: cfg.pulse ? "presence-pulse 2.4s cubic-bezier(0.4,0,0.2,1) infinite" : undefined,
        position: "relative",
      }}
    >
      {cfg.glyph === "slash" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "120%",
              height: `${Math.max(1, size / 8)}px`,
              background: "rgba(0,0,0,0.7)",
              transform: "rotate(-45deg)",
              borderRadius: 1,
            }}
          />
        </div>
      )}
      {cfg.glyph === "minus" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "60%",
              height: `${Math.max(1, size / 8)}px`,
              background: "rgba(0,0,0,0.7)",
              borderRadius: 1,
            }}
          />
        </div>
      )}
    </div>
  )
}
