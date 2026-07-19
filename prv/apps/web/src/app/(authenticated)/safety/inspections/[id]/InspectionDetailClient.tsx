"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { InspectionChecklist } from "./InspectionChecklist"
import Link from "next/link"

interface Inspection {
  id: string
  title: string
  description: string | null
  status: string
  assignedTo: string | null
  scheduledAt: string
  completedAt: string | null
  nextDueDate: string | null
  score: number | null
  maxScore: number | null
  notes: string | null
}
interface Person {
  id: string
  name: string
}
interface InspectionResponse {
  inspection: Inspection
  assignee: Person | null
  project: { id: string; name: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: "rgba(255,255,255,.55)",
  in_progress: "rgba(100,180,255,.9)",
  completed: "rgba(48,209,88,.95)",
  overdue: "rgba(255,69,58,.95)",
}
const STATUS_FLOW = ["scheduled", "in_progress", "completed"] as const
type Status = (typeof STATUS_FLOW)[number]
const STATUS_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
  overdue: "Overdue",
}

const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 20,
  boxShadow:
    "0 24px 64px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.25)",
  backdropFilter: "blur(32px) saturate(180%)",
  WebkitBackdropFilter: "blur(32px) saturate(180%)",
  padding: "20px 16px",
  marginBottom: 12,
}
const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "rgba(255,255,255,0.35)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 10,
}
const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  padding: "11px 12px",
  color: "rgba(255,255,255,0.92)",
  fontSize: 13.5,
  fontFamily: "inherit",
  marginBottom: 14,
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        padding: "10px 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", minWidth: 120 }}>{label}</span>
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.88)", textAlign: "right", flex: 1 }}>
        {value ?? "—"}
      </span>
    </div>
  )
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function InspectionDetailClient({ id }: { id: string }) {
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery<InspectionResponse>({
    queryKey: ["inspection", id],
    queryFn: () => fetch(`/api/safety/inspections/${id}`).then((r) => r.json()),
  })
  const inspection = data?.inspection

  const { data: peopleData } = useQuery<{
    members: { id: string; firstName: string; lastName: string }[]
  }>({
    queryKey: ["people", "picker"],
    queryFn: () => fetch("/api/people?limit=200").then((r) => r.json()),
  })
  const people = peopleData?.members ?? []

  // Draft overrides server values while editing; cleared on save.
  const [draftScore, setDraftScore] = useState<string | null>(null)
  const [draftMax, setDraftMax] = useState<string | null>(null)
  const [draftNotes, setDraftNotes] = useState<string | null>(null)
  const score = draftScore ?? (inspection?.score != null ? String(inspection.score) : "")
  const maxScore = draftMax ?? (inspection?.maxScore != null ? String(inspection.maxScore) : "")
  const notes = draftNotes ?? inspection?.notes ?? ""

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      fetch(`/api/safety/inspections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Update failed")
        return r.json()
      }),
    onSuccess: () => {
      setDraftScore(null)
      setDraftMax(null)
      setDraftNotes(null)
      void queryClient.invalidateQueries({ queryKey: ["inspection", id] })
    },
  })

  const isCompleted = inspection?.status === "completed"
  const currentIndex = inspection ? STATUS_FLOW.indexOf(inspection.status as Status) : -1

  const scoreNum = Number(score)
  const maxNum = Number(maxScore)
  const pct =
    maxNum > 0 && Number.isFinite(scoreNum)
      ? Math.max(0, Math.min(100, (scoreNum / maxNum) * 100))
      : 0

  function scorePayload(): Record<string, unknown> {
    const p: Record<string, unknown> = { notes }
    if (score !== "" && Number.isFinite(scoreNum)) p.score = scoreNum
    if (maxScore !== "" && Number.isFinite(maxNum)) p.maxScore = maxNum
    return p
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        padding: "32px 16px 120px",
        maxWidth: 680,
        margin: "0 auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Link
          href="/safety"
          style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none" }}
        >
          ← Safety
        </Link>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.20)" }}>/</span>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>Inspection</span>
      </div>

      {isLoading && (
        <div style={glassCard}>
          <div
            style={{
              height: 20,
              background: "rgba(255,255,255,0.07)",
              borderRadius: 6,
              width: "60%",
              marginBottom: 12,
            }}
          />
          <div
            style={{
              height: 14,
              background: "rgba(255,255,255,0.05)",
              borderRadius: 4,
              width: "40%",
            }}
          />
        </div>
      )}
      {error && (
        <div style={{ ...glassCard, color: "rgba(255,69,58,.9)", fontSize: 14 }}>
          Failed to load inspection.
        </div>
      )}

      {inspection && (
        <>
          <div style={glassCard}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <h1
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.92)",
                  margin: 0,
                  letterSpacing: -0.4,
                }}
              >
                {inspection.title}
              </h1>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: STATUS_COLORS[inspection.status] ?? "rgba(255,255,255,.6)",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 100,
                  padding: "3px 10px",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {(STATUS_LABEL[inspection.status] ?? inspection.status).toLowerCase()}
              </span>
            </div>
            <Field label="Scheduled" value={fmtDate(inspection.scheduledAt)} />
            {inspection.nextDueDate && (
              <Field label="Next due" value={fmtDate(inspection.nextDueDate)} />
            )}
            <Field label="Project" value={data?.project?.name} />
            <Field label="Assigned to" value={data?.assignee?.name} />
            {inspection.completedAt && (
              <Field label="Completed" value={fmtDate(inspection.completedAt)} />
            )}
          </div>

          {inspection.description && (
            <div style={glassCard}>
              <p style={labelStyle}>Description</p>
              <p
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.75)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {inspection.description}
              </p>
            </div>
          )}

          <div style={glassCard}>
            <p style={labelStyle}>Execution</p>

            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              {STATUS_FLOW.map((sname, i) => {
                const isActive = i === currentIndex
                const isDone = currentIndex > i
                const color = isActive
                  ? "rgba(100,180,255,.9)"
                  : isDone
                    ? "rgba(48,209,88,.95)"
                    : "rgba(255,255,255,0.45)"
                return (
                  <button
                    key={sname}
                    type="button"
                    disabled={mutation.isPending || sname === inspection.status}
                    onClick={() => mutation.mutate({ status: sname })}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "8px 4px",
                      borderRadius: 10,
                      border: `1px solid ${isActive ? "rgba(100,180,255,.4)" : isDone ? "rgba(48,209,88,.3)" : "rgba(255,255,255,0.12)"}`,
                      background: isActive ? "rgba(100,180,255,.14)" : "rgba(255,255,255,0.04)",
                      color,
                      cursor: sname === inspection.status ? "default" : "pointer",
                    }}
                  >
                    {STATUS_LABEL[sname]}
                  </button>
                )
              })}
            </div>

            <p style={labelStyle}>Assigned inspector</p>
            <select
              value={inspection.assignedTo ?? ""}
              disabled={mutation.isPending}
              onChange={(e) => mutation.mutate({ assignedTo: e.target.value || null })}
              style={{ ...inputStyle, appearance: "none" }}
            >
              <option value="" style={{ background: "#111" }}>
                Unassigned
              </option>
              {people.map((p) => (
                <option key={p.id} value={p.id} style={{ background: "#111" }}>
                  {p.firstName} {p.lastName}
                </option>
              ))}
            </select>

            <p style={labelStyle}>Score</p>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <input
                style={{ ...inputStyle, marginBottom: 6 }}
                type="number"
                min={0}
                placeholder="Score"
                value={score}
                onChange={(e) => setDraftScore(e.target.value)}
                disabled={isCompleted}
              />
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 16, marginBottom: 6 }}>
                /
              </span>
              <input
                style={{ ...inputStyle, marginBottom: 6 }}
                type="number"
                min={0}
                placeholder="Max"
                value={maxScore}
                onChange={(e) => setDraftMax(e.target.value)}
                disabled={isCompleted}
              />
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 99,
                background: "rgba(255,255,255,0.1)",
                overflow: "hidden",
                margin: "2px 0 16px",
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 99,
                  background: "rgba(48,209,88,.9)",
                  width: `${pct}%`,
                }}
              />
            </div>

            <p style={labelStyle}>Notes</p>
            <textarea
              style={{ ...inputStyle, lineHeight: 1.5, resize: "vertical", minHeight: 70 }}
              placeholder="Findings, actions, housekeeping…"
              value={notes}
              onChange={(e) => setDraftNotes(e.target.value)}
              disabled={isCompleted}
            />

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                type="button"
                disabled={mutation.isPending || isCompleted}
                onClick={() => mutation.mutate(scorePayload())}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: isCompleted ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.92)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10,
                  padding: "10px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: mutation.isPending || isCompleted ? "default" : "pointer",
                }}
              >
                Save progress
              </button>
              <button
                type="button"
                disabled={mutation.isPending || isCompleted}
                onClick={() =>
                  mutation.mutate({
                    ...scorePayload(),
                    status: "completed",
                    completedAt: new Date().toISOString(),
                  })
                }
                style={{
                  background: isCompleted ? "rgba(255,255,255,0.1)" : "#fff",
                  color: isCompleted ? "rgba(255,255,255,0.4)" : "#000",
                  border: 0,
                  borderRadius: 10,
                  padding: "10px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: mutation.isPending || isCompleted ? "default" : "pointer",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
                }}
              >
                {mutation.isPending ? "Saving…" : "Complete inspection"}
              </button>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                {isCompleted
                  ? "This inspection is complete."
                  : "Completing stamps the completion date."}
              </span>
            </div>
            {mutation.isError && (
              <p style={{ fontSize: 12, color: "rgba(255,69,58,.9)", marginTop: 10 }}>
                Could not save — please try again.
              </p>
            )}
          </div>

          <InspectionChecklist
            inspectionId={id}
            onSubmitted={() => void queryClient.invalidateQueries({ queryKey: ["inspection", id] })}
          />
        </>
      )}
    </div>
  )
}
