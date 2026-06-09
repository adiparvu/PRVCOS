"use client"
import { useRouter } from "next/navigation"

import { useState } from "react"
import Link from "next/link"
import type { ProjectSummary, ProjectStatus } from "@/app/api/projects/route"
import { useProjects } from "@/lib/api-hooks"

// ── Icons (SF Symbol style) ───────────────────────────────────────────────────

function IconPlus() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg
      width="7"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

function IconChevronLeft() {
  return (
    <svg
      width="9"
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

function IconWarning() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "inline", verticalAlign: "middle", marginRight: 2 }}
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number) {
  return "€" + amount.toLocaleString("ro-RO")
}

function budgetBorder(project: ProjectSummary): string | undefined {
  const r = project.spent / project.budget
  if (r > 1) return "linear-gradient(180deg,#ff4444,#ff6b6b)"
  if (r > 0.8) return "linear-gradient(180deg,#ffaa00,#ffcc44)"
  return undefined
}

type FilterId = "all" | ProjectStatus

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Toate" },
  { id: "active", label: "Active" },
  { id: "planning", label: "Planificare" },
  { id: "review", label: "Review" },
  { id: "done", label: "Finalizate" },
  { id: "hold", label: "Pauză" },
]

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  active: {
    label: "Activ",
    color: "rgba(255,255,255,0.90)",
    bg: "rgba(255,255,255,0.12)",
    border: "rgba(255,255,255,0.20)",
  },
  planning: {
    label: "Planificare",
    color: "rgba(255,255,255,0.45)",
    bg: "rgba(255,255,255,0.07)",
    border: "rgba(255,255,255,0.12)",
  },
  review: {
    label: "Review",
    color: "#ffcc44",
    bg: "rgba(255,204,68,0.12)",
    border: "rgba(255,204,68,0.24)",
  },
  done: {
    label: "Finalizat",
    color: "#5affa0",
    bg: "rgba(80,255,140,0.10)",
    border: "rgba(80,255,140,0.20)",
  },
  hold: {
    label: "Pauză",
    color: "rgba(255,255,255,0.30)",
    bg: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.10)",
  },
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div
          style={{ width: 120, height: 28, background: "var(--prv-g2)", borderRadius: 8 }}
          className="animate-pulse"
        />
        <div
          style={{ width: 32, height: 32, background: "var(--prv-g2)", borderRadius: 100 }}
          className="animate-pulse"
        />
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: 62,
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 16,
            }}
            className="animate-pulse"
          />
        ))}
      </div>
      <div className="flex gap-2 mb-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: 72,
              height: 30,
              background: "var(--prv-g1)",
              borderRadius: 100,
              flexShrink: 0,
            }}
            className="animate-pulse"
          />
        ))}
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            height: 100,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            borderRadius: 16,
            marginBottom: 8,
          }}
          className="animate-pulse"
        />
      ))}
    </div>
  )
}

// ── Project card ──────────────────────────────────────────────────────────────

