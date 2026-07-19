"use client"

import { useEffect, useState } from "react"
import { elapsedMinutes, formatDuration } from "@/lib/task-timer"

// Compact per-card timer control. `runningTaskId`/`runningStartedAt` come from a
// single board-level query so cards need no individual polling; the elapsed
// counter ticks locally while this card's timer runs.
export function TaskTimer({
  projectId,
  taskId,
  runningTaskId,
  runningStartedAt,
  onChange,
}: {
  projectId: string
  taskId: string
  runningTaskId: string | null
  runningStartedAt: string | null
  onChange: () => void
}) {
  const isThis = runningTaskId === taskId
  const otherRunning = runningTaskId !== null && !isThis
  const [busy, setBusy] = useState(false)
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!isThis) return
    const h = window.setInterval(() => setTick((n) => n + 1), 30_000)
    return () => window.clearInterval(h)
  }, [isThis])

  async function toggle(e: React.MouseEvent) {
    e.stopPropagation()
    if (busy || otherRunning) return
    setBusy(true)
    try {
      await fetch(`/api/projects/${projectId}/tasks/${taskId}/timer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: isThis ? "stop" : "start" }),
      })
      onChange()
    } finally {
      setBusy(false)
    }
  }

  const elapsed =
    isThis && runningStartedAt
      ? formatDuration(elapsedMinutes(new Date(runningStartedAt), new Date()))
      : null

  const label = isThis ? `⏸ ${elapsed ?? "0m"}` : "▶"
  const color = isThis
    ? "rgba(48,209,88,0.95)"
    : otherRunning
      ? "var(--prv-text-4)"
      : "var(--prv-text-3)"

  return (
    <button
      type="button"
      draggable={false}
      onClick={toggle}
      disabled={busy || otherRunning}
      title={
        otherRunning
          ? "Un cronometru rulează deja pe alt task"
          : isThis
            ? "Oprește cronometrul"
            : "Pornește cronometrul"
      }
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        background: isThis ? "rgba(48,209,88,0.12)" : "transparent",
        border: `1px solid ${isThis ? "rgba(48,209,88,0.3)" : "var(--prv-border)"}`,
        borderRadius: 100,
        padding: isThis ? "2px 8px" : "2px 6px",
        fontSize: 10,
        fontWeight: 700,
        color,
        cursor: busy || otherRunning ? "default" : "pointer",
        opacity: otherRunning ? 0.4 : busy ? 0.6 : 1,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {label}
    </button>
  )
}
