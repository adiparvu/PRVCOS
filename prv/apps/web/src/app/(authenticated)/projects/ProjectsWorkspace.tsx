"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useProjects } from "@/lib/api-hooks"
import type { ProjectSummary } from "@/app/api/projects/route"
import { fmtEuro, fmtShortDate } from "@/lib/formatters"
import {
  GlassSegmentedControl,
  GlassProgressBar,
  GlassStatusDot,
  GlassTabs,
  GlassKanban,
  type SegmentItem,
  type TabItem,
  type KanbanColumn,
} from "@prv/ui"

// ── Types ─────────────────────────────────────────────────────────────────────

type ProjectStatus = "active" | "review" | "done" | "hold"
type ProjectType = "renovation" | "internal"

interface Phase {
  num: number
  name: string
  dates: string
  pct: number
  state: "done" | "active" | "pending"
}

interface TeamMember {
  initials: string
  name: string
  role: string
  status: "online" | "away" | "busy" | "offline"
  statusLabel: string
}

interface Project {
  id: string
  name: string
  pm: string
  value: string
  due: string
  pct: number
  status: ProjectStatus
  type: ProjectType
  location: string
  workers: number
  phases: Phase[]
  team: TeamMember[]
  financials: { estimated: number; spent: number; invoiced: number }
}

// ── Static data ───────────────────────────────────────────────────────────────

const FILTER_ITEMS: SegmentItem[] = [
  { id: "all", label: "All" },
  { id: "renovation", label: "Renovation" },
  { id: "internal", label: "Internal" },
  { id: "done", label: "Done" },
]

const BOARD_COLS: Array<{ id: ProjectStatus; title: string; color: string }> = [
  { id: "hold", title: "On Hold", color: "var(--prv-text-3)" },
  { id: "active", title: "Active", color: "rgba(10,132,255,0.9)" },
  { id: "review", title: "Review", color: "rgba(255,159,10,0.95)" },
  { id: "done", title: "Done", color: "rgba(48,209,88,0.95)" },
]

function buildBoardColumns(projects: Project[]): KanbanColumn[] {
  return BOARD_COLS.map((col) => ({
    id: col.id,
    title: col.title,
    color: col.color,
    cards: projects
      .filter((p) => p.status === col.id)
      .map((p) => ({ id: p.id, title: p.name, data: p })),
  }))
}

const DETAIL_TABS: TabItem[] = [
  { value: "overview", label: "Overview" },
  { value: "phases", label: "Phases" },
  { value: "team", label: "Team" },
  { value: "financials", label: "Financials" },
]

// ── API mappers ───────────────────────────────────────────────────────────────

function buildFallbackPhases(p: ProjectSummary): Phase[] {
  const phaseName = p.currentPhaseName || "In Progress"
  if (p.completionPct === 100) {
    return [
      {
        num: 1,
        name: phaseName,
        dates: `${fmtShortDate(p.startDate)} – ${fmtShortDate(p.endDate)}`,
        pct: 100,
        state: "done",
      },
    ]
  }
  if (p.completionPct > 0) {
    return [
      { num: 1, name: "Completed work", dates: fmtShortDate(p.startDate), pct: 100, state: "done" },
      {
        num: 2,
        name: phaseName,
        dates: `${fmtShortDate(p.startDate)} – ${fmtShortDate(p.endDate)}`,
        pct: p.completionPct,
        state: "active",
      },
      { num: 3, name: "Remaining", dates: fmtShortDate(p.endDate), pct: 0, state: "pending" },
    ]
  }
  return [
    {
      num: 1,
      name: phaseName,
      dates: `${fmtShortDate(p.startDate)} – ${fmtShortDate(p.endDate)}`,
      pct: 0,
      state: "pending",
    },
  ]
}

