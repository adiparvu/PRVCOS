"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import type {
  SafetyDashboard,
  IncidentSummary,
  InspectionSummary,
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
} from "@/app/api/safety/route"

function Skeleton({ w, h, radius = 6 }: { w: number | string; h: number; radius?: number }) {
  return (
    <div
      style={{ width: w, height: h, borderRadius: radius, background: "rgba(255,255,255,0.07)" }}
    />
  )
}

const SEVERITY_COLORS: Record<IncidentSeverity, string> = {
  critical: "rgba(255,69,58,.95)",
  high: "rgba(255,159,10,.95)",
  medium: "rgba(255,255,255,.65)",
  low: "rgba(255,255,255,.35)",
}

const STATUS_COLORS: Record<IncidentStatus, string> = {
  open: "rgba(255,159,10,.95)",
  under_investigation: "rgba(100,180,255,.9)",
  resolved: "rgba(48,209,88,.95)",
  closed: "rgba(255,255,255,.45)",
}

const STATUS_LABELS: Record<IncidentStatus, string> = {
  open: "Open",
  under_investigation: "Investigating",
  resolved: "Resolved",
  closed: "Closed",
}

const TYPE_ICONS: Record<IncidentType, string> = {
  accident: "⚠",
  near_miss: "◎",
  hazard: "⚡",
  property_damage: "◻",
  environmental: "◈",
  security: "⬛",
}

const TYPE_COLORS: Record<IncidentType, string> = {
  accident: "rgba(255,69,58,.25)",
  near_miss: "rgba(255,159,10,.20)",
  hazard: "rgba(255,159,10,.20)",
  property_damage: "rgba(255,255,255,.10)",
  environmental: "rgba(48,209,88,.15)",
  security: "rgba(100,100,255,.20)",
}

const glassCard = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(32px)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 20,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
} as const

const badge = {
  background: "rgba(255,255,255,0.10)",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 100,
  padding: "3px 10px",
  fontSize: 11,
  fontWeight: 600,
} as const

function IncidentTypeIcon({ type }: { type: IncidentType }) {
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        background: TYPE_COLORS[type],
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        flexShrink: 0,
      }}
    >
      {TYPE_ICONS[type]}
    </div>
  )
}

