"use client"

import { useState } from "react"
import { GlassCard, SectionLabel } from "../_shared"

export interface Task {
  id: string
  label: string
  time: string
  done: boolean
  priority?: "high" | "normal"
}

export function WorkerTaskList({ tasks: initial }: { tasks: Task[] }) {
  const [tasks, setTasks] = useState(initial)

  function toggleTask(id: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  const doneCount = tasks.filter((t) => t.done).length
  const progress = (doneCount / tasks.length) * 100

  return (
    <GlassCard className="mb-3.5">
      <div className="flex items-center justify-between mb-2">
        <SectionLabel>Tasks today · {tasks.length}</SectionLabel>
        <span className="text-[11px] font-medium" style={{ color: "var(--prv-text-3)" }}>
          {doneCount}/{tasks.length} done
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="w-full h-1 rounded-full mb-3"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: progress === 100 ? "rgba(48,209,88,0.80)" : "rgba(255,255,255,0.35)",
          }}
        />
      </div>

      <div className="flex flex-col">
        {tasks.map((task) => (
          <button
            key={task.id}
            type="button"
            onClick={() => toggleTask(task.id)}
            className="flex items-center gap-3 py-2.5 text-left w-full"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            {/* Checkbox */}
            <span
              className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border transition-all"
              style={{
                background: task.done ? "rgba(48,209,88,0.20)" : "transparent",
                borderColor: task.done ? "rgba(48,209,88,0.60)" : "rgba(255,255,255,0.20)",
              }}
              aria-hidden="true"
            >
              {task.done && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="rgba(48,209,88,0.9)"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <polyline points="2 6 5 9 10 3" />
                </svg>
              )}
            </span>

            {/* Priority dot */}
            {task.priority === "high" && !task.done && (
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: "rgba(255,159,10,0.9)" }}
                aria-label="High priority"
              />
            )}

            <span
              className="flex-1 text-[13px] leading-snug"
              style={{
                color: task.done ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.80)",
                textDecoration: task.done ? "line-through" : "none",
              }}
            >
              {task.label}
            </span>
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.28)" }}>
              {task.time}
            </span>
          </button>
        ))}
      </div>
    </GlassCard>
  )
}