function mapApiProject(p: ProjectSummary): Project {
  const pmMember = p.team[0]
  const pmName = pmMember?.name ?? p.clientName
  const pmShort = pmName
    .split(" ")
    .map((w, i) => (i === 0 ? w : (w[0] ?? "") + "."))
    .join(" ")
  const teamMapped: TeamMember[] = p.team.map((m, i) => ({
    initials: m.initials,
    name: m.name,
    role: m.role,
    status: (i === 0 ? "online" : i < 2 ? "online" : "offline") as TeamMember["status"],
    statusLabel: i === 0 ? "On Site" : "Off Shift",
  }))
  return {
    id: p.id,
    name: p.name,
    pm: pmShort,
    value: fmtEuro(p.budget),
    due: fmtShortDate(p.endDate),
    pct: p.completionPct,
    status: p.status === "planning" ? "hold" : (p.status as ProjectStatus),
    type: "renovation",
    location: p.clientName,
    workers: p.team.length,
    phases: buildFallbackPhases(p),
    team: teamMapped,
    financials: { estimated: p.budget, spent: p.spent, invoiced: p.spent },
  }
}

// ── Mock data (unused when API returns data; kept for empty-state type safety) ─

const PROJECTS: Project[] = [
  {
    id: "p1",
    name: "Apartment Renovation · Cluj Manastur",
    pm: "Andrei P.",
    value: "€18,400",
    due: "Jun 28",
    pct: 72,
    status: "active",
    type: "renovation",
    location: "Cluj",
    workers: 6,
    phases: [
      { num: 1, name: "Demolition & Prep", dates: "May 12 – May 18", pct: 100, state: "done" },
      { num: 2, name: "Electrical & Plumbing", dates: "May 19 – Jun 2", pct: 100, state: "done" },
      { num: 3, name: "Finishes & Tiling", dates: "Jun 3 – Jun 22", pct: 58, state: "active" },
      { num: 4, name: "Painting & Fixtures", dates: "Jun 23 – Jun 27", pct: 0, state: "pending" },
      { num: 5, name: "Client Handover", dates: "Jun 28", pct: 0, state: "pending" },
    ],
    team: [
      {
        initials: "AP",
        name: "Andrei Popescu",
        role: "Project Manager",
        status: "online",
        statusLabel: "On Site",
      },
      {
        initials: "MR",
        name: "Marius Rosu",
        role: "Site Supervisor",
        status: "online",
        statusLabel: "On Site",
      },
      {
        initials: "LT",
        name: "Liviu Toma",
        role: "Tile Specialist",
        status: "online",
        statusLabel: "On Site",
      },
      {
        initials: "DP",
        name: "Dan Pop",
        role: "Electrician",
        status: "away",
        statusLabel: "En Route",
      },
      {
        initials: "IC",
        name: "Ion Crisan",
        role: "Plumber",
        status: "offline",
        statusLabel: "Off Shift",
      },
    ],
    financials: { estimated: 18400, spent: 13080, invoiced: 9800 },
  },
  {
    id: "p2",
    name: "Full Kitchen · Timisoara",
    pm: "Elena M.",
    value: "€24,200",
    due: "Jul 15",
    pct: 45,
    status: "active",
    type: "renovation",
    location: "Timisoara",
    workers: 5,
    phases: [
      { num: 1, name: "Design & Planning", dates: "May 20 – May 26", pct: 100, state: "done" },
      { num: 2, name: "Demolition", dates: "May 27 – Jun 1", pct: 100, state: "done" },
      { num: 3, name: "Structure & Plumbing", dates: "Jun 2 – Jun 18", pct: 40, state: "active" },
      { num: 4, name: "Cabinetry & Finishes", dates: "Jun 19 – Jul 10", pct: 0, state: "pending" },
      { num: 5, name: "Handover", dates: "Jul 15", pct: 0, state: "pending" },
    ],
    team: [
      {
        initials: "EM",
        name: "Elena Marin",
        role: "Project Manager",
        status: "online",
        statusLabel: "On Site",
      },
      {
        initials: "RC",
        name: "Relu Ciobanu",
        role: "Site Supervisor",
        status: "online",
        statusLabel: "On Site",
      },
      {
        initials: "GS",
        name: "Gelu Stan",
        role: "Plumber",
        status: "away",
        statusLabel: "En Route",
      },
      {
        initials: "IA",
        name: "Ion Avram",
        role: "Carpenter",
        status: "offline",
        statusLabel: "Off Shift",
      },
    ],
    financials: { estimated: 24200, spent: 10890, invoiced: 7260 },
  },
  {
    id: "p3",
    name: "Modern Bathroom · Bucharest Floreasca",
    pm: "Radu D.",
    value: "€12,800",
    due: "Jun 20",
    pct: 90,
    status: "review",
    type: "renovation",
    location: "Bucharest",
    workers: 3,
    phases: [
      { num: 1, name: "Demolition", dates: "May 10 – May 13", pct: 100, state: "done" },
      { num: 2, name: "Waterproofing", dates: "May 14 – May 16", pct: 100, state: "done" },
      { num: 3, name: "Tiling & Fixtures", dates: "May 17 – Jun 8", pct: 100, state: "done" },
      { num: 4, name: "Finishing Touches", dates: "Jun 9 – Jun 14", pct: 80, state: "active" },
      { num: 5, name: "Client Sign-Off", dates: "Jun 20", pct: 0, state: "pending" },
    ],
    team: [
      {
        initials: "RD",
        name: "Radu Dima",
        role: "Project Manager",
        status: "online",
        statusLabel: "On Site",
      },
      {
        initials: "IN",
        name: "Iosif Nistor",
        role: "Tile Specialist",
        status: "online",
        statusLabel: "On Site",
      },
      {
        initials: "BM",
        name: "Bogdan Mol.",
        role: "Plumber",
        status: "offline",
        statusLabel: "Done",
      },
    ],
    financials: { estimated: 12800, spent: 11520, invoiced: 12800 },
  },
  {
    id: "p4",
    name: "Commercial Space · Brasov",
    pm: "Vlad N.",
    value: "€67,000",
    due: "Aug 30",
    pct: 28,
    status: "active",
    type: "renovation",
    location: "Brasov",
    workers: 10,
    phases: [
      { num: 1, name: "Permits & Planning", dates: "May 1 – May 20", pct: 100, state: "done" },
      { num: 2, name: "Structural Work", dates: "May 21 – Jun 30", pct: 40, state: "active" },
      { num: 3, name: "MEP Systems", dates: "Jul 1 – Jul 31", pct: 0, state: "pending" },
      { num: 4, name: "Interior Finishes", dates: "Aug 1 – Aug 24", pct: 0, state: "pending" },
      { num: 5, name: "Handover", dates: "Aug 30", pct: 0, state: "pending" },
    ],
    team: [
      {
        initials: "VN",
        name: "Vlad Nicu",
        role: "Project Manager",
        status: "online",
        statusLabel: "On Site",
      },
      {
        initials: "TM",
        name: "Titu Moga",
        role: "Site Supervisor",
        status: "online",
        statusLabel: "On Site",
      },
      {
        initials: "SF",
        name: "Sorin Florea",
        role: "Structural Eng.",
        status: "away",
        statusLabel: "En Route",
      },
    ],
    financials: { estimated: 67000, spent: 18760, invoiced: 10050 },
  },
  {
    id: "p5",
    name: "Flooring · Iasi Copou",
    pm: "Maria I.",
    value: "€9,600",
    due: "Jun 3",
    pct: 100,
    status: "done",
    type: "renovation",
    location: "Iasi",
    workers: 2,
    phases: [
      { num: 1, name: "Prep & Materials", dates: "May 26 – May 27", pct: 100, state: "done" },
      { num: 2, name: "Floor Installation", dates: "May 28 – Jun 2", pct: 100, state: "done" },
      { num: 3, name: "Handover", dates: "Jun 3", pct: 100, state: "done" },
    ],
    team: [
      {
        initials: "MI",
        name: "Maria Ionescu",
        role: "Project Manager",
        status: "online",
        statusLabel: "Office",
      },
      {
        initials: "DD",
        name: "Dorel Danila",
        role: "Floor Specialist",
        status: "offline",
        statusLabel: "Done",
      },
    ],
    financials: { estimated: 9600, spent: 8900, invoiced: 9600 },
  },
]

