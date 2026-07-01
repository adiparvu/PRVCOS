"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useSheetStack } from "@prv/ui"
import type { ProjectDetail } from "@/app/api/projects/[id]/route"

interface ProjectDetailClientProps {
  id: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

function getRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 2) return "Just now"
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ── SF Symbol icons for the actions sheet ────────────────────────────────────

function IconChevronLeftSmall() {
  return (
    <svg
      width="8"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function IconPhone() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.13 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 2.98 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 18z" />
    </svg>
  )
}

function IconMail() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function IconArrowRight() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

function IconPencil() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  )
}

function IconFlagIssue() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  )
}

function IconPause() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  advance: <IconArrowRight />,
  note: <IconPencil />,
  flag: <IconFlagIssue />,
  pause: <IconPause />,
}

const ACTIVITY_DOT: Record<string, string> = {
  complete: "rgba(48,209,88,0.8)",
  warning: "rgba(255,159,10,0.8)",
  flag: "rgba(255,59,48,0.8)",
  note: "rgba(255,255,255,0.3)",
}

const BUDGET_STATE = (spent: number, budget: number) => {
  const pct = (spent / budget) * 100
  if (pct > 100)
    return {
      fill: "rgba(255,59,48,0.7)",
      label: `${Math.round(pct)}% · over budget`,
      labelColor: "rgba(255,99,90,0.85)",
    }
  if (pct > 80)
    return {
      fill: "rgba(255,159,10,0.7)",
      label: `${Math.round(pct)}% · watch budget`,
      labelColor: "rgba(255,179,64,0.85)",
    }
  return {
    fill: "rgba(255,255,255,0.65)",
    label: `${Math.round(pct)}% used`,
    labelColor: "rgba(255,255,255,0.35)",
  }
}

