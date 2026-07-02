"use client"

import { useMemo, useState } from "react"
import {
  useCrmActivities,
  useClients,
  useCreateCrmActivity,
  useUpdateCrmActivity,
  useDeleteCrmActivity,
} from "@/lib/api-hooks"
import type { CrmActivityRow } from "@/app/api/crm/activities/route"

const TYPES = [
  { key: "call", label: "Call", glyph: "📞" },
  { key: "email", label: "Email", glyph: "✉️" },
  { key: "meeting", label: "Meeting", glyph: "👥" },
  { key: "demo", label: "Demo", glyph: "🖥️" },
  { key: "proposal", label: "Proposal", glyph: "📄" },
  { key: "follow_up", label: "Follow-up", glyph: "↻" },
  { key: "note", label: "Note", glyph: "📝" },
  { key: "task", label: "Task", glyph: "☑︎" },
] as const

const GLYPH: Record<string, string> = Object.fromEntries(TYPES.map((t) => [t.key, t.glyph]))
const LABEL: Record<string, string> = Object.fromEntries(TYPES.map((t) => [t.key, t.label]))

function relDue(iso: string, nowMs: number): { text: string; overdue: boolean } {
  const due = Date.parse(iso)
  const diffDays = Math.round((due - nowMs) / 86_400_000)
  if (diffDays < 0)
    return { text: diffDays === -1 ? "Due yesterday" : `${-diffDays} days overdue`, overdue: true }
  if (diffDays === 0) return { text: "Due today", overdue: false }
  if (diffDays === 1) return { text: "Due tomorrow", overdue: false }
  const d = new Date(due)
  return {
    text: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    overdue: false,
  }
}
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const card = {
  background: "var(--prv-g1)",
  border: "1px solid var(--prv-border)",
  borderRadius: 22,
  padding: 20,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 24px 64px rgba(0,0,0,0.5)",
} as const
const inputStyle = {
  width: "100%",
  background: "var(--prv-g2)",
  border: "1px solid var(--prv-border)",
  borderRadius: 12,
  color: "var(--prv-text-1)",
  font: "inherit",
  fontSize: 13,
  padding: "10px 12px",
} as const
const labelStyle = {
  display: "block",
  color: "var(--prv-text-3)",
  fontSize: 11,
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  marginBottom: 6,
}

function Tile({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border)",
        borderRadius: 18,
        padding: "15px 17px",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      <div
        style={{
          color: "var(--prv-text-3)",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          fontWeight: 560,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 25,
          fontWeight: 680,
          marginTop: 8,
          letterSpacing: "-0.02em",
          color: warn && value > 0 ? "rgba(255,190,90,0.92)" : undefined,
        }}
      >
        {value}
      </div>
    </div>
  )
}