// ── Style helpers ─────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<ProjectStatus, { bg: string; color: string; label: string }> = {
  active: { bg: "rgba(10,132,255,0.15)", color: "rgba(10,132,255,0.9)", label: "Active" },
  review: { bg: "rgba(255,159,10,0.15)", color: "rgba(255,159,10,0.95)", label: "Review" },
  done: { bg: "rgba(48,209,88,0.15)", color: "rgba(48,209,88,0.95)", label: "Done" },
  hold: { bg: "var(--prv-border)", color: "var(--prv-text-3)", label: "On Hold" },
}

const PROGRESS_COLOR: Record<ProjectStatus, "blue" | "orange" | "green" | "white"> = {
  active: "blue",
  review: "orange",
  done: "green",
  hold: "white",
}

const PHASE_STYLE: Record<string, { bg: string; color: string }> = {
  done: { bg: "rgba(48,209,88,0.15)", color: "rgba(48,209,88,0.95)" },
  active: { bg: "rgba(10,132,255,0.15)", color: "rgba(10,132,255,0.9)" },
  pending: { bg: "var(--prv-border-subtle)", color: "var(--prv-text-3)" },
}

const PHASE_PROGRESS_COLOR: Record<string, "green" | "blue" | "white"> = {
  done: "green",
  active: "blue",
  pending: "white",
}