function IncidentRow({ inc }: { inc: IncidentSummary }) {
  return (
    <Link href={`/safety/incidents/${inc.id}`} style={{ textDecoration: "none", display: "block" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          cursor: "pointer",
        }}
      >
        <IncidentTypeIcon type={inc.type} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "rgba(255,255,255,0.92)",
                lineHeight: 1.3,
              }}
            >
              {inc.title}
            </span>
            <span style={{ ...badge, color: SEVERITY_COLORS[inc.severity] }}>{inc.severity}</span>
            <span style={{ ...badge, color: STATUS_COLORS[inc.status] }}>
              {STATUS_LABELS[inc.status]}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{inc.location}</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>·</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
              {new Date(inc.incidentAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>·</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{inc.reportedBy}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function InspectionRow({ insp }: { insp: InspectionSummary }) {
  const statusColor =
    insp.status === "overdue"
      ? "rgba(255,69,58,.95)"
      : insp.status === "completed"
        ? "rgba(48,209,88,.95)"
        : insp.status === "in_progress"
          ? "rgba(100,180,255,.9)"
          : "rgba(255,159,10,.95)"

  return (
    <Link
      href={`/safety/inspections/${insp.id}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          cursor: "pointer",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.92)" }}>
              {insp.title}
            </span>
            <span style={{ ...badge, color: statusColor }}>{insp.status.replace("_", " ")}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
              {new Date(insp.scheduledAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            {insp.assignedTo && (
              <>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>·</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                  {insp.assignedTo}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

export function SafetyDashboardClient() {
  const { data, isLoading } = useQuery<SafetyDashboard>({
    queryKey: ["safety-dashboard"],
    queryFn: () => fetch("/api/safety").then((r) => r.json()),
  })

  const meta = data?.meta
  const recentIncidents = data?.recentIncidents ?? []
  const upcomingInspections = data?.upcomingInspections ?? []

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
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "rgba(255,255,255,0.92)",
            margin: 0,
          }}
        >
          Safety Center
        </h1>
        <Link href="/safety/incidents/new" style={{ textDecoration: "none" }}>
          <button
            style={{
              background: "rgba(255,255,255,0.10)",
              backdropFilter: "blur(48px)",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 16,
              padding: "8px 16px",
              color: "rgba(255,255,255,0.92)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            + New Incident
          </button>
        </Link>
      </div>

      {/* Navigation links */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center" }}>
        <Link
          href="/safety/incidents"
          style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", textDecoration: "none" }}
        >
          Incidents
        </Link>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.20)" }}>·</span>
        <Link
          href="/safety/inspections"
          style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", textDecoration: "none" }}
        >
          Inspections
        </Link>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.20)" }}>·</span>
        <Link
          href="/safety/briefings"
          style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", textDecoration: "none" }}
        >
          Briefings
        </Link>
      </div>

      {/* KPI row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          marginBottom: 28,
        }}
      >
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ ...glassCard, borderRadius: 14, padding: "16px 12px" }}>
              <Skeleton w="50%" h={28} radius={6} />
              <div style={{ marginTop: 6 }}>
                <Skeleton w="80%" h={10} radius={4} />
              </div>
            </div>
          ))
        ) : (
          <>
            <div
              style={{ ...glassCard, borderRadius: 14, padding: "16px 12px", textAlign: "center" }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color:
                    meta && meta.openIncidents > 0
                      ? "rgba(255,159,10,.95)"
                      : "rgba(255,255,255,0.92)",
                }}
              >
                {meta?.openIncidents ?? 0}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.45)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginTop: 4,
                }}
              >
                Open
              </div>
            </div>
            <div
              style={{ ...glassCard, borderRadius: 14, padding: "16px 12px", textAlign: "center" }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color:
                    meta && meta.criticalIncidents > 0
                      ? "rgba(255,69,58,.95)"
                      : "rgba(255,255,255,0.92)",
                }}
              >
                {meta?.criticalIncidents ?? 0}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.45)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginTop: 4,
                }}
              >
                Critical
              </div>
            </div>
            <div
              style={{ ...glassCard, borderRadius: 14, padding: "16px 12px", textAlign: "center" }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color:
                    meta && meta.overdueInspections > 0
                      ? "rgba(255,69,58,.95)"
                      : "rgba(255,255,255,0.92)",
                }}
              >
                {meta?.overdueInspections ?? 0}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.45)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginTop: 4,
                }}
              >
                Overdue
              </div>
            </div>
            <div
              style={{ ...glassCard, borderRadius: 14, padding: "16px 12px", textAlign: "center" }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color:
                    meta && meta.upcomingInspections > 0
                      ? "rgba(100,180,255,.9)"
                      : "rgba(255,255,255,0.92)",
                }}
              >
                {meta?.upcomingInspections ?? 0}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.45)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginTop: 4,
                }}
              >
                Upcoming
              </div>
            </div>
          </>
        )}
      </div>

      {/* Recent Incidents */}
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "rgba(255,255,255,0.65)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 10,
          }}
        >
          Recent Incidents
        </div>
        <div style={{ ...glassCard, overflow: "hidden" }}>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "14px 16px",
                  borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none",
                }}
              >
                <Skeleton w={40} h={40} radius={20} />
                <div style={{ flex: 1 }}>
                  <Skeleton w="60%" h={14} radius={4} />
                  <div style={{ marginTop: 6 }}>
                    <Skeleton w="40%" h={10} radius={4} />
                  </div>
                </div>
              </div>
            ))
          ) : recentIncidents.length === 0 ? (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                color: "rgba(255,255,255,0.35)",
                fontSize: 13,
              }}
            >
              No recent incidents
            </div>
          ) : (
            recentIncidents.map((inc, i) => (
              <div
                key={inc.id}
                style={{
                  borderBottom:
                    i < recentIncidents.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                }}
              >
                <IncidentRow inc={inc} />
              </div>
            ))
          )}
        </div>
        <div style={{ marginTop: 10, textAlign: "right" }}>
          <Link
            href="/safety/incidents"
            style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", textDecoration: "none" }}
          >
            View all incidents →
          </Link>
        </div>
      </div>

      {/* Upcoming Inspections */}
      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "rgba(255,255,255,0.65)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 10,
          }}
        >
          Upcoming Inspections
        </div>
        <div style={{ ...glassCard, overflow: "hidden" }}>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "14px 16px",
                  borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none",
                }}
              >
                <div style={{ flex: 1 }}>
                  <Skeleton w="55%" h={14} radius={4} />
                  <div style={{ marginTop: 6 }}>
                    <Skeleton w="35%" h={10} radius={4} />
                  </div>
                </div>
              </div>
            ))
          ) : upcomingInspections.length === 0 ? (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                color: "rgba(255,255,255,0.35)",
                fontSize: 13,
              }}
            >
              No upcoming inspections
            </div>
          ) : (
            upcomingInspections.map((insp, i) => (
              <div
                key={insp.id}
                style={{
                  borderBottom:
                    i < upcomingInspections.length - 1
                      ? "1px solid rgba(255,255,255,0.06)"
                      : "none",
                }}
              >
                <InspectionRow insp={insp} />
              </div>
            ))
          )}
        </div>
        <div style={{ marginTop: 10, textAlign: "right" }}>
          <Link
            href="/safety/inspections"
            style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", textDecoration: "none" }}
          >
            View all inspections →
          </Link>
        </div>
      </div>
    </div>
  )
}
