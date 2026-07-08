"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"

interface Incident {
  id: string
  title: string
  type: string
  severity: string
  status: string
  assignedTo: string | null
  location: string | null
  incidentAt: string
  injuriesCount: number
  description: string | null
  rootCause: string | null
  correctiveActions: string | null
  closedAt: string | null
}
interface Person {
  id: string
  name: string
}
interface IncidentResponse {
  incident: Incident
  reporter: Person | null
  assignee: Person | null
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "rgba(255,69,58,.95)",
  high: "rgba(255,159,10,.95)",
  medium: "rgba(255,255,255,.65)",
  low: "rgba(255,255,255,.35)",
}
const STATUS_COLORS: Record<string, string> = {
  open: "rgba(255,159,10,.95)",
  under_investigation: "rgba(100,180,255,.9)",
  resolved: "rgba(48,209,88,.95)",
  closed: "rgba(255,255,255,.45)",
}

const STATUS_FLOW = ["open", "under_investigation", "resolved", "closed"] as const
type Status = (typeof STATUS_FLOW)[number]
const STATUS_LABEL: Record<Status, string> = {
  open: "Open",
  under_investigation: "Under investigation",
  resolved: "Resolved",
  closed: "Closed",
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

const textareaStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  padding: 12,
  color: "rgba(255,255,255,0.92)",
  fontSize: 13.5,
  fontFamily: "inherit",
  lineHeight: 1.5,
  resize: "vertical",
  minHeight: 76,
  marginBottom: 14,
}

export function IncidentDetailClient({ id }: { id: string }) {
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery<IncidentResponse>({
    queryKey: ["incident", id],
    queryFn: () => fetch(`/api/safety/incidents/${id}`).then((r) => r.json()),
  })
  const incident = data?.incident

  const { data: peopleData } = useQuery<{
    members: { id: string; firstName: string; lastName: string }[]
  }>({
    queryKey: ["people", "picker"],
    queryFn: () => fetch("/api/people?limit=200").then((r) => r.json()),
  })
  const people = peopleData?.members ?? []

  // Draft overrides the server value while editing; cleared after a save so the
  // fields reflect refetched server truth. Avoids seeding state in an effect.
  const [draftRoot, setDraftRoot] = useState<string | null>(null)
  const [draftCorrective, setDraftCorrective] = useState<string | null>(null)
  const rootCause = draftRoot ?? incident?.rootCause ?? ""
  const correctiveActions = draftCorrective ?? incident?.correctiveActions ?? ""

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      fetch(`/api/safety/incidents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Update failed")
        return r.json()
      }),
    onSuccess: () => {
      setDraftRoot(null)
      setDraftCorrective(null)
      void queryClient.invalidateQueries({ queryKey: ["incident", id] })
    },
  })

  const isClosed = incident?.status === "closed"
  const currentIndex = incident ? STATUS_FLOW.indexOf(incident.status as Status) : -1

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
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>Incident Detail</span>
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
          Failed to load incident.
        </div>
      )}

      {incident && (
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
                {incident.title}
              </h1>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: STATUS_COLORS[incident.status] ?? "rgba(255,255,255,.6)",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 100,
                  padding: "3px 10px",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {incident.status.replace("_", " ")}
              </span>
            </div>
            <Field label="Type" value={incident.type.replace("_", " ")} />
            <Field
              label="Severity"
              value={
                <span
                  style={{
                    color: SEVERITY_COLORS[incident.severity] ?? "rgba(255,255,255,.6)",
                    fontWeight: 600,
                    textTransform: "capitalize",
                  }}
                >
                  {incident.severity}
                </span>
              }
            />
            <Field
              label="Date"
              value={new Date(incident.incidentAt).toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            />
            <Field label="Location" value={incident.location} />
            <Field label="Reported by" value={data?.reporter?.name} />
            <Field label="Assigned to" value={data?.assignee?.name} />
            <Field
              label="Injuries"
              value={incident.injuriesCount > 0 ? `${incident.injuriesCount} reported` : "None"}
            />
            {incident.closedAt && (
              <Field
                label="Closed"
                value={new Date(incident.closedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              />
            )}
          </div>

          {incident.description && (
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
                {incident.description}
              </p>
            </div>
          )}

          {/* Investigation workflow */}
          <div style={glassCard}>
            <p style={labelStyle}>Investigation</p>

            <p style={labelStyle}>Assigned investigator</p>
            <select
              value={incident.assignedTo ?? ""}
              disabled={mutation.isPending || isClosed}
              onChange={(e) => mutation.mutate({ assignedTo: e.target.value || null })}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                padding: "11px 12px",
                color: "rgba(255,255,255,0.92)",
                fontSize: 13.5,
                fontFamily: "inherit",
                marginBottom: 18,
                appearance: "none",
              }}
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

            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              {STATUS_FLOW.map((s, i) => {
                const isActive = i === currentIndex
                const isDone = currentIndex > i
                const color = isActive
                  ? "rgba(100,180,255,.9)"
                  : isDone
                    ? "rgba(48,209,88,.95)"
                    : "rgba(255,255,255,0.45)"
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={mutation.isPending || s === incident.status}
                    onClick={() => mutation.mutate({ status: s })}
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
                      cursor: s === incident.status ? "default" : "pointer",
                    }}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                )
              })}
            </div>

            <p style={labelStyle}>Root cause</p>
            <textarea
              style={textareaStyle}
              placeholder="What caused the incident? Contributing factors…"
              value={rootCause}
              onChange={(e) => setDraftRoot(e.target.value)}
              disabled={isClosed}
            />

            <p style={labelStyle}>Corrective actions</p>
            <textarea
              style={textareaStyle}
              placeholder="What actions will prevent recurrence?"
              value={correctiveActions}
              onChange={(e) => setDraftCorrective(e.target.value)}
              disabled={isClosed}
            />

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                type="button"
                disabled={mutation.isPending || isClosed}
                onClick={() => mutation.mutate({ rootCause, correctiveActions })}
                style={{
                  background: isClosed ? "rgba(255,255,255,0.1)" : "#fff",
                  color: isClosed ? "rgba(255,255,255,0.4)" : "#000",
                  border: 0,
                  borderRadius: 10,
                  padding: "10px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: mutation.isPending || isClosed ? "default" : "pointer",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
                }}
              >
                {mutation.isPending ? "Saving…" : "Save investigation"}
              </button>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                {isClosed
                  ? "This incident is closed."
                  : "Setting status to Closed stamps who closed it and when."}
              </span>
            </div>
            {mutation.isError && (
              <p style={{ fontSize: 12, color: "rgba(255,69,58,.9)", marginTop: 10 }}>
                Could not save — please try again.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