function Row({
  a,
  nowMs,
  onDone,
  onDelete,
}: {
  a: CrmActivityRow
  nowMs: number
  onDone: () => void
  onDelete: () => void
}) {
  const overdue = a.state === "overdue"
  const done = a.state === "done"
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        padding: "14px 16px",
        border: `1px solid ${overdue ? "rgba(255,176,64,0.32)" : "var(--prv-border)"}`,
        background: overdue ? "rgba(255,176,64,0.12)" : "var(--prv-g1)",
        borderRadius: 16,
        marginBottom: 10,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
        opacity: done ? 0.62 : 1,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          flex: "none",
          borderRadius: 11,
          background: "var(--prv-g2)",
          border: `1px solid ${overdue ? "rgba(255,176,64,0.32)" : "var(--prv-border-subtle)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 17,
        }}
      >
        {GLYPH[a.type] ?? "•"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 560 }}>{a.subject}</span>
          <span
            style={{
              color: "var(--prv-text-3)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              border: "1px solid var(--prv-border)",
              borderRadius: 6,
              padding: "2px 6px",
            }}
          >
            {LABEL[a.type] ?? a.type}
          </span>
        </div>
        {a.clientName && (
          <div style={{ color: "var(--prv-text-2)", fontSize: 12, marginTop: 5 }}>
            {a.clientName}
            {a.actor ? ` · ${a.actor}` : ""}
          </div>
        )}
        {a.notes && (
          <div
            style={{ color: "var(--prv-text-3)", fontSize: 12.5, marginTop: 7, lineHeight: 1.5 }}
          >
            {a.notes}
          </div>
        )}
        {a.outcome && (
          <div
            style={{
              color: "var(--prv-text-2)",
              fontSize: 12.5,
              marginTop: 7,
              lineHeight: 1.5,
              borderLeft: "2px solid var(--prv-border-subtle)",
              paddingLeft: 10,
            }}
          >
            Outcome: {a.outcome}
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 9,
          flex: "none",
        }}
      >
        {done ? (
          <span style={{ color: "var(--prv-text-3)", fontSize: 12 }}>
            ✓ {a.completedAt ? shortDate(a.completedAt) : "done"}
          </span>
        ) : (
          <>
            {a.dueAt &&
              (() => {
                const r = relDue(a.dueAt, nowMs)
                return (
                  <span
                    style={{
                      fontSize: 12,
                      fontVariantNumeric: "tabular-nums",
                      whiteSpace: "nowrap",
                      color: r.overdue ? "rgba(255,190,90,0.92)" : "var(--prv-text-2)",
                      fontWeight: r.overdue ? 560 : 400,
                    }}
                  >
                    {r.text}
                  </span>
                )
              })()}
            <button
              onClick={onDone}
              style={{
                border: "1px solid var(--prv-border)",
                background: "var(--prv-g2)",
                color: "var(--prv-text-1)",
                borderRadius: 9,
                font: "inherit",
                fontSize: 11.5,
                padding: "6px 11px",
                cursor: "pointer",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
              }}
            >
              Mark done
            </button>
          </>
        )}
        <button
          onClick={onDelete}
          style={{
            border: "none",
            background: "transparent",
            color: "var(--prv-text-3)",
            font: "inherit",
            fontSize: 11,
            cursor: "pointer",
            padding: 0,
          }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}

export function CrmActivitiesClient() {
  const [nowMs] = useState(() => Date.now())
  const { data, isLoading } = useCrmActivities()
  const clientsQuery = useClients()
  const create = useCreateCrmActivity()
  const update = useUpdateCrmActivity()
  const remove = useDeleteCrmActivity()

  const [clientId, setClientId] = useState("")
  const [type, setType] = useState<string>("call")
  const [subject, setSubject] = useState("")
  const [dueAt, setDueAt] = useState("")
  const [notes, setNotes] = useState("")

  const clients = clientsQuery.data?.clients ?? []
  const activities = useMemo(() => data?.activities ?? [], [data])
  const meta = data?.meta

  const groups = useMemo(() => {
    return {
      overdue: activities.filter((a) => a.state === "overdue"),
      scheduled: activities.filter((a) => a.state === "scheduled"),
      done: activities.filter((a) => a.state === "done"),
    }
  }, [activities])

  const canSubmit = clientId !== "" && subject.trim() !== "" && !create.isPending

  function submit() {
    if (!canSubmit) return
    create.mutate(
      {
        clientId,
        type,
        subject: subject.trim(),
        notes: notes.trim() || null,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      },
      {
        onSuccess: () => {
          setSubject("")
          setNotes("")
          setDueAt("")
        },
      }
    )
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>Activities</h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        CRM · every call, meeting, follow-up and task across your leads &amp; customers
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          margin: "24px 0",
        }}
      >
        <Tile label="Total" value={meta?.total ?? 0} />
        <Tile label="Open" value={meta?.open ?? 0} />
        <Tile label="Overdue" value={meta?.overdue ?? 0} warn />
        <Tile label="Done" value={meta?.done ?? 0} />
      </div>

      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Lead / Customer</label>
            <select
              style={inputStyle}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Select…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Due (optional)</label>
            <input
              type="datetime-local"
              style={inputStyle}
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Type</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setType(t.key)}
                  style={{
                    border: "1px solid var(--prv-border)",
                    background: type === t.key ? "var(--prv-g3)" : "var(--prv-g1)",
                    color: type === t.key ? "var(--prv-text-1)" : "var(--prv-text-2)",
                    borderRadius: 100,
                    padding: "7px 13px",
                    fontSize: 12,
                    cursor: "pointer",
                    boxShadow: type === t.key ? "inset 0 1px 0 rgba(255,255,255,0.22)" : "none",
                  }}
                >
                  {t.glyph} {t.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Subject</label>
            <input
              style={inputStyle}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What is this activity about?"
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Notes</label>
            <input
              style={inputStyle}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional details…"
            />
          </div>
          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={submit}
              disabled={!canSubmit}
              style={{
                background: "#fff",
                color: "#000",
                border: 0,
                borderRadius: 12,
                font: "inherit",
                fontWeight: 600,
                fontSize: 13,
                padding: "10px 20px",
                cursor: canSubmit ? "pointer" : "not-allowed",
                opacity: canSubmit ? 1 : 0.4,
              }}
            >
              {create.isPending ? "Logging…" : "Log activity"}
            </button>
          </div>
        </div>
      </div>

      {isLoading && <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Loading…</div>}
      {!isLoading && activities.length === 0 && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>
          No activities yet — log the first touchpoint above.
        </div>
      )}

      {(["overdue", "scheduled", "done"] as const).map((key) =>
        groups[key].length ? (
          <div key={key}>
            <div
              style={{
                color: "var(--prv-text-3)",
                fontSize: 11.5,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                margin: "22px 4px 10px",
                fontWeight: 600,
              }}
            >
              {key === "overdue" ? "Overdue" : key === "scheduled" ? "Scheduled" : "Completed"}
            </div>
            {groups[key].map((a) => (
              <Row
                key={a.id}
                a={a}
                nowMs={nowMs}
                onDone={() => update.mutate({ id: a.id, completed: true })}
                onDelete={() => remove.mutate(a.id)}
              />
            ))}
          </div>
        ) : null
      )}
    </div>
  )
}
