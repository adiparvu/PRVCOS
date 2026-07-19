"use client"

import { useMemo, useState } from "react"
import { ProjectTimeline } from "./ProjectTimeline"
import Link from "next/link"
import {
  useProjectTasks,
  useUpdateTask,
  useCreateTask,
  type TaskSummary,
  type ProjectTaskStatus,
} from "@/lib/api-hooks"

const COLUMNS: { status: ProjectTaskStatus; label: string }[] = [
  { status: "backlog", label: "Backlog" },
  { status: "todo", label: "To Do" },
  { status: "in_progress", label: "In Progress" },
  { status: "review", label: "Review" },
  { status: "done", label: "Done" },
]

const PRIORITY_DOT: Record<TaskSummary["priority"], string> = {
  critical: "rgba(255,69,58,0.9)",
  high: "rgba(255,159,10,0.95)",
  medium: "rgba(255,255,255,0.6)",
  low: "rgba(255,255,255,0.32)",
}

function initials(name: string | null): string {
  if (!name) return "—"
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "—"
}

function hoursLabel(t: TaskSummary): string | null {
  if (t.estimatedHours == null && t.actualHours == null) return null
  if (t.actualHours != null && t.estimatedHours != null)
    return `${t.actualHours} / ${t.estimatedHours}h`
  if (t.estimatedHours != null) return `${t.estimatedHours}h`
  return `${t.actualHours}h`
}

