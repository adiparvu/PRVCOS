"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRenovationProjects, type RenovationProjectSummary } from "@/lib/api-hooks"
import { fmtShortDate } from "@/lib/formatters"
import {
  GlassSegmentedControl,
  GlassProgressBar,
  GlassKanban,
  type SegmentItem,
  type KanbanColumn,
} from "@prv/ui"

// ── Status helpers ─────────────────────────────────────────────────────────────

type StatusGroup = "pipeline" | "active" | "review" | "done" | "cancelled"

function toGroup(status: string): StatusGroup {
  if (["inquiry", "estimation"].includes(status)) return "pipeline"
  if (["contracted", "in_progress", "paused"].includes(status)) return "active"
  if (status === "completed") return "done"
  if (status === "cancelled") return "cancelled"
  return "pipeline"
}

const STATUS_STYLE: Record<StatusGroup, { bg: string; color: string; label: string }> = {
  pipeline: {
    bg: "rgba(255,159,10,0.12)",
    color: "rgba(255,159,10,0.95)",
    label: "Pipeline",
  },
  active: { bg: "rgba(10,132,255,0.12)", color: "rgba(10,132,255,0.9)", label: "Active" },
  review: { bg: "rgba(191,90,242,0.12)", color: "rgba(191,90,242,0.9)", label: "Review" },
  done: { bg: "rgba(48,209,88,0.12)", color: "rgba(48,209,88,0.95)", label: "Done" },
  cancelled: { bg: "var(--prv-border)", color: "var(--prv-text-3)", label: "Cancelled" },
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: "rgba(255,59,48,0.9)",
  high: "rgba(255,159,10,0.9)",
  medium: "rgba(10,132,255,0.9)",
  low: "var(--prv-text-3)",
}

const TYPE_LABEL: Record<string, string> = {
  residential: "Residential",
  commercial: "Commercial",
  industrial: "Industrial",
  public: "Public",
}

const FILTER_ITEMS: SegmentItem[] = [
  { id: "all", label: "All" },
  { id: "in_progress", label: "In Progress" },
  { id: "estimation", label: "Estimation" },
  { id: "completed", label: "Done" },
]

const BOARD_COLS: Array<{ id: StatusGroup; title: string; color: string }> = [
  { id: "pipeline", title: "Pipeline", color: "rgba(255,159,10,0.9)" },
  { id: "active", title: "Active", color: "rgba(10,132,255,0.9)" },
  { id: "review", title: "Review", color: "rgba(191,90,242,0.9)" },
  { id: "done", title: "Done", color: "rgba(48,209,88,0.95)" },
]

function buildBoard(projects: RenovationProjectSummary[]): KanbanColumn[] {
  return BOARD_COLS.map((col) => ({
    id: col.id,
    title: col.title,
    color: col.color,
    cards: projects
      .filter((p) => toGroup(p.status) === col.id)
      .map((p) => ({ id: p.id, title: p.title, data: p })),
  }))
}

// ── Card ──────────────────────────────────────────────────────────────────────