// ── Sub-components ────────────────────────────────────────────────────────────

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-[18px] relative overflow-hidden ${className}`}
      style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
    >
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mx-1 mt-5 mb-2.5">
      {children}
    </p>
  )
}

function budgetBarColor(pct: number): string {
  if (pct > 100) return "rgba(255,59,48,0.7)"
  if (pct > 80) return "rgba(255,159,10,0.7)"
  return "rgba(255,255,255,0.6)"
}

function ProjectCard({ project }: { project: Project }) {
  const s = STATUS_STYLE[project.status]
  const budgetPct = Math.round((project.financials.spent / project.financials.estimated) * 100)
  return (
    <Link
      href={`/projects/${project.id}`}
      className="block w-full text-left px-4 py-3.5"
      style={{ borderBottom: "1px solid var(--prv-border-subtle)", textDecoration: "none" }}
    >
      <div className="flex items-start gap-2.5 mb-2.5">
        <div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: s.color }} />
        <p className="text-[15px] font-bold text-white/90 flex-1 leading-snug">{project.name}</p>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px] shrink-0"
          style={{ background: s.bg, color: s.color }}
        >
          {s.label}
        </span>
      </div>

      <div className="flex gap-3 mb-2.5 ml-5">
        <span className="text-[12px] text-white/35">
          PM: <span className="text-white/65 font-semibold">{project.pm}</span>
        </span>
        <span className="text-[12px] text-white/35">
          Due: <span className="text-white/65 font-semibold">{project.due}</span>
        </span>
        <span className="text-[12px] text-white/35">{project.value}</span>
      </div>

      {/* Budget bar */}
      <div className="ml-5 mb-1.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-white/30">Budget used</span>
          <span
            className="text-[10px] font-semibold"
            style={{
              color:
                budgetPct > 100
                  ? "rgba(255,99,90,0.85)"
                  : budgetPct > 80
                    ? "rgba(255,179,64,0.85)"
                    : "rgba(255,255,255,0.4)",
            }}
          >
            €{project.financials.spent.toLocaleString()} / €
            {project.financials.estimated.toLocaleString()}
          </span>
        </div>
        <div
          className="h-[3px] rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.07)" }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(budgetPct, 100)}%`, background: budgetBarColor(budgetPct) }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between ml-5 mt-2">
        <div className="flex">
          {project.team.slice(0, 4).map((m, i) => (
            <div
              key={m.initials}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white/70"
              style={{
                background: "var(--prv-g3)",
                border: "1.5px solid #000",
                marginLeft: i === 0 ? 0 : -6,
                zIndex: 4 - i,
                position: "relative",
              }}
            >
              {m.initials}
            </div>
          ))}
          {project.team.length > 4 && (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white/40"
              style={{
                background: "var(--prv-g2)",
                border: "1.5px solid #000",
                marginLeft: -6,
                position: "relative",
              }}
            >
              +{project.team.length - 4}
            </div>
          )}
        </div>
        <span className="text-[11px] text-white/35">
          {project.status === "done" ? (
            <span style={{ color: "rgba(48,209,88,0.9)" }}>Completed ✓</span>
          ) : (
            `${project.pct}% complete`
          )}
        </span>
      </div>
    </Link>
  )
}

