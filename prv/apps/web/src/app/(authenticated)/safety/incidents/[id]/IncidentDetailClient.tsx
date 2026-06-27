"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"

interface IncidentDetail {
  id: string
  title: string
  type: string
  severity: string
  status: string
  location: string | null
  incidentAt: string
  reportedBy: string | null
  injuriesCount: number
  description: string | null
  actionsTaken: string | null
  createdAt: string
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

export function IncidentDetailClient({ id }: { id: string }) {
  const { data, isLoading, error } = useQuery<{ incident: IncidentDetail }>({
    queryKey: ["incident", id],
    queryFn: () => fetch(`/api/safety/incidents/${id}`).then((r) => r.json()),
  })

  const incident = data?.incident

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
            <Field label="Reported by" value={incident.reportedBy} />
            <Field
              label="Injuries"
              value={incident.injuriesCount > 0 ? `${incident.injuriesCount} reported` : "None"}
            />
          </div>

          {incident.description && (
            <div style={glassCard}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.35)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 10,
                }}
              >
                Description
              </p>
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

          {incident.actionsTaken && (
            <div style={glassCard}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.35)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 10,
                }}
              >
                Actions Taken
              </p>
              <p
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.75)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {incident.actionsTaken}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
