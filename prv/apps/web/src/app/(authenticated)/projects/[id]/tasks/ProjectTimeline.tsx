"use client"

import { useMemo, useRef, useState } from "react"
import { timelineWindow, datePct, pctToISO } from "@/lib/gantt"

interface TaskLike {
  id: string
  title: string
  status: string
  dueDate: string | null
}

const clampN = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n))
const todayISO = (): string => new Date().toISOString().slice(0, 10)

const STATUS_COLOR: Record<string, string> = {
  done: "rgba(48,209,88,0.9)",
  cancelled: "rgba(255,255,255,0.3)",
  in_progress: "rgba(10,132,255,0.9)",
  review: "rgba(255,159,10,0.9)",
  todo: "rgba(255,255,255,0.55)",
  blocked: "rgba(255,69,58,0.9)",
}

// Date-anchored timeline (Gantt) with drag-to-reschedule. Each task sits at its
// due date along the window; dragging its handle horizontally sets a new due
// date, committed on release.
export function ProjectTimeline({
  tasks,
  onReschedule,
}: {
  tasks: TaskLike[]
  onReschedule: (taskId: string, dueDate: string) => void
}) {
  const dated = tasks.filter((t) => t.dueDate)
  const undated = tasks.filter((t) => !t.dueDate)
  const { startISO, endISO } = useMemo(
    () => timelineWindow(dated.map((t) => t.dueDate as string)),
    [dated]
  )
  const trackRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<{ id: string; pct: number } | null>(null)
  const today = todayISO()

  function pointerMove(e: React.PointerEvent) {
    if (!drag || !trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    setDrag({ id: drag.id, pct: clampN(((e.clientX - rect.left) / rect.width) * 100, 0, 100) })
  }
  function pointerUp() {
    if (!drag) return
    onReschedule(drag.id, pctToISO(drag.pct, startISO, endISO))
    setDrag(null)
  }

  if (dated.length === 0) {
    return (
      <p style={{ padding: "40px 20px", color: "var(--prv-text-4)", fontSize: 13 }}>
        No tasks with a due date to place on the timeline.
      </p>
    )
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "var(--prv-text-3)",
          padding: "0 2px 6px",
        }}
      >
        <span>{startISO}</span>
        <span>Today {today}</span>
        <span>{endISO}</span>
      </div>
      <div
        ref={trackRef}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerLeave={pointerUp}
        style={{
          position: "relative",
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 16,
          padding: "8px 0",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${datePct(today, startISO, endISO)}%`,
            width: 1,
            background: "rgba(255,255,255,0.22)",
          }}
        />
        {dated.map((t) => {
          const pct = drag?.id === t.id ? drag.pct : datePct(t.dueDate as string, startISO, endISO)
          const color = STATUS_COLOR[t.status] ?? "rgba(255,255,255,0.55)"
          return (
            <div
              key={t.id}
              style={{ position: "relative", height: 32, display: "flex", alignItems: "center" }}
            >
              <span
                style={{
                  position: "absolute",
                  left: 12,
                  fontSize: 12.5,
                  color: "var(--prv-text-1)",
                  maxWidth: "45%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                }}
              >
                {t.title}
              </span>
              <div
                role="slider"
                aria-label={`${t.title} due date`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(pct)}
                aria-valuetext={
                  drag?.id === t.id ? pctToISO(drag.pct, startISO, endISO) : (t.dueDate as string)
                }
                onPointerDown={(e) => {
                  e.preventDefault()
                  ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
                  setDrag({ id: t.id, pct })
                }}
                title={`${t.title} · ${
                  drag?.id === t.id ? pctToISO(drag.pct, startISO, endISO) : t.dueDate
                }`}
                style={{
                  position: "absolute",
                  left: `${pct}%`,
                  transform: "translateX(-50%)",
                  width: 15,
                  height: 15,
                  borderRadius: 8,
                  background: color,
                  border: "2px solid rgba(0,0,0,0.4)",
                  cursor: "grab",
                  touchAction: "none",
                }}
              />
            </div>
          )
        })}
      </div>
      {undated.length > 0 && (
        <p style={{ fontSize: 11.5, color: "var(--prv-text-3)", margin: "8px 2px 0" }}>
          {undated.length} task{undated.length === 1 ? "" : "s"} without a due date not shown.
        </p>
      )}
    </div>
  )
}