function ProjectCard({ project }: { project: RenovationProjectSummary }) {
  const group = toGroup(project.status)
  const s = STATUS_STYLE[group]
  const priorityColor = PRIORITY_DOT[project.priority] ?? "var(--prv-text-3)"
  const value = project.contractedValue ?? project.estimatedValue
  const valueStr = value
    ? new Intl.NumberFormat("ro-RO", {
        style: "currency",
        currency: project.currency,
        maximumFractionDigits: 0,
      }).format(value)
    : "—"

  return (
    <Link
      href={`/renovation/${project.id}`}
      className="block w-full px-4 py-3.5"
      style={{ borderBottom: "1px solid var(--prv-border-subtle)", textDecoration: "none" }}
    >
      <div className="flex items-start gap-2.5 mb-2">
        <div
          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
          style={{ background: priorityColor }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-white/90 leading-snug truncate">
            {project.title}
          </p>
          {project.projectCode && (
            <p className="text-[11px] text-white/30 mt-0.5">{project.projectCode}</p>
          )}
        </div>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px] shrink-0"
          style={{ background: s.bg, color: s.color }}
        >
          {s.label}
        </span>
      </div>

      <div className="flex gap-3 mb-2.5 pl-4.5">
        {project.clientName && (
          <span className="text-[12px] text-white/35 truncate">
            <span className="text-white/50">{project.clientName}</span>
          </span>
        )}
        {project.city && <span className="text-[12px] text-white/30">{project.city}</span>}
        <span className="text-[12px] text-white/30">
          {TYPE_LABEL[project.projectType] ?? project.projectType}
        </span>
        {value !== null && (
          <span className="text-[12px] font-semibold text-white/55 ml-auto shrink-0">
            {valueStr}
          </span>
        )}
      </div>

      <div className="pl-4.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-white/30">Progress</span>
          <span className="text-[10px] font-semibold text-white/40">
            {project.completionPercentage}%
          </span>
        </div>
        <GlassProgressBar
          value={project.completionPercentage}
          size="sm"
          color={group === "done" ? "green" : group === "active" ? "blue" : "white"}
          animated
        />
        {(project.estimatedStartDate || project.estimatedEndDate) && (
          <div className="flex items-center gap-2 mt-2">
            {project.estimatedStartDate && (
              <span className="text-[10px] text-white/30">
                Start:{" "}
                <span className="text-white/45">{fmtShortDate(project.estimatedStartDate)}</span>
              </span>
            )}
            {project.estimatedEndDate && (
              <span className="text-[10px] text-white/30">
                End: <span className="text-white/45">{fmtShortDate(project.estimatedEndDate)}</span>
              </span>
            )}
            {project.projectManagerName && (
              <span className="text-[10px] text-white/30 ml-auto">
                PM: <span className="text-white/50">{project.projectManagerName}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}

// ── Main workspace ─────────────────────────────────────────────────────────────

export function RenovationWorkspace() {
  const [filter, setFilter] = useState("all")
  const [view, setView] = useState<"list" | "board">("list")
  const [boardCols, setBoardCols] = useState<KanbanColumn[] | null>(null)

  const { data, isLoading } = useRenovationProjects(filter === "all" ? null : filter)
  const projects = useMemo<RenovationProjectSummary[]>(() => data?.projects ?? [], [data?.projects])

  const computedBoardCols = useMemo(() => boardCols ?? buildBoard(projects), [boardCols, projects])

  // KPI counts
  const active = projects.filter((p) => ["contracted", "in_progress"].includes(p.status)).length
  const estimation = projects.filter((p) => p.status === "estimation").length
  const done = projects.filter((p) => p.status === "completed").length
  const pipeline = projects.reduce((s, p) => s + (p.estimatedValue ?? 0), 0)

  const pipelineStr = new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(pipeline)

  function handleBoardMove(cardId: string, fromCol: string, toCol: string) {
    setBoardCols((prev) => {
      const base: KanbanColumn[] = prev ?? buildBoard(projects)
      const next = base.map((col) => ({ ...col, cards: [...col.cards] }))
      const from = next.find((c) => c.id === fromCol)
      const to = next.find((c) => c.id === toCol)
      if (!from || !to) return base
      const idx = from.cards.findIndex((c) => c.id === cardId)
      if (idx === -1) return base
      const [card] = from.cards.splice(idx, 1)
      to.cards.push(card!)
      return next
    })
  }

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-white/35 text-[13px] font-medium mb-0.5">PRV Renovations</p>
          <h1 className="text-white/90 text-[26px] font-semibold tracking-tight leading-tight">
            Projects
          </h1>
        </div>
        <div className="flex gap-1.5">
          {(["list", "board"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="w-9 h-9 rounded-[10px] flex items-center justify-center"
              style={{
                background: view === v ? "rgba(255,255,255,0.14)" : "var(--prv-g1)",
                border: `1px solid ${view === v ? "rgba(255,255,255,0.22)" : "var(--prv-border-subtle)"}`,
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke={view === v ? "rgba(255,255,255,0.85)" : "var(--prv-text-2)"}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {v === "list" ? (
                  <>
                    <line x1="9" y1="6" x2="20" y2="6" />
                    <line x1="9" y1="12" x2="20" y2="12" />
                    <line x1="9" y1="18" x2="20" y2="18" />
                    <circle cx="4" cy="6" r="1" fill="currentColor" />
                    <circle cx="4" cy="12" r="1" fill="currentColor" />
                    <circle cx="4" cy="18" r="1" fill="currentColor" />
                  </>
                ) : (
                  <>
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                  </>
                )}
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { v: isLoading ? "…" : String(active), l: "Active", color: "rgba(10,132,255,0.9)" },
          {
            v: isLoading ? "…" : String(estimation),
            l: "Estimation",
            color: "rgba(255,159,10,0.95)",
          },
          { v: isLoading ? "…" : String(done), l: "Done", color: "rgba(48,209,88,0.95)" },
          { v: isLoading ? "…" : pipelineStr, l: "Pipeline", color: "var(--prv-text-1)" },
        ].map(({ v, l, color }) => (
          <div
            key={l}
            className="py-3 rounded-[14px] text-center"
            style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
          >
            <p className="text-[18px] font-bold" style={{ color }}>
              {v}
            </p>
            <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mt-1">
              {l}
            </p>
          </div>
        ))}
      </div>

      {/* Filter — list only */}
      {view === "list" && (
        <GlassSegmentedControl
          items={FILTER_ITEMS}
          activeId={filter}
          onChange={setFilter}
          fullWidth
          className="mb-4"
        />
      )}

      {/* List view */}
      {view === "list" && (
        <div
          className="rounded-[18px] overflow-hidden"
          style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
        >
          {isLoading ? (
            <div className="py-12 text-center text-white/30 text-[14px]">Loading projects…</div>
          ) : projects.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-white/35 text-[15px] font-medium mb-1">No projects found</p>
              <p className="text-white/20 text-[13px]">
                {filter !== "all"
                  ? "Try a different filter"
                  : "Create your first renovation project"}
              </p>
            </div>
          ) : (
            projects.map((p) => <ProjectCard key={p.id} project={p} />)
          )}
        </div>
      )}

      {/* Board view */}
      {view === "board" && (
        <GlassKanban
          columns={computedBoardCols}
          onCardMove={handleBoardMove}
          renderCard={(card) => {
            const p = card.data as RenovationProjectSummary
            const group = toGroup(p.status)
            const s = STATUS_STYLE[group]
            return (
              <Link
                href={`/renovation/${p.id}`}
                style={{ textDecoration: "none", display: "block" }}
              >
                <p className="text-[13px] font-semibold text-white/90 mb-1.5 leading-snug">
                  {p.title}
                </p>
                <p className="text-[11px] text-white/40 mb-2">
                  {p.clientName ?? p.city ?? TYPE_LABEL[p.projectType]}
                </p>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[5px]"
                    style={{ background: s.bg, color: s.color }}
                  >
                    {s.label}
                  </span>
                  <span className="text-[10px] text-white/35">{p.completionPercentage}%</span>
                </div>
                <div
                  className="h-1 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${p.completionPercentage}%`,
                      background: s.color,
                    }}
                  />
                </div>
              </Link>
            )
          }}
        />
      )}
    </div>
  )
}