function ProjectDetail({ project, onBack }: { project: Project; onBack: () => void }) {
  const [tab, setTab] = useState("overview")
  const s = STATUS_STYLE[project.status]
  const remaining = project.financials.estimated - project.financials.spent

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 mb-4 text-white/45 text-[13px] font-medium"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Projects
      </button>

      {/* Hero */}
      <div
        className="p-4 rounded-[18px] mb-3.5 relative overflow-hidden"
        style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
      >
        <h2 className="text-[19px] font-bold text-white/90 leading-snug mb-2.5">{project.name}</h2>
        <div className="flex gap-2 flex-wrap mb-3.5">
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-[8px]"
            style={{ background: s.bg, color: s.color }}
          >
            {s.label}
          </span>
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-[8px]"
            style={{ background: "var(--prv-g2)", color: "var(--prv-text-3)" }}
          >
            Renovation
          </span>
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-[8px]"
            style={{ background: "var(--prv-g2)", color: "var(--prv-text-3)" }}
          >
            {project.location}
          </span>
        </div>
        <GlassProgressBar
          value={project.pct}
          size="md"
          color={PROGRESS_COLOR[project.status]}
          showValue
          animated
          className="mb-3.5"
        />
        <div className="grid grid-cols-4 gap-2">
          {[
            { v: project.value, l: "Value" },
            { v: `${project.pct}%`, l: "Progress" },
            { v: project.due, l: "Deadline" },
            { v: String(project.workers), l: "Workers" },
          ].map(({ v, l }) => (
            <div key={l} className="text-center">
              <p className="text-[16px] font-bold text-white/90">{v}</p>
              <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mt-0.5">
                {l}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Detail tabs */}
      <GlassTabs tabs={DETAIL_TABS} value={tab} onChange={setTab} className="mb-4" />

      {/* Overview */}
      {tab === "overview" && (
        <GlassCard>
          <div className="p-4">
            <p className="text-[13px] text-white/65 leading-relaxed mb-3">
              Project managed by <span className="text-white/90 font-semibold">{project.pm}</span> —{" "}
              {project.team.length} team members assigned. Currently at{" "}
              <span className="text-white/90 font-semibold">{project.pct}% completion</span> with
              deadline on <span className="text-white/90 font-semibold">{project.due}</span>.
            </p>
            <div className="flex gap-3">
              <div className="flex-1 p-3 rounded-[12px]" style={{ background: "var(--prv-g2)" }}>
                <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-1">
                  Phases Done
                </p>
                <p className="text-[18px] font-bold text-white/90">
                  {project.phases.filter((p) => p.state === "done").length}/{project.phases.length}
                </p>
              </div>
              <div className="flex-1 p-3 rounded-[12px]" style={{ background: "var(--prv-g2)" }}>
                <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-1">
                  Team Online
                </p>
                <p className="text-[18px] font-bold" style={{ color: "rgba(48,209,88,0.95)" }}>
                  {project.team.filter((m) => m.status === "online").length}/{project.team.length}
                </p>
              </div>
              <div className="flex-1 p-3 rounded-[12px]" style={{ background: "var(--prv-g2)" }}>
                <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-1">
                  Budget Used
                </p>
                <p className="text-[18px] font-bold text-white/90">
                  {Math.round((project.financials.spent / project.financials.estimated) * 100)}%
                </p>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Phases */}
      {tab === "phases" && (
        <GlassCard>
          {project.phases.map((phase) => {
            const ps = PHASE_STYLE[phase.state]!
            return (
              <div
                key={phase.num}
                className="flex items-center gap-3 px-4 py-3.5"
                style={{ borderBottom: "1px solid var(--prv-border-subtle)" }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
                  style={{ background: ps.bg, color: ps.color }}
                >
                  {phase.state === "done" ? "✓" : phase.num}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-white/90">{phase.name}</p>
                  <p className="text-[11px] text-white/35 mt-0.5">{phase.dates}</p>
                  {phase.state === "active" && (
                    <div className="mt-2">
                      <GlassProgressBar
                        value={phase.pct}
                        size="sm"
                        color={PHASE_PROGRESS_COLOR[phase.state]}
                        animated
                      />
                    </div>
                  )}
                </div>
                <p className="text-[14px] font-bold shrink-0" style={{ color: ps.color }}>
                  {phase.pct}%
                </p>
              </div>
            )
          })}
        </GlassCard>
      )}

      {/* Team */}
      {tab === "team" && (
        <GlassCard>
          {project.team.map((member) => (
            <div
              key={member.initials}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: "1px solid var(--prv-border-subtle)" }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white/70 shrink-0"
                style={{ background: "var(--prv-g2)" }}
              >
                {member.initials}
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-white/90">{member.name}</p>
                <p className="text-[12px] text-white/35 mt-0.5">{member.role}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <GlassStatusDot
                  status={member.status as "online" | "away" | "busy" | "offline"}
                  size="sm"
                />
                <span className="text-[11px] font-semibold text-white/45">
                  {member.statusLabel}
                </span>
              </div>
            </div>
          ))}
        </GlassCard>
      )}

      {/* Financials */}
      {tab === "financials" && (
        <GlassCard>
          {[
            {
              label: "Estimated",
              value: project.financials.estimated,
              color: "white" as const,
              pct: 100,
            },
            {
              label: "Actual Spent",
              value: project.financials.spent,
              color: "blue" as const,
              pct: Math.round((project.financials.spent / project.financials.estimated) * 100),
            },
            {
              label: "Invoiced",
              value: project.financials.invoiced,
              color: "green" as const,
              pct: Math.round((project.financials.invoiced / project.financials.estimated) * 100),
            },
            {
              label: "Remaining",
              value: remaining > 0 ? remaining : 0,
              color: "orange" as const,
              pct: Math.round((Math.max(remaining, 0) / project.financials.estimated) * 100),
            },
          ].map(({ label, value, color, pct }) => (
            <div
              key={label}
              className="flex items-center gap-3 px-4 py-3.5"
              style={{ borderBottom: "1px solid var(--prv-border-subtle)" }}
            >
              <p className="text-[13px] font-semibold text-white/90 w-28 shrink-0">{label}</p>
              <div className="flex-1">
                <GlassProgressBar value={pct} size="sm" color={color} animated />
              </div>
              <p className="text-[14px] font-bold text-white/90 w-20 text-right shrink-0">
                €{value.toLocaleString("en-US")}
              </p>
            </div>
          ))}
        </GlassCard>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProjectsWorkspace() {
  const [filter, setFilter] = useState("all")
  const [view, setView] = useState<"list" | "board">("list")

  const { data, isLoading } = useProjects()
  const projects = useMemo<Project[]>(
    () => (data?.projects ?? []).map(mapApiProject),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.projects]
  )

  const [localBoardCols, setLocalBoardCols] = useState<KanbanColumn[] | null>(null)
  const boardCols = useMemo(
    () => localBoardCols ?? buildBoardColumns(projects),
    [localBoardCols, projects]
  )

  const activeCount = projects.filter((p) => p.status === "active").length
  const reviewCount = projects.filter((p) => p.status === "review").length
  const doneCount = projects.filter((p) => p.status === "done").length
  const totalBudget = projects.reduce((s, p) => s + p.financials.estimated, 0)

  const filtered = projects.filter((p) => {
    if (filter === "all") return true
    if (filter === "renovation") return p.type === "renovation"
    if (filter === "internal") return p.type === "internal"
    if (filter === "done") return p.status === "done"
    return true
  })

  function handleBoardMove(cardId: string, fromCol: string, toCol: string) {
    setLocalBoardCols((prev) => {
      const base: KanbanColumn[] = prev ?? buildBoardColumns(projects)
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
          <p className="text-white/35 text-[13px] font-medium mb-0.5">Operations</p>
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
      <div className="grid grid-cols-4 gap-2.5 mb-4">
        {[
          { v: isLoading ? "…" : String(activeCount), l: "Active", color: "rgba(10,132,255,0.9)" },
          { v: isLoading ? "…" : String(reviewCount), l: "Review", color: "rgba(255,159,10,0.95)" },
          { v: isLoading ? "…" : String(doneCount), l: "Done", color: "rgba(48,209,88,0.95)" },
          { v: isLoading ? "…" : fmtEuro(totalBudget), l: "Pipeline", color: "var(--prv-text-1)" },
        ].map(({ v, l, color }) => (
          <div
            key={l}
            className="py-3 rounded-[14px] text-center"
            style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
          >
            <p className="text-[20px] font-bold" style={{ color }}>
              {v}
            </p>
            <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mt-1">
              {l}
            </p>
          </div>
        ))}
      </div>

      {/* Filter — list view only */}
      {view === "list" && (
        <GlassSegmentedControl
          items={FILTER_ITEMS}
          activeId={filter}
          onChange={setFilter}
          fullWidth
          className="mb-4"
        />
      )}

      {/* Project list */}
      {view === "list" && (
        <div
          className="rounded-[18px] overflow-hidden relative"
          style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
        >
          {isLoading ? (
            <div className="py-12 text-center text-white/30 text-[14px]">Loading projects…</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-white/35 text-[14px]">No projects found.</div>
          ) : (
            filtered.map((p) => <ProjectCard key={p.id} project={p} />)
          )}
        </div>
      )}

      {/* Board view */}
      {view === "board" && (
        <GlassKanban
          columns={boardCols}
          onCardMove={handleBoardMove}
          renderCard={(card) => {
            const p = card.data as Project
            const s = STATUS_STYLE[p.status]
            const budgetPct = Math.round((p.financials.spent / p.financials.estimated) * 100)
            const budgetColor =
              budgetPct > 100
                ? "rgba(255,59,48,0.8)"
                : budgetPct > 80
                  ? "rgba(255,159,10,0.8)"
                  : "rgba(255,255,255,0.45)"
            return (
              <Link href={`/projects/${p.id}`} style={{ textDecoration: "none", display: "block" }}>
                <p className="text-[13px] font-semibold text-white/90 mb-1.5 leading-snug">
                  {p.name}
                </p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-white/45">{p.pm}</span>
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[5px]"
                    style={{ background: s.bg, color: s.color }}
                  >
                    {p.pct}%
                  </span>
                </div>
                <div
                  className="h-1 rounded-full overflow-hidden mb-2"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${p.pct}%`,
                      background: s.color,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px]" style={{ color: budgetColor }}>
                    {budgetPct}% budget
                  </span>
                  <span className="text-[11px] text-white/30">{p.due}</span>
                </div>
              </Link>
            )
          }}
        />
      )}
    </div>
  )
}
