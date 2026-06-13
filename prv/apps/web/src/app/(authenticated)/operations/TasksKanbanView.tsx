"use client"

import { useState, useCallback } from "react"

export type KanbanStatus = "todo" | "in_progress" | "done"
export type KanbanPriority = "urgent" | "medium" | "low"

export interface KanbanTask {
  id: string
  title: string
  priority: KanbanPriority
  status: KanbanStatus
  assigneeUserId: string | null
  storeId: string | null
  isAllStores: boolean
  createdAt: string
  updatedAt: string
}

const COLUMNS: { id: KanbanStatus; label: string; color: string }[] = [
  { id: "todo", label: "De făcut", color: "rgba(255,255,255,0.45)" },
  { id: "in_progress", label: "În lucru", color: "rgba(10,132,255,0.9)" },
  { id: "done", label: "Finalizat", color: "rgba(48,209,88,0.9)" },
]

const PRIORITY_COLOR: Record<KanbanPriority, string> = {
  urgent: "rgba(255,69,58,0.95)",
  medium: "rgba(255,159,10,0.95)",
  low: "rgba(255,255,255,0.45)",
}

const PRIORITY_LABEL: Record<KanbanPriority, string> = {
  urgent: "URGENT",
  medium: "MEDIU",
  low: "MIC",
}

function PriorityBadge({ priority }: { priority: KanbanPriority }) {
  const color = PRIORITY_COLOR[priority]
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.6px",
        color,
        background: color.replace(/[\d.]+\)$/, "0.12)"),
        border: `1px solid ${color.replace(/[\d.]+\)$/, "0.28)")}`,
        borderRadius: 6,
        padding: "2px 6px",
      }}
    >
      {PRIORITY_LABEL[priority]}
    </span>
  )
}

function TaskCard({
  task,
  onStatusChange,
}: {
  task: KanbanTask
  onStatusChange: (id: string, newStatus: KanbanStatus) => void
}) {
  const [moving, setMoving] = useState(false)

  async function handleMove(newStatus: KanbanStatus) {
    if (moving || newStatus === task.status) return
    setMoving(true)
    try {
      const res = await fetch(`/api/operations/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) onStatusChange(task.id, newStatus)
    } finally {
      setMoving(false)
    }
  }

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 14,
        padding: "12px 14px",
        position: "relative",
        overflow: "hidden",
        opacity: moving ? 0.6 : 1,
        transition: "opacity 0.15s",
      }}
    >
      {/* Top shine */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent)",
        }}
      />

      <div style={{ marginBottom: 8 }}>
        <PriorityBadge priority={task.priority} />
      </div>

      <p
        style={{
          margin: 0,
          fontSize: 14,
          fontWeight: 500,
          color: "rgba(255,255,255,0.90)",
          lineHeight: 1.4,
          letterSpacing: "-0.15px",
          marginBottom: 12,
        }}
      >
        {task.title}
      </p>

      {/* Move buttons */}
      <div style={{ display: "flex", gap: 6 }}>
        {task.status !== "todo" && (
          <button
            onClick={() => handleMove(task.status === "done" ? "in_progress" : "todo")}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,255,255,0.55)",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            ← Înapoi
          </button>
        )}
        {task.status !== "done" && (
          <button
            onClick={() => handleMove(task.status === "todo" ? "in_progress" : "done")}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,255,255,0.90)",
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.20)",
              borderRadius: 8,
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            {task.status === "todo" ? "Start →" : "Finalizat →"}
          </button>
        )}
      </div>
    </div>
  )
}

function KanbanColumn({
  col,
  tasks,
  onStatusChange,
}: {
  col: (typeof COLUMNS)[0]
  tasks: KanbanTask[]
  onStatusChange: (id: string, newStatus: KanbanStatus) => void
}) {
  return (
    <div
      style={{
        flex: "0 0 300px",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      {/* Column header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 0 12px 0",
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: col.color,
            boxShadow: `0 0 6px ${col.color}`,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "rgba(255,255,255,0.85)",
            letterSpacing: "-0.1px",
          }}
        >
          {col.label}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(255,255,255,0.35)",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 8,
            padding: "1px 7px",
            marginLeft: "auto",
          }}
        >
          {tasks.length}
        </span>
      </div>

      {/* Column body */}
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 16,
          padding: 8,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          minHeight: 200,
        }}
      >
        {tasks.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "24px 0",
              color: "rgba(255,255,255,0.20)",
              fontSize: 13,
            }}
          >
            Nicio sarcină
          </div>
        ) : (
          tasks.map((t) => <TaskCard key={t.id} task={t} onStatusChange={onStatusChange} />)
        )}
      </div>
    </div>
  )
}

export function TasksKanbanView({ initialTasks }: { initialTasks: KanbanTask[] }) {
  const [tasks, setTasks] = useState<KanbanTask[]>(initialTasks)
  const [loading, setLoading] = useState(false)
  const [priorityFilter, setPriorityFilter] = useState<KanbanPriority | "all">("all")

  const handleStatusChange = useCallback((id: string, newStatus: KanbanStatus) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t
      )
    )
  }, [])

  const filtered =
    priorityFilter === "all" ? tasks : tasks.filter((t) => t.priority === priorityFilter)

  const PRIORITIES: Array<KanbanPriority | "all"> = ["all", "urgent", "medium", "low"]
  const PRIORITY_LABELS: Record<KanbanPriority | "all", string> = {
    all: "Toate",
    urgent: "Urgent",
    medium: "Mediu",
    low: "Mic",
  }

  return (
    <div style={{ padding: "0 16px 100px" }}>
      {/* Priority filter */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          scrollbarWidth: "none",
          marginBottom: 16,
          paddingBottom: 2,
        }}
      >
        {PRIORITIES.map((p) => {
          const active = priorityFilter === p
          return (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              style={{
                padding: "6px 14px",
                borderRadius: 100,
                border: active
                  ? "1px solid rgba(255,255,255,0.40)"
                  : "1px solid rgba(255,255,255,0.12)",
                background: active ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)",
                color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)",
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {PRIORITY_LABELS[p]}
            </button>
          )
        })}
      </div>

      {/* Kanban columns */}
      <div
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          scrollbarWidth: "none",
          paddingBottom: 8,
        }}
      >
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            col={col}
            tasks={filtered.filter((t) => t.status === col.id)}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>
    </div>
  )
}