export function TaskBoardClient({ id }: { id: string }) {
  const { data, isLoading } = useProjectTasks(id)
  const update = useUpdateTask(id)
  const create = useCreateTask(id)

  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<ProjectTaskStatus | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [addingIn, setAddingIn] = useState<ProjectTaskStatus | null>(null)
  const [draftTitle, setDraftTitle] = useState("")
  const [view, setView] = useState<"board" | "timeline">("board")

  const tasks = useMemo(() => data?.tasks ?? [], [data])
  const subtaskCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of tasks)
      if (t.parentTaskId) m.set(t.parentTaskId, (m.get(t.parentTaskId) ?? 0) + 1)
    return m
  }, [tasks])
  const doneIds = useMemo(
    () =>
      new Set(
        tasks.filter((t) => t.status === "done" || t.status === "cancelled").map((t) => t.id)
      ),
    [tasks]
  )
  const byStatus = (s: ProjectTaskStatus) => tasks.filter((t) => t.status === s)

  function flashNotice(msg: string) {
    setNotice(msg)
    window.setTimeout(() => setNotice(null), 3200)
  }

  function onDrop(status: ProjectTaskStatus) {
    setOverCol(null)
    const task = tasks.find((t) => t.id === dragId)
    setDragId(null)
    if (!task || task.status === status) return
    update.mutate(
      { taskId: task.id, patch: { status } },
      {
        onError: (err) => {
          const e = err as Error & { code?: string }
          flashNotice(
            e.code === "TASK_BLOCKED"
              ? `"${task.title}" is blocked by an unfinished dependency.`
              : "Could not move task."
          )
        },
      }
    )
  }

  function submitDraft(status: ProjectTaskStatus) {
    const title = draftTitle.trim()
    if (!title) {
      setAddingIn(null)
      return
    }
    create.mutate({ title, status })
    setDraftTitle("")
    setAddingIn(null)
  }

  return (
    <div style={{ padding: "8px 4px 60px" }}>
      <Link
        href={`/projects/${id}`}
        style={{
          fontSize: 12.5,
          color: "var(--prv-text-3)",
          textDecoration: "none",
          display: "inline-flex",
          gap: 5,
          marginBottom: 12,
        }}
      >
        ‹ Back to project
      </Link>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--prv-text-3)",
        }}
      >
        Project · Tasks
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          margin: "3px 0 20px",
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 680, letterSpacing: "-0.02em", margin: 0 }}>
          Task Board
        </h1>
        <div
          style={{
            display: "flex",
            gap: 2,
            padding: 3,
            borderRadius: 10,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
          }}
        >
          {(["board", "timeline"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              style={{
                padding: "5px 12px",
                borderRadius: 8,
                border: "none",
                fontSize: 12,
                fontWeight: 600,
                textTransform: "capitalize",
                cursor: "pointer",
                background: view === v ? "rgba(255,255,255,0.9)" : "transparent",
                color: view === v ? "#000" : "var(--prv-text-2)",
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div
          role="status"
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 12,
            fontSize: 12.5,
            color: "rgba(255,69,58,0.95)",
            background: "rgba(255,69,58,0.12)",
            border: "1px solid rgba(255,69,58,0.28)",
          }}
        >
          {notice}
        </div>
      )}

      {isLoading ? (
        <p style={{ padding: "40px 20px", color: "var(--prv-text-4)" }}>Loading tasks…</p>
      ) : view === "timeline" ? (
        <ProjectTimeline
          tasks={tasks}
          onReschedule={(taskId, dueDate) => update.mutate({ taskId, patch: { dueDate } })}
        />
      ) : (
        <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8 }}>
          {COLUMNS.map((col) => {
            const colTasks = byStatus(col.status)
            return (
              <div key={col.status} style={{ flex: "0 0 260px" }}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px 12px" }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--prv-text-2)",
                    }}
                  >
                    {col.label}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--prv-text-3)",
                      background: "var(--prv-g1)",
                      border: "1px solid var(--prv-border-subtle)",
                      borderRadius: 100,
                      padding: "1px 8px",
                    }}
                  >
                    {colTasks.length}
                  </span>
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    if (overCol !== col.status) setOverCol(col.status)
                  }}
                  onDragLeave={() => setOverCol((c) => (c === col.status ? null : c))}
                  onDrop={() => onDrop(col.status)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    borderRadius: 20,
                    padding: 10,
                    minHeight: 120,
                    background:
                      overCol === col.status ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                    border:
                      overCol === col.status
                        ? "1px solid var(--prv-border)"
                        : "1px solid var(--prv-border-subtle)",
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                >
                  {colTasks.map((t) => {
                    const blocked =
                      !!t.dependsOnTaskId && !doneIds.has(t.dependsOnTaskId) && t.status !== "done"
                    const hrs = hoursLabel(t)
                    const subs = subtaskCounts.get(t.id) ?? 0
                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={() => setDragId(t.id)}
                        onDragEnd={() => {
                          setDragId(null)
                          setOverCol(null)
                        }}
                        style={{
                          borderRadius: 16,
                          padding: "12px 13px",
                          background: "var(--prv-g1)",
                          border: "1px solid var(--prv-border-subtle)",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
                          cursor: "grab",
                          opacity: dragId === t.id ? 0.5 : 1,
                        }}
                      >
                        <div
                          style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}
                        >
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: PRIORITY_DOT[t.priority],
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: "0.04em",
                              textTransform: "capitalize",
                              color: "var(--prv-text-4)",
                            }}
                          >
                            {t.priority}
                          </span>
                          {blocked && (
                            <span
                              style={{
                                marginLeft: "auto",
                                fontSize: 9,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                color: "rgba(255,69,58,0.9)",
                                background: "rgba(255,69,58,0.14)",
                                border: "1px solid rgba(255,69,58,0.3)",
                                borderRadius: 100,
                                padding: "2px 7px",
                              }}
                            >
                              Blocked
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 13.5,
                            fontWeight: 600,
                            lineHeight: 1.35,
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {t.title}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--prv-text-3)",
                            marginTop: 8,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 7,
                              background: "var(--prv-g2)",
                              display: "grid",
                              placeItems: "center",
                              fontSize: 9.5,
                              fontWeight: 700,
                              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
                            }}
                          >
                            {initials(t.assigneeName)}
                          </span>
                          <span style={{ marginLeft: "auto", display: "flex", gap: 9 }}>
                            {subs > 0 && <span>↳ {subs}</span>}
                            {hrs && <span>{hrs}</span>}
                          </span>
                        </div>
                      </div>
                    )
                  })}

                  {addingIn === col.status ? (
                    <input
                      autoFocus
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      onBlur={() => submitDraft(col.status)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitDraft(col.status)
                        if (e.key === "Escape") {
                          setDraftTitle("")
                          setAddingIn(null)
                        }
                      }}
                      placeholder="Task title…"
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        background: "var(--prv-g1)",
                        border: "1px solid var(--prv-border)",
                        color: "var(--prv-text-1)",
                        fontSize: 13,
                        outline: "none",
                        fontFamily: "inherit",
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => {
                        setDraftTitle("")
                        setAddingIn(col.status)
                      }}
                      style={{
                        padding: 9,
                        borderRadius: 12,
                        border: "1px dashed var(--prv-border)",
                        background: "transparent",
                        color: "var(--prv-text-3)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      ＋ Add task
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