export function ProjectDetailClient({ id }: ProjectDetailClientProps) {
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const { openSheet } = useSheetStack()

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then((d) => setProject(d.project ?? null))
      .finally(() => setLoading(false))
  }, [id])

  const openActions = useCallback(() => {
    if (!project) return
    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: project.name.split(" ").slice(0, 3).join(" "),
      render: (onClose) => <ProjectActionsSheet project={project} onClose={onClose} />,
    })
  }, [openSheet, project])

  if (loading) {
    return (
      <div style={{ padding: "56px 20px 24px" }}>
        <div
          style={{
            height: 20,
            width: 80,
            borderRadius: 6,
            background: "var(--prv-g2)",
            marginBottom: 16,
          }}
        />
        <div
          style={{
            height: 28,
            width: "70%",
            borderRadius: 8,
            background: "var(--prv-g2)",
            marginBottom: 8,
          }}
        />
        <div
          style={{
            height: 14,
            width: "40%",
            borderRadius: 6,
            background: "var(--prv-g1)",
            marginBottom: 24,
          }}
        />
        {[120, 200, 160, 140].map((h, i) => (
          <div
            key={i}
            style={{
              height: h,
              borderRadius: 16,
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              marginBottom: 12,
            }}
          />
        ))}
      </div>
    )
  }

  if (!project) {
    return (
      <div style={{ padding: "80px 20px", textAlign: "center" }}>
        <p style={{ fontSize: 16, color: "var(--prv-text-3)" }}>Project not found.</p>
        <Link
          href="/projects"
          style={{
            fontSize: 14,
            color: "var(--prv-text-2)",
            marginTop: 12,
            display: "inline-block",
          }}
        >
          ← Back to Projects
        </Link>
      </div>
    )
  }

  const budgetState = BUDGET_STATE(project.spent, project.budget)
  const budgetPct = Math.min((project.spent / project.budget) * 100, 100)
  const remaining = project.budget - project.spent
  const ringCircumference = 226.2
  const ringOffset = ringCircumference * (1 - Math.min(project.spent / project.budget, 1))
  const ringStroke =
    project.spent > project.budget
      ? "rgba(255,59,48,0.7)"
      : project.spent / project.budget > 0.8
        ? "rgba(255,159,10,0.7)"
        : "rgba(255,255,255,0.65)"
  const doneMilestones = project.milestones.filter((m) => m.done).length
  const activePhase = project.phases.find((p) => p.state === "active")

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ padding: "12px 20px 10px" }}>
        <Link
          href="/projects"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 13,
            color: "var(--prv-text-3)",
            textDecoration: "none",
            marginBottom: 10,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Projects
        </Link>

        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "var(--prv-text-1)",
            letterSpacing: -0.5,
            lineHeight: 1.2,
            margin: "0 0 6px",
          }}
        >
          {project.name}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 7,
              background: "var(--prv-g3)",
              border: "1px solid var(--prv-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 8,
              fontWeight: 700,
              color: "var(--prv-text-2)",
              flexShrink: 0,
            }}
          >
            {project.clientInitials}
          </div>
          <span style={{ fontSize: 12, color: "var(--prv-text-3)" }}>{project.clientName}</span>
          <StatusPill status={project.status} />
        </div>
      </div>

      {/* KPI strip */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "8px 20px" }}
      >
        {[
          { value: `${project.completionPct}%`, label: "Complete" },
          { value: `${project.daysLeft}d`, label: "Remaining" },
          { value: activePhase ? activePhase.name : "Done", label: "Phase" },
        ].map(({ value, label }) => (
          <div
            key={label}
            style={{
              borderRadius: 14,
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              padding: "10px 12px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: label === "Phase" ? 11 : 19,
                fontWeight: 700,
                color: "var(--prv-text-1)",
                margin: "0 0 2px",
                letterSpacing: -0.4,
                lineHeight: 1.1,
              }}
            >
              {value}
            </p>
            <p
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "var(--prv-text-4)",
                margin: 0,
                textTransform: "uppercase",
                letterSpacing: 0.6,
              }}
            >
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Budget ring */}
      <SectionLabel>Budget</SectionLabel>
      <div
        style={{
          margin: "0 20px",
          borderRadius: 18,
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div style={{ position: "relative", width: 64, height: 64, flexShrink: 0 }}>
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle
              cx="32"
              cy="32"
              r="26"
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="6"
            />
            <circle
              cx="32"
              cy="32"
              r="26"
              fill="none"
              stroke={ringStroke}
              strokeWidth="6"
              strokeDasharray={`${ringCircumference}`}
              strokeDashoffset={ringOffset}
              strokeLinecap="round"
              transform="rotate(-90 32 32)"
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{ fontSize: 13, fontWeight: 700, color: "var(--prv-text-1)", lineHeight: 1 }}
            >
              {Math.round(budgetPct)}%
            </span>
            <span style={{ fontSize: 7.5, color: "var(--prv-text-4)", marginTop: 1 }}>used</span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          {[
            { label: "Total Budget", value: `€${project.budget.toLocaleString()}` },
            { label: "Spent", value: `€${project.spent.toLocaleString()}` },
            {
              label: remaining >= 0 ? "Remaining" : "Over by",
              value: `€${Math.abs(remaining).toLocaleString()}`,
              warn: remaining < 0,
            },
          ].map(({ label, value, warn }) => (
            <div
              key={label}
              style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}
            >
              <span style={{ fontSize: 11, color: "var(--prv-text-3)" }}>{label}</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: warn ? "rgba(255,99,90,0.9)" : "var(--prv-text-1)",
                }}
              >
                {value}
              </span>
            </div>
          ))}
          <div
            style={{
              height: 4,
              borderRadius: 100,
              background: "rgba(255,255,255,0.07)",
              overflow: "hidden",
              marginTop: 8,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min(budgetPct, 100)}%`,
                borderRadius: 100,
                background: budgetState.fill,
              }}
            />
          </div>
          <p
            style={{
              fontSize: 10,
              color: budgetState.labelColor,
              margin: "4px 0 0",
              fontWeight: 600,
            }}
          >
            {budgetState.label}
          </p>
          <Link
            href={`/projects/${id}/budget`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              marginTop: 12,
              fontSize: 12,
              fontWeight: 600,
              color: "var(--prv-text-2)",
              textDecoration: "none",
            }}
          >
            View full budget & EVA ›
          </Link>
          <Link
            href={`/projects/${id}/tasks`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              marginTop: 12,
              marginLeft: 16,
              fontSize: 12,
              fontWeight: 600,
              color: "var(--prv-text-2)",
              textDecoration: "none",
            }}
          >
            Open task board ›
          </Link>
          <Link
            href={`/projects/${id}/risks`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              marginTop: 12,
              marginLeft: 16,
              fontSize: 12,
              fontWeight: 600,
              color: "var(--prv-text-2)",
              textDecoration: "none",
            }}
          >
            Risk register ›
          </Link>
          <Link
            href={`/projects/${id}/activity`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              marginTop: 12,
              marginLeft: 16,
              fontSize: 12,
              fontWeight: 600,
              color: "var(--prv-text-2)",
              textDecoration: "none",
            }}
          >
            Activity log ›
          </Link>
        </div>
      </div>

      {/* Phase timeline */}
      <SectionLabel>Phase Timeline</SectionLabel>
      <div style={{ margin: "0 20px" }}>
        {project.phases.map((phase, i) => (
          <div
            key={phase.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              paddingBottom: i < project.phases.length - 1 ? 16 : 0,
              position: "relative",
            }}
          >
            {i < project.phases.length - 1 && (
              <div
                style={{
                  position: "absolute",
                  left: 9,
                  top: 20,
                  bottom: 0,
                  width: 1,
                  background: "rgba(255,255,255,0.07)",
                }}
              />
            )}
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                zIndex: 1,
                ...(phase.state === "done"
                  ? {
                      background: "rgba(255,255,255,0.14)",
                      border: "1px solid rgba(255,255,255,0.22)",
                    }
                  : phase.state === "active"
                    ? {
                        background: "rgba(255,255,255,0.9)",
                        boxShadow: "0 0 10px rgba(255,255,255,0.3)",
                      }
                    : {
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.10)",
                      }),
              }}
            >
              {phase.state === "done" && (
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="rgba(255,255,255,0.8)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <polyline points="2 6 5 9 10 3" />
                </svg>
              )}
              {phase.state === "active" && (
                <svg width="8" height="8" viewBox="0 0 12 12" fill="#000" stroke="none">
                  <polygon points="3,2 10,6 3,10" />
                </svg>
              )}
            </div>
            <div style={{ flex: 1, paddingTop: 1 }}>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: phase.state === "upcoming" ? "var(--prv-text-3)" : "var(--prv-text-1)",
                  margin: "0 0 1px",
                }}
              >
                {phase.name}
              </p>
              <p style={{ fontSize: 10, color: "var(--prv-text-4)", margin: 0 }}>
                {formatDate(phase.startDate)} – {formatDate(phase.endDate)}
                {phase.state === "active" && ` · ${phase.completionPct}% done`}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Milestones */}
      <SectionLabel>Milestones</SectionLabel>
      <div
        style={{
          margin: "0 20px",
          borderRadius: 16,
          border: "1px solid var(--prv-border-subtle)",
          overflow: "hidden",
        }}
      >
        {project.milestones.map((m, i) => (
          <div
            key={m.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              background: "var(--prv-g1)",
              borderBottom:
                i < project.milestones.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 7,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                ...(m.done
                  ? { background: "rgba(255,255,255,0.14)" }
                  : {
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.12)",
                    }),
              }}
            >
              {m.done && (
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <polyline points="2 6 5 9 10 3" />
                </svg>
              )}
            </div>
            <span
              style={{
                fontSize: 12,
                flex: 1,
                color: m.done ? "var(--prv-text-3)" : "var(--prv-text-2)",
                textDecoration: m.done ? "line-through" : "none",
              }}
            >
              {m.text}
            </span>
            <span style={{ fontSize: 10, color: "var(--prv-text-4)", flexShrink: 0 }}>
              {formatDate(m.dueDate)}
            </span>
          </div>
        ))}
        <div
          style={{
            padding: "8px 14px",
            background: "rgba(255,255,255,0.02)",
            borderTop: "1px solid var(--prv-border-subtle)",
          }}
        >
          <span style={{ fontSize: 11, color: "var(--prv-text-4)" }}>
            {doneMilestones} of {project.milestones.length} complete
          </span>
        </div>
      </div>

      {/* Team */}
      <SectionLabel>Team</SectionLabel>
      <div
        style={{
          margin: "0 20px",
          borderRadius: 16,
          border: "1px solid var(--prv-border-subtle)",
          overflow: "hidden",
        }}
      >
        {project.team.map((member, i) => (
          <div
            key={member.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              background: "var(--prv-g1)",
              borderBottom:
                i < project.team.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 10,
                background: "var(--prv-g3)",
                border: "1px solid var(--prv-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
                color: "var(--prv-text-1)",
                flexShrink: 0,
              }}
            >
              {member.initials}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--prv-text-1)", margin: 0 }}>
                {member.name}
              </p>
            </div>
            <span style={{ fontSize: 11, color: "var(--prv-text-3)" }}>{member.role}</span>
          </div>
        ))}
      </div>

      {/* Activity */}
      <SectionLabel>Activity</SectionLabel>
      <div
        style={{
          margin: "0 20px 20px",
          borderRadius: 16,
          border: "1px solid var(--prv-border-subtle)",
          overflow: "hidden",
        }}
      >
        {project.activities.map((act, i) => (
          <div
            key={act.id}
            style={{
              display: "flex",
              gap: 10,
              padding: "10px 14px",
              background: "var(--prv-g1)",
              borderBottom:
                i < project.activities.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: ACTIVITY_DOT[act.type] ?? "rgba(255,255,255,0.3)",
                marginTop: 5,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--prv-text-2)",
                  margin: "0 0 2px",
                  lineHeight: 1.4,
                }}
              >
                {act.text}
              </p>
              <p style={{ fontSize: 10, color: "var(--prv-text-4)", margin: 0 }}>
                {getRelativeTime(act.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={openActions}
        style={{
          position: "fixed",
          bottom: 90,
          right: 20,
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.92)",
          color: "#000",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          zIndex: 20,
          fontSize: 22,
          fontWeight: 300,
        }}
        aria-label="Project actions"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: "var(--prv-text-4)",
        textTransform: "uppercase",
        letterSpacing: 0.9,
        padding: "0 20px",
        margin: "14px 0 8px",
      }}
    >
      {children}
    </p>
  )
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string; border: string; label: string }> = {
    active: {
      bg: "rgba(255,255,255,0.12)",
      color: "rgba(255,255,255,0.9)",
      border: "rgba(255,255,255,0.18)",
      label: "Active",
    },
    planning: {
      bg: "rgba(255,255,255,0.06)",
      color: "rgba(255,255,255,0.5)",
      border: "rgba(255,255,255,0.09)",
      label: "Planning",
    },
    review: {
      bg: "rgba(255,159,10,0.12)",
      color: "rgba(255,179,64,0.9)",
      border: "rgba(255,159,10,0.2)",
      label: "Review",
    },
    done: {
      bg: "rgba(48,209,88,0.12)",
      color: "rgba(80,220,120,0.9)",
      border: "rgba(48,209,88,0.2)",
      label: "Done",
    },
    hold: {
      bg: "rgba(255,255,255,0.06)",
      color: "rgba(255,255,255,0.4)",
      border: "rgba(255,255,255,0.09)",
      label: "On Hold",
    },
  }
  const s = styles[status] ?? styles.hold!
  return (
    <span
      style={{
        padding: "3px 9px",
        borderRadius: 100,
        background: s.bg,
        border: `1px solid ${s.border}`,
        fontSize: 10,
        fontWeight: 700,
        color: s.color,
        letterSpacing: 0.3,
        textTransform: "uppercase",
        marginLeft: "auto",
      }}
    >
      {s.label}
    </span>
  )
}

function ProjectActionsSheet({
  project,
  onClose,
}: {
  project: ProjectDetail
  onClose: () => void
}) {
  const [view, setView] = useState<"menu" | "flag" | "note" | "advance" | "pause">("menu")
  const [note, setNote] = useState("")
  const [flagType, setFlagType] = useState<"budget_risk" | "delay" | "quality">("budget_risk")
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("medium")
  const [flagNote, setFlagNote] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const nextPhase = project.phases.find((p) => p.state === "upcoming")

  const submit = async (action: () => Promise<void>) => {
    setLoading(true)
    try {
      await action()
      setDone(true)
      setTimeout(onClose, 1000)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{ padding: "32px 20px 40px", textAlign: "center" }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: "rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p style={{ fontSize: 15, fontWeight: 600, color: "var(--prv-text-1)", margin: 0 }}>Done</p>
      </div>
    )
  }

  if (view === "note") {
    return (
      <div style={{ padding: "4px 20px 40px" }}>
        <button
          onClick={() => setView("menu")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--prv-text-3)",
            background: "none",
            border: "none",
            cursor: "pointer",
            marginBottom: 16,
            padding: 0,
          }}
        >
          <IconChevronLeftSmall />
          Back
        </button>
        <p
          style={{ fontSize: 16, fontWeight: 700, color: "var(--prv-text-1)", margin: "0 0 14px" }}
        >
          Add Site Note
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Describe what's happening on site…"
          maxLength={500}
          rows={4}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 14,
            background: "var(--prv-g2)",
            border: "1px solid var(--prv-border)",
            color: "var(--prv-text-1)",
            fontSize: 14,
            resize: "none",
            outline: "none",
            fontFamily: "inherit",
            lineHeight: 1.5,
            boxSizing: "border-box",
            marginBottom: 12,
          }}
          autoFocus
        />
        <button
          onClick={() =>
            submit(async () => {
              await fetch(`/api/projects/${project.id}/flag`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "quality", severity: "low", note }),
              })
            })
          }
          disabled={!note.trim() || loading}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 16,
            background: "rgba(255,255,255,0.92)",
            color: "#000",
            border: "none",
            fontSize: 15,
            fontWeight: 700,
            cursor: note.trim() && !loading ? "pointer" : "not-allowed",
            opacity: note.trim() && !loading ? 1 : 0.5,
          }}
        >
          {loading ? "Saving…" : "Save Note"}
        </button>
      </div>
    )
  }

  if (view === "flag") {
    return (
      <div style={{ padding: "4px 20px 40px" }}>
        <button
          onClick={() => setView("menu")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--prv-text-3)",
            background: "none",
            border: "none",
            cursor: "pointer",
            marginBottom: 16,
            padding: 0,
          }}
        >
          <IconChevronLeftSmall />
          Back
        </button>
        <p
          style={{ fontSize: 16, fontWeight: 700, color: "var(--prv-text-1)", margin: "0 0 14px" }}
        >
          Flag Issue
        </p>

        <p style={{ fontSize: 12, color: "var(--prv-text-3)", margin: "0 0 6px" }}>Type</p>
        <div style={{ display: "flex", gap: 7, marginBottom: 14 }}>
          {(["budget_risk", "delay", "quality"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFlagType(t)}
              style={{
                padding: "7px 12px",
                borderRadius: 10,
                border:
                  flagType === t
                    ? "1px solid rgba(255,179,64,0.4)"
                    : "1px solid var(--prv-border-subtle)",
                background: flagType === t ? "rgba(255,159,10,0.12)" : "var(--prv-g1)",
                color: flagType === t ? "rgba(255,179,64,0.9)" : "var(--prv-text-3)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t === "budget_risk" ? "Budget" : t === "delay" ? "Delay" : "Quality"}
            </button>
          ))}
        </div>

        <p style={{ fontSize: 12, color: "var(--prv-text-3)", margin: "0 0 6px" }}>Severity</p>
        <div style={{ display: "flex", gap: 7, marginBottom: 14 }}>
          {(["low", "medium", "high"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              style={{
                padding: "7px 12px",
                borderRadius: 10,
                border:
                  severity === s
                    ? "1px solid rgba(255,59,48,0.3)"
                    : "1px solid var(--prv-border-subtle)",
                background: severity === s ? "rgba(255,59,48,0.10)" : "var(--prv-g1)",
                color: severity === s ? "rgba(255,99,90,0.9)" : "var(--prv-text-3)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <textarea
          value={flagNote}
          onChange={(e) => setFlagNote(e.target.value)}
          placeholder="Describe the issue…"
          maxLength={500}
          rows={3}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 14,
            background: "var(--prv-g2)",
            border: "1px solid var(--prv-border)",
            color: "var(--prv-text-1)",
            fontSize: 14,
            resize: "none",
            outline: "none",
            fontFamily: "inherit",
            lineHeight: 1.5,
            boxSizing: "border-box",
            marginBottom: 12,
          }}
        />
        <button
          onClick={() =>
            submit(async () => {
              await fetch(`/api/projects/${project.id}/flag`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: flagType, severity, note: flagNote }),
              })
            })
          }
          disabled={!flagNote.trim() || loading}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 16,
            background: "rgba(255,59,48,0.10)",
            color: "rgba(255,99,90,0.9)",
            border: "1px solid rgba(255,59,48,0.2)",
            fontSize: 15,
            fontWeight: 700,
            cursor: flagNote.trim() && !loading ? "pointer" : "not-allowed",
            opacity: flagNote.trim() && !loading ? 1 : 0.5,
          }}
        >
          {loading ? "Flagging…" : "Submit Flag"}
        </button>
      </div>
    )
  }

  if (view === "advance") {
    return (
      <div style={{ padding: "4px 20px 40px" }}>
        <button
          onClick={() => setView("menu")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--prv-text-3)",
            background: "none",
            border: "none",
            cursor: "pointer",
            marginBottom: 16,
            padding: 0,
          }}
        >
          <IconChevronLeftSmall />
          Back
        </button>
        <p style={{ fontSize: 16, fontWeight: 700, color: "var(--prv-text-1)", margin: "0 0 6px" }}>
          Advance Phase
        </p>
        <p style={{ fontSize: 13, color: "var(--prv-text-3)", margin: "0 0 16px" }}>
          Move from{" "}
          <strong style={{ color: "var(--prv-text-2)" }}>{project.currentPhaseName}</strong> to{" "}
          <strong style={{ color: "var(--prv-text-2)" }}>{nextPhase?.name ?? "Handover"}</strong>?
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Completion note (optional)…"
          maxLength={500}
          rows={2}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 14,
            background: "var(--prv-g2)",
            border: "1px solid var(--prv-border)",
            color: "var(--prv-text-1)",
            fontSize: 14,
            resize: "none",
            outline: "none",
            fontFamily: "inherit",
            lineHeight: 1.5,
            boxSizing: "border-box",
            marginBottom: 12,
          }}
        />
        <button
          onClick={() =>
            submit(async () => {
              await fetch(`/api/projects/${project.id}/phase`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "advance", note: note.trim() || undefined }),
              })
            })
          }
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 16,
            background: "rgba(255,255,255,0.92)",
            color: "#000",
            border: "none",
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Processing…" : "Confirm Advance"}
        </button>
      </div>
    )
  }

  if (view === "pause") {
    return (
      <div style={{ padding: "4px 20px 40px" }}>
        <button
          onClick={() => setView("menu")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--prv-text-3)",
            background: "none",
            border: "none",
            cursor: "pointer",
            marginBottom: 16,
            padding: 0,
          }}
        >
          <IconChevronLeftSmall />
          Back
        </button>
        <p style={{ fontSize: 16, fontWeight: 700, color: "var(--prv-text-1)", margin: "0 0 6px" }}>
          Pause Project
        </p>
        <p style={{ fontSize: 13, color: "var(--prv-text-3)", margin: "0 0 16px" }}>
          This will notify the team and log the pause in the audit trail.
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reason for pausing…"
          maxLength={500}
          rows={3}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 14,
            background: "var(--prv-g2)",
            border: "1px solid var(--prv-border)",
            color: "var(--prv-text-1)",
            fontSize: 14,
            resize: "none",
            outline: "none",
            fontFamily: "inherit",
            lineHeight: 1.5,
            boxSizing: "border-box",
            marginBottom: 12,
          }}
        />
        <button
          onClick={() =>
            submit(async () => {
              await fetch(`/api/projects/${project.id}/flag`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "delay",
                  severity: "high",
                  note: note || "Project paused",
                }),
              })
            })
          }
          disabled={!note.trim() || loading}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 16,
            background: "rgba(255,59,48,0.10)",
            color: "rgba(255,99,90,0.9)",
            border: "1px solid rgba(255,59,48,0.2)",
            fontSize: 15,
            fontWeight: 700,
            cursor: note.trim() && !loading ? "pointer" : "not-allowed",
            opacity: note.trim() && !loading ? 1 : 0.5,
          }}
        >
          {loading ? "Processing…" : "Pause Project"}
        </button>
      </div>
    )
  }

  // Default: menu
  const actions: {
    id: "advance" | "note" | "flag" | "pause"
    label: string
    style: "white" | "warn" | "danger"
  }[] = [
    ...(nextPhase
      ? [{ id: "advance" as const, label: `Advance to ${nextPhase.name}`, style: "white" as const }]
      : []),
    { id: "note", label: "Add Site Note", style: "white" },
    { id: "flag", label: "Flag Budget Risk", style: "warn" },
    { id: "pause", label: "Pause Project", style: "danger" },
  ]

  return (
    <div style={{ padding: "4px 20px 32px" }}>
      {/* Client contact */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 14px",
          borderRadius: 16,
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: "var(--prv-g3)",
            border: "1px solid var(--prv-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            color: "var(--prv-text-1)",
            flexShrink: 0,
          }}
        >
          {project.clientInitials}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--prv-text-1)", margin: 0 }}>
            {project.clientContactName}
          </p>
          <p style={{ fontSize: 11, color: "var(--prv-text-3)", margin: "2px 0 0" }}>
            {project.clientPhone}
          </p>
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          <a
            href={`tel:${project.clientPhone}`}
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "var(--prv-g2)",
              border: "1px solid var(--prv-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--prv-text-2)",
              textDecoration: "none",
            }}
          >
            <IconPhone />
          </a>
          <a
            href={`mailto:${project.clientName.toLowerCase().replace(/\s/g, "")}@client.ro`}
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "var(--prv-g2)",
              border: "1px solid var(--prv-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--prv-text-2)",
              textDecoration: "none",
            }}
          >
            <IconMail />
          </a>
        </div>
      </div>

      {/* Action list */}
      <div
        style={{
          borderRadius: 16,
          border: "1px solid var(--prv-border-subtle)",
          overflow: "hidden",
        }}
      >
        {actions.map((action, i) => (
          <button
            key={action.id}
            onClick={() => setView(action.id as typeof view)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "13px 14px",
              width: "100%",
              background: "var(--prv-g1)",
              border: "none",
              borderBottom: i < actions.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                flexShrink: 0,
                color:
                  action.style === "warn"
                    ? "rgba(255,179,64,0.9)"
                    : action.style === "danger"
                      ? "rgba(255,99,90,0.9)"
                      : "var(--prv-text-2)",
                ...(action.style === "warn"
                  ? {
                      background: "rgba(255,159,10,0.12)",
                      border: "1px solid rgba(255,159,10,0.18)",
                    }
                  : action.style === "danger"
                    ? {
                        background: "rgba(255,59,48,0.10)",
                        border: "1px solid rgba(255,59,48,0.15)",
                      }
                    : { background: "var(--prv-g2)", border: "1px solid var(--prv-border)" }),
              }}
            >
              {ACTION_ICONS[action.id]}
            </div>
            <span
              style={{
                fontSize: 14,
                fontWeight: 500,
                flex: 1,
                color:
                  action.style === "warn"
                    ? "rgba(255,179,64,0.9)"
                    : action.style === "danger"
                      ? "rgba(255,99,90,0.9)"
                      : "var(--prv-text-1)",
              }}
            >
              {action.label}
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ color: "var(--prv-text-4)", flexShrink: 0 }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>

      <button
        onClick={onClose}
        style={{
          width: "100%",
          padding: "12px",
          marginTop: 10,
          borderRadius: 14,
          background: "transparent",
          border: "none",
          color: "var(--prv-text-4)",
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        Cancel
      </button>
    </div>
  )
}
