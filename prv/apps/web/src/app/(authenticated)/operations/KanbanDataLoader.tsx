"use client"

import { useEffect, useState } from "react"
import { TasksKanbanView } from "./TasksKanbanView"
import type { KanbanTask } from "./TasksKanbanView"

export function KanbanDataLoader() {
  const [tasks, setTasks] = useState<KanbanTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/operations/tasks?limit=200")
      .then((r) => r.json())
      .then((d) => setTasks(d.tasks ?? []))
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            style={{
              height: 80,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
            }}
          />
        ))}
      </div>
    )
  }

  return <TasksKanbanView initialTasks={tasks} />
}
