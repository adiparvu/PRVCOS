"use client"

import { useState } from "react"
import { useLiveShift } from "@/hooks/realtime"
import { GlassCard } from "../_shared"

interface Props {
  userId: string
}

// Best-effort browser geolocation; resolves to null coords if unavailable/denied.
function getPosition(): Promise<{ lat: number; lng: number; accuracy: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 }
    )
  })
}

export function LiveShiftCard({ userId }: Props) {
  const shift = useLiveShift(userId)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!shift.hasShift) return null

  const badge = shift.isClockedOut
    ? { label: "Done", bg: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.45)" }
    : shift.isClockedIn
      ? { label: "Active", bg: "rgba(80,220,120,0.16)", color: "rgba(80,220,120,0.90)" }
      : { label: "Scheduled", bg: "rgba(10,132,255,0.14)", color: "rgba(10,132,255,0.90)" }

  const clockMode: "in" | "out" | null = shift.isClockedOut
    ? null
    : shift.isClockedIn
      ? "out"
      : "in"

  async function clock() {
    setBusy(true)
    setError(null)
    try {
      const pos = await getPosition()
      const res = await fetch("/api/me/shift", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(pos ? { ...pos, method: "web" } : { method: "web" }),
      })
      if (!res.ok) throw new Error("Clock action failed")
      shift.refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  async function toggleBreak() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/me/shift", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intent: shift.onBreak ? "break_end" : "break_start" }),
      })
      if (!res.ok) throw new Error("Break action failed")
      shift.refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setBusy(false)
    }
  }

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

      {clockMode && (
        <button
          type="button"
          disabled={busy}
          onClick={clock}
          className="mt-3 w-full rounded-[12px] py-2.5 text-[13px] font-semibold transition-all"
          style={{
            background: clockMode === "in" ? "rgba(80,220,120,0.16)" : "rgba(255,255,255,0.9)",
            border: clockMode === "in" ? "1px solid rgba(80,220,120,0.30)" : "none",
            color: clockMode === "in" ? "rgba(120,240,150,0.95)" : "#000",
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? "…" : clockMode === "in" ? "Clock In" : "Clock Out"}
        </button>
      )}
      {clockMode === "out" && (
        <button
          type="button"
          disabled={busy}
          onClick={toggleBreak}
          className="mt-2 w-full rounded-[12px] py-2 text-[12.5px] font-semibold transition-all"
          style={{
            background: shift.onBreak ? "rgba(255,179,64,0.16)" : "rgba(255,255,255,0.06)",
            border: `1px solid ${shift.onBreak ? "rgba(255,179,64,0.30)" : "rgba(255,255,255,0.10)"}`,
            color: shift.onBreak ? "rgba(255,199,110,0.95)" : "var(--prv-text-2)",
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.6 : 1,
          }}
        >
          {shift.onBreak ? "End Break" : "Start Break"}
        </button>
      )}
      {error && (
        <p className="mt-2 text-[11px]" style={{ color: "rgba(255,99,90,0.9)" }}>
          {error}
        </p>
      )}
    </GlassCard>
  )
}
