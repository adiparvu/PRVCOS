"use client"

import { useCallback, useEffect, useState } from "react"
import { useToast } from "@prv/ui"
import type { TaskTemplateDto } from "@/app/api/projects/task-templates/route"
import { TASK_PRIORITIES, type TaskPriority } from "@/lib/task-template"

type DraftItem = { title: string; priority: TaskPriority; estimatedHours: string }

const card: React.CSSProperties = {
  background: "var(--prv-g1)",
  border: "1px solid var(--prv-border)",
  borderRadius: 18,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
}
const input: React.CSSProperties = {
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid var(--prv-border)",
  borderRadius: 10,
  padding: "9px 10px",
  color: "var(--prv-text-1)",
  fontSize: 13.5,
  fontFamily: "inherit",
}
const label: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--prv-text-3)",
  fontWeight: 600,
  display: "block",
  marginBottom: 6,
}

export function TaskTemplatesClient() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<TaskTemplateDto[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [items, setItems] = useState<DraftItem[]>([
    { title: "", priority: "medium", estimatedHours: "" },
  ])

  const load = useCallback(() => {
    return fetch("/api/projects/task-templates")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((d: { templates: TaskTemplateDto[] }) => setTemplates(d.templates))
      .catch(() => setTemplates([]))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const validItems = items.filter((i) => i.title.trim().length > 0)
  const canCreate = name.trim().length > 0 && validItems.length > 0 && !busy

  const reset = () => {
    setName("")
    setDescription("")
    setItems([{ title: "", priority: "medium", estimatedHours: "" }])
    setShowForm(false)
  }

  const create = () => {
    if (!canCreate) return
    setBusy(true)
    fetch("/api/projects/task-templates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || undefined,
        items: validItems.map((i) => ({
          title: i.title.trim(),
          priority: i.priority,
          estimatedHours: i.estimatedHours.trim() || null,
        })),
      }),
    })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          throw new Error(j.error ?? "Create failed")
        }
        reset()
        await load()
        toast.success("Șablon creat")
      })
      .catch((e) => toast.error("Nu s-a putut crea", e instanceof Error ? e.message : undefined))
      .finally(() => setBusy(false))
  }

  const remove = (t: TaskTemplateDto) => {
    if (!window.confirm(`Ștergi șablonul „${t.name}'?`)) return
    setBusy(true)
    fetch(`/api/projects/task-templates/${t.id}`, { method: "DELETE" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Delete failed")
        await load()
        toast.success("Șablon șters")
      })
      .catch(() => toast.error("Nu s-a putut șterge"))
      .finally(() => setBusy(false))
  }

  const setItem = (i: number, patch: Partial<DraftItem>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "36px 24px 80px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>
            Șabloane task-uri
          </h1>
          <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
            Checklist-uri reutilizabile aplicabile pe orice proiect
          </div>
        </div>
        <button
          type="button"
          onClick={() => (showForm ? reset() : setShowForm(true))}
          style={{
            background: showForm ? "rgba(255,255,255,0.06)" : "#fff",
            color: showForm ? "var(--prv-text-2)" : "#000",
            border: showForm ? "1px solid var(--prv-border)" : "none",
            borderRadius: 12,
            padding: "10px 16px",
            fontSize: 13.5,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {showForm ? "Anulează" : "＋ Șablon nou"}
        </button>
      </div>

      {showForm && (
        <div style={{ ...card, padding: 20, marginTop: 20, display: "grid", gap: 14 }}>
          <div>
            <span style={label}>Nume</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ ...input, width: "100%" }}
              placeholder="Renovare baie — standard"
            />
          </div>
          <div>
            <span style={label}>Descriere (opțional)</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ ...input, width: "100%" }}
              placeholder="Pașii standard pentru o baie"
            />
          </div>
          <div>
            <span style={label}>Task-uri</span>
            <div style={{ display: "grid", gap: 8 }}>
              {items.map((it, i) => (
                <div
                  key={i}
                  style={{ display: "grid", gridTemplateColumns: "1fr 120px 90px 32px", gap: 8 }}
                >
                  <input
                    value={it.title}
                    onChange={(e) => setItem(i, { title: e.target.value })}
                    style={input}
                    placeholder={`Task ${i + 1}`}
                  />
                  <select
                    value={it.priority}
                    onChange={(e) => setItem(i, { priority: e.target.value as TaskPriority })}
                    style={input}
                  >
                    {TASK_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <input
                    value={it.estimatedHours}
                    onChange={(e) => setItem(i, { estimatedHours: e.target.value })}
                    style={input}
                    placeholder="ore"
                    inputMode="decimal"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setItems((prev) =>
                        prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev
                      )
                    }
                    style={{
                      ...input,
                      cursor: "pointer",
                      padding: 0,
                      color: "rgba(255,69,58,0.9)",
                      fontWeight: 700,
                    }}
                    title="Elimină"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setItems((prev) => [...prev, { title: "", priority: "medium", estimatedHours: "" }])
              }
              style={{
                marginTop: 8,
                background: "none",
                border: "1px dashed var(--prv-border)",
                borderRadius: 10,
                padding: "8px 12px",
                color: "var(--prv-text-3)",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ＋ Adaugă task
            </button>
          </div>
          <button
            type="button"
            disabled={!canCreate}
            onClick={create}
            style={{
              background: canCreate ? "#fff" : "rgba(255,255,255,0.07)",
              color: canCreate ? "#000" : "var(--prv-text-3)",
              border: "none",
              borderRadius: 11,
              padding: 12,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: canCreate ? "pointer" : "default",
            }}
          >
            Salvează șablonul ({validItems.length} task-uri)
          </button>
        </div>
      )}

      <div style={{ marginTop: 24, display: "grid", gap: 12 }}>
        {templates === null ? (
          <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Se încarcă…</div>
        ) : templates.length === 0 ? (
          <div style={{ ...card, padding: 24, color: "var(--prv-text-3)", fontSize: 14 }}>
            Niciun șablon. Creează unul și aplică-l apoi din board-ul oricărui proiect.
          </div>
        ) : (
          templates.map((t) => (
            <div key={t.id} style={{ ...card, padding: "16px 18px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 640 }}>{t.name}</div>
                  {t.description && (
                    <div style={{ fontSize: 12.5, color: "var(--prv-text-3)", marginTop: 3 }}>
                      {t.description}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--prv-text-3)",
                      marginTop: 6,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                    }}
                  >
                    {t.items.slice(0, 6).map((it, i) => (
                      <span
                        key={i}
                        style={{
                          background: "var(--prv-g2)",
                          borderRadius: 100,
                          padding: "2px 9px",
                        }}
                      >
                        {it.title}
                      </span>
                    ))}
                    {t.itemCount > 6 && (
                      <span style={{ padding: "2px 4px" }}>+{t.itemCount - 6}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(t)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255,69,58,0.9)",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  Șterge
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