function ProjectCard({ project }: { project: ProjectSummary }) {
  const cfg = STATUS_CONFIG[project.status]
  const leftBorder = budgetBorder(project)
  const isOverBudget = project.spent > project.budget
  const isNearBudget = !isOverBudget && project.spent / project.budget > 0.8
  const budgetColor = isOverBudget ? "#ff6b6b" : isNearBudget ? "#ffcc44" : "rgba(255,255,255,0.35)"
  const progressColor =
    project.status === "done"
      ? "#5affa0"
      : project.status === "review"
        ? "#ffcc44"
        : "rgba(255,255,255,0.55)"

  return (
    <Link
      href={`/projects/${project.id}`}
      style={{
        display: "block",
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        borderRadius: 16,
        padding: "12px 14px",
        position: "relative",
        overflow: "hidden",
        textDecoration: "none",
        marginBottom: 8,
      }}
    >
      {leftBorder && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            background: leftBorder,
            borderRadius: "16px 0 0 16px",
          }}
        />
      )}
      <div style={{ paddingLeft: leftBorder ? 4 : 0 }}>
        {/* Top row: name + status pill */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 5,
          }}
        >
          <div style={{ flex: 1, paddingRight: 8 }}>
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "rgba(255,255,255,0.92)",
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              {project.name}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 5,
                  background: "var(--prv-g3)",
                  border: "1px solid var(--prv-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 7,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.55)",
                  flexShrink: 0,
                }}
              >
                {project.clientInitials}
              </div>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: 0 }}>
                {project.clientName}
              </p>
            </div>
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              padding: "3px 8px",
              borderRadius: 100,
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              color: cfg.color,
              flexShrink: 0,
            }}
          >
            {cfg.label}
          </span>
        </div>

        {/* Phase progress bar */}
        <div style={{ marginBottom: 8 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 3,
            }}
          >
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.40)" }}>
              {project.currentPhaseName}
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>
              {project.completionPct}%
            </span>
          </div>
          <div
            style={{
              height: 3,
              borderRadius: 100,
              background: "rgba(255,255,255,0.07)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: 100,
                width: `${project.completionPct}%`,
                background: progressColor,
              }}
            />
          </div>
        </div>

        {/* Footer: budget + days + team avatars + chevron */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 10,
                color: budgetColor,
                fontWeight: isOverBudget || isNearBudget ? 600 : 400,
                display: "flex",
                alignItems: "center",
              }}
            >
              {(isOverBudget || isNearBudget) && <IconWarning />}
              {fmt(project.spent)} / {fmt(project.budget)}
            </span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
              {project.daysLeft > 0 ? `${project.daysLeft}z` : "Încheiat"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {/* Team avatar stack */}
            <div style={{ display: "flex" }}>
              {project.team.slice(0, 3).map((member, i) => (
                <div
                  key={member.id}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 7,
                    background: "var(--prv-g3)",
                    border: "1px solid var(--prv-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 7,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.55)",
                    marginLeft: i > 0 ? -4 : 0,
                    zIndex: 3 - i,
                    position: "relative",
                  }}
                >
                  {member.initials}
                </div>
              ))}
              {project.team.length > 3 && (
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 7,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid var(--prv-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 7,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.35)",
                    marginLeft: -4,
                    position: "relative",
                    zIndex: 0,
                  }}
                >
                  +{project.team.length - 3}
                </div>
              )}
            </div>
            <span style={{ color: "rgba(255,255,255,0.20)" }}>
              <IconChevronRight />
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProjectListClient() {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterId>("all")
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useProjects()
  const projects = data?.projects ?? []

  if (isLoading) return <Skeleton />

  const visible = filter === "all" ? projects : projects.filter((p) => p.status === filter)
  const active = projects.filter((p) => p.status === "active")
  const overBudget = projects.filter((p) => p.spent > p.budget)
  const activeBudgetTotal = active.reduce((s, p) => s + p.budget, 0)

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            href="/crm"
            style={{
              display: "flex",
              alignItems: "center",
              color: "rgba(255,255,255,0.40)",
              textDecoration: "none",
              marginRight: 2,
            }}
          >
            <IconChevronLeft />
          </Link>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "-0.5px",
              color: "rgba(255,255,255,0.95)",
            }}
          >
            Proiecte
          </h1>
        </div>
        <button
          onClick={() => router.push('/projects/new')}
          style={{
            width: 32,
            height: 32,
            background: "rgba(255,255,255,0.92)",
            borderRadius: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            cursor: "pointer",
            color: "#000",
          }}
        >
          <IconPlus />
        </button>
      </div>

      {/* KPI strip */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}
      >
        <div
          style={{
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            borderRadius: 16,
            padding: "10px 10px 8px",
          }}
        >
          <p
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "rgba(255,255,255,0.95)",
              letterSpacing: "-0.3px",
            }}
          >
            {active.length}
          </p>
          <p
            style={{
              fontSize: 9,
              fontWeight: 500,
              color: "rgba(255,255,255,0.35)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginTop: 2,
            }}
          >
            Active
          </p>
        </div>
        <div
          style={{
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            borderRadius: 16,
            padding: "10px 10px 8px",
          }}
        >
          <p
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: overBudget.length > 0 ? "#ff6b6b" : "#5affa0",
              letterSpacing: "-0.3px",
            }}
          >
            {overBudget.length}
          </p>
          <p
            style={{
              fontSize: 9,
              fontWeight: 500,
              color: "rgba(255,255,255,0.35)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginTop: 2,
            }}
          >
            Risc buget
          </p>
        </div>
        <div
          style={{
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            borderRadius: 16,
            padding: "10px 10px 8px",
          }}
        >
          <p
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#7eb8ff",
              letterSpacing: "-0.3px",
            }}
          >
            {fmt(activeBudgetTotal)}
          </p>
          <p
            style={{
              fontSize: 9,
              fontWeight: 500,
              color: "rgba(255,255,255,0.35)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginTop: 2,
            }}
          >
            Pipeline
          </p>
        </div>
      </div>

      {/* Filter chips */}
      <div
        style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}
      >
        {FILTERS.map(({ id, label }) => {
          const count = id === "all" ? null : projects.filter((p) => p.status === id).length
          return (
            <button
              key={id}
              onClick={() => setFilter(id)}
              style={{
                flexShrink: 0,
                padding: "5px 12px",
                borderRadius: 100,
                fontSize: 11,
                fontWeight: 500,
                border:
                  filter === id
                    ? "1px solid rgba(255,255,255,0.28)"
                    : "1px solid rgba(255,255,255,0.10)",
                background: filter === id ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.07)",
                color: filter === id ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.55)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {label}
              {count !== null && count > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.65)" }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* List */}
      <div>
        {visible.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
              color: "rgba(255,255,255,0.30)",
              fontSize: 14,
            }}
          >
            Niciun proiect găsit
          </div>
        ) : (
          visible.map((p) => <ProjectCard key={p.id} project={p} />)
        )}
        {hasNextPage && (
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            style={{
              width: "100%",
              padding: "12px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              color: "rgba(255,255,255,0.65)",
              fontSize: 13,
              fontWeight: 500,
              cursor: isFetchingNextPage ? "default" : "pointer",
              marginTop: 8,
            }}
          >
            {isFetchingNextPage ? "Se încarcă..." : "Încarcă mai mult"}
          </button>
        )}
      </div>
    </div>
  )
}
