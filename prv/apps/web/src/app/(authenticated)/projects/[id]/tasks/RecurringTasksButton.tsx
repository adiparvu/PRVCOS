"use client"

import { useEffect, useRef, useState } from "react"
import { useToast } from "@prv/ui"
import type { RecurringTaskDto } from "@/app/api/projects/[id]/recurring-tasks/route"
import { recurringFrequencyLabel, type RecurringFrequency } from "@/lib/recurring-task"

const input: React.CSSProperties = {
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid var(--prv-border)",
  borderRadius: 9,
  padding: "8px 9px",
  color: "var(--prv-text-1)",
  fontSize: 12.5,
  fontFamily: "inherit",
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ro-RO", { day: "numeric", month: "short" })
}

// Header control: manage the project's recurring-task rules (list / create /
// toggle / delete) in a popover. Rules generate a backlog task on their cadence.
export function RecurringTasksButton({ projectId }: { projectId: string }) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [rules, setRules] = useState<RecurringTaskDto[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState("")
  const [frequency, setFrequency] = useState<RecurringFrequency>("weekly")
  const [hour, setHour] = useState(7)
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium")
  const ref = useRef<HTMLDivElement>(null)

  const load = () =>
    fetch(`/api/projects/${projectId}/recurring-tasks`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((d: { recurring: RecurringTaskDto[] }) => setRules(d.recurring))
      .catch(() => setRules([]))

  useEffect(() => {
    if (!open) return
    if (rules === null) load()
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const create = () => {
    if (!title.trim() || busy) return
    setBusy(true)
    fetch(`/api/projects/${projectId}/recurring-tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: title.trim(), frequency, sendHourUtc: hour, priority }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Create failed")
        setTitle("")
        setShowForm(false)
        await load()
        toast.success("Regulă creată")
      })
      .catch(() => toast.error("Nu s-a putut crea"))
      .finally(() => setBusy(false))
  }

  const toggle = (rule: RecurringTaskDto) => {
    setBusy(true)
    fetch(`/api/projects/${projectId}/recurring-tasks/${rule.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: !rule.enabled }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("fail")
        await load()
      })
      .catch(() => toast.error("Nu s-a putut actualiza"))
      .finally(() => setBusy(false))
  }

  const remove = (rule: RecurringTaskDto) => {
    if (!window.confirm(`Ștergi regula „${rule.title}'?`)) return
    setBusy(true)
    fetch(`/api/projects/${projectId}/recurring-tasks/${rule.id}`, { method: "DELETE" })
      .then(async (r) => {
        if (!r.ok) throw new Error("fail")
        await load()
        toast.success("Regulă ștearsă")
      })
      .catch(() => toast.error("Nu s-a putut șterge"))
      .finally(() => setBusy(false))
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          padding: "7px 13px",
          borderRadius: 10,
          border: "1px solid var(--prv-border-subtle)",
          background: "var(--prv-g1)",
          color: "var(--prv-text-2)",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Recurente ▾
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 40,
            width: 320,
            maxHeight: 420,
            overflowY: "auto",
            background: "var(--prv-g2)",
            border: "1px solid var(--prv-border)",
            borderRadius: 14,
            boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
            padding: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--prv-text-2)" }}>
              Task-uri recurente
            </span>
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              style={{
                background: "none",
                border: "none",
                color: "rgba(10,132,255,0.9)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
              }}
            >
              {showForm ? "Anulează" : "＋ Nou"}
            </button>
          </div>

          {showForm && (
            <div
              style={{
                display: "grid",
                gap: 7,
                marginBottom: 10,
                padding: 10,
                background: "rgba(255,255,255,0.03)",
                borderRadius: 10,
              }}
            >
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titlu task"
                style={{ ...input, width: "100%" }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                  style={input}
                >
                  <option value="daily">Zilnic</option>
                  <option value="weekly">Săptămânal</option>
                  <option value="monthly">Lunar</option>
                </select>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as typeof priority)}
                  style={input}
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="critical">critical</option>
                </select>
              </div>
              <select value={hour} onChange={(e) => setHour(Number(e.target.value))} style={input}>
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00 UTC
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!title.trim() || busy}
                onClick={create}
                style={{
                  background: title.trim() ? "#fff" : "rgba(255,255,255,0.07)",
                  color: title.trim() ? "#000" : "var(--prv-text-3)",
                  border: "none",
                  borderRadius: 9,
                  padding: 9,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: title.trim() && !busy ? "pointer" : "default",
                }}
              >
                Creează regula
              </button>
            </div>
          )}

          {rules === null ? (
            <div style={{ padding: 10, fontSize: 12.5, color: "var(--prv-text-3)" }}>
              Se încarcă…
            </div>
          ) : rules.length === 0 ? (
            <div
              style={{ padding: 10, fontSize: 12.5, color: "var(--prv-text-3)", lineHeight: 1.5 }}
            >
              Nicio regulă. Creează una pentru a genera automat task-uri.
            </div>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "9px 6px",
                  borderTop: "1px solid var(--prv-border-subtle)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: rule.enabled ? "var(--prv-text-1)" : "var(--prv-text-3)",
                    }}
                  >
                    {rule.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--prv-text-3)", marginTop: 2 }}>
                    {recurringFrequencyLabel(rule.frequency)} ·{" "}
                    {String(rule.sendHourUtc).padStart(2, "0")}:00 · urm. {fmtDate(rule.nextRunAt)}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => toggle(rule)}
                  style={{
                    background: "none",
                    border: "none",
                    color: rule.enabled ? "var(--prv-text-2)" : "rgba(48,209,88,0.9)",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  {rule.enabled ? "Oprește" : "Pornește"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(rule)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255,69,58,0.85)",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  Șterge
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
