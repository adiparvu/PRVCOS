"use client"

import { useLiveShift } from "@/hooks/realtime"
import { GlassCard } from "../_shared"

interface Props {
  userId: string
}

export function LiveShiftCard({ userId }: Props) {
  const shift = useLiveShift(userId)

  if (!shift.hasShift) return null

  const badge = shift.isClockedOut
    ? { label: "Done", bg: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.45)" }
    : shift.isClockedIn
      ? { label: "Active", bg: "rgba(80,220,120,0.16)", color: "rgba(80,220,120,0.90)" }
      : { label: "Scheduled", bg: "rgba(10,132,255,0.14)", color: "rgba(10,132,255,0.90)" }

  return (
    <GlassCard className="mb-3.5">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p
            className="text-[26px] font-bold tracking-tight leading-tight"
            style={{ color: "var(--prv-text-1)" }}
          >
            {shift.start} – {shift.end}
          </p>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--prv-text-3)" }}>
            {shift.location}
            {!shift.isClockedOut && shift.remainingH + shift.remainingM > 0
              ? ` · ${shift.remainingH}h ${shift.remainingM}m remaining`
              : ""}
          </p>
        </div>
        <span
          className="text-[10px] font-bold px-2 py-1 rounded-[8px]"
          style={{ background: badge.bg, color: badge.color }}
        >
          {badge.label}
        </span>
      </div>
      <div
        className="h-1 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.08)" }}
        role="progressbar"
        aria-valuenow={shift.progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Shift progress"
      >
        <div
          className="h-full rounded-full transition-[width] duration-[1200ms] ease-out"
          style={{
            width: `${shift.progressPct}%`,
            background: shift.isClockedOut ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.55)",
          }}
        />
      </div>
    </GlassCard>
  )
}
