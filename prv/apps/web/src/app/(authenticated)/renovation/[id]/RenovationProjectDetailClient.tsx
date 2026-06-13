"use client"

import { useState } from "react"
import Link from "next/link"
import {
  useRenovationProject,
  useRenovationPhases,
  useRenovationTasks,
  useRenovationEstimates,
  useRenovationContracts,
  useRenovationSiteReports,
} from "@/lib/api-hooks"
import { fmtShortDate } from "@/lib/formatters"
import { GlassProgressBar, GlassTabs, type TabItem } from "@prv/ui"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Phase {
  id: string
  phaseNumber: number
  title: string
  status: string
  completionPercentage: number
  plannedStartDate: string | null
  plannedEndDate: string | null
  estimatedCost: number | null
}

interface Task {
  id: string
  title: string
  status: string
  priority: string
  taskType: string
  dueDate: string | null
  phaseId: string | null
  assigneeName: string | null
}

interface EstimateLine {
  id: string
  lineNumber: number
  category: string
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
  unit: string | null
}

interface Estimate {
  id: string
  estimateNumber: string
  version: number
  status: string
  total: number
  currency: string
  validUntil: string | null
  subtotal: number
  vatRate: number
  vatAmount: number
  preparedByName: string | null
  lines?: EstimateLine[]
}

interface Contract {
  id: string
  contractNumber: string
  status: string
  contractValue: number
  currency: string
  startDate: string | null
  endDate: string | null
}

interface SiteReport {
  id: string
  reportDate: string
  reportType: string
  workersOnSite: number
  completionDelta: number
  workPerformed: string | null
  submittedByName: string | null
}

interface Project {
  id: string
  projectCode: string | null
  title: string
  description: string | null
  status: string
  priority: string
  projectType: string
  address: string | null
  city: string | null
  estimatedStartDate: string | null
  estimatedEndDate: string | null
  actualStartDate: string | null
  actualEndDate: string | null
  estimatedValue: number | null
  contractedValue: number | null
  currency: string
  completionPercentage: number
  client: { id: string; name: string | null; email: string | null; phone: string | null } | null
  projectManager: { id: string; name: string | null } | null
  phases: Phase[]
  recentTasks: Task[]
  estimates: Estimate[]
  contracts: Contract[]
}

// ── Style maps ────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  inquiry: "rgba(255,159,10,0.9)",
  estimation: "rgba(255,159,10,0.9)",
  contracted: "rgba(10,132,255,0.9)",
  in_progress: "rgba(10,132,255,0.9)",
  paused: "var(--prv-text-2)",
  completed: "rgba(48,209,88,0.95)",
  cancelled: "var(--prv-text-3)",
}
const STATUS_BG: Record<string, string> = {
  inquiry: "rgba(255,159,10,0.12)",
  estimation: "rgba(255,159,10,0.12)",
  contracted: "rgba(10,132,255,0.12)",
  in_progress: "rgba(10,132,255,0.12)",
  paused: "rgba(255,255,255,0.08)",
  completed: "rgba(48,209,88,0.12)",
  cancelled: "rgba(255,255,255,0.05)",
}
const STATUS_LABEL: Record<string, string> = {
  inquiry: "Inquiry",
  estimation: "Estimation",
  contracted: "Contracted",
  in_progress: "In Progress",
  paused: "Paused",
  completed: "Completed",
  cancelled: "Cancelled",
}
const TASK_STATUS_COLOR: Record<string, string> = {
  todo: "var(--prv-text-3)",
  in_progress: "rgba(10,132,255,0.9)",
  blocked: "rgba(255,59,48,0.9)",
  review: "rgba(255,159,10,0.9)",
  done: "rgba(48,209,88,0.95)",
}
const PHASE_STATUS_ICON: Record<string, string> = {
  pending: "○",
  in_progress: "◐",
  paused: "⏸",
  completed: "✓",
  cancelled: "✕",
}
const ESTIMATE_STATUS_COLOR: Record<string, string> = {
  draft: "var(--prv-text-2)",
  sent_to_client: "rgba(10,132,255,0.9)",
  accepted: "rgba(48,209,88,0.95)",
  rejected: "rgba(255,59,48,0.9)",
  superseded: "var(--prv-text-3)",
}
const CONTRACT_STATUS_COLOR: Record<string, string> = {
  draft: "var(--prv-text-2)",
  sent: "rgba(255,159,10,0.9)",
  signed: "rgba(10,132,255,0.9)",
  active: "rgba(48,209,88,0.95)",
  completed: "rgba(48,209,88,0.95)",
  terminated: "rgba(255,59,48,0.9)",
}

const DETAIL_TABS: TabItem[] = [
  { value: "overview", label: "Overview" },
  { value: "phases", label: "Phases" },
  { value: "tasks", label: "Tasks" },
  { value: "estimates", label: "Estimates" },
  { value: "contracts", label: "Contracts" },
  { value: "reports", label: "Reports" },
]

function fmtCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value)
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
      className={`rounded-[18px] overflow-hidden ${className}`}
      style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
    >
      {children}
    </div>
  )
}

function Row({ children, last = false }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div
      className="px-4 py-3.5 flex items-center gap-3"
      style={last ? {} : { borderBottom: "1px solid var(--prv-border-subtle)" }}
    >
      {children}
    </div>
  )
}

function InfoGrid({ items }: { items: { label: string; value: string | null }[] }) {
  return (
    <div className="grid grid-cols-2 gap-px" style={{ background: "var(--prv-border-subtle)" }}>
      {items.map(({ label, value }) => (
        <div key={label} className="px-4 py-3" style={{ background: "var(--prv-g1)" }}>
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-1">
            {label}
          </p>
          <p className="text-[14px] font-semibold text-white/80">{value ?? "—"}</p>
        </div>
      ))}
    </div>
  )
}

// ── Tab panels ────────────────────────────────────────────────────────────────

function OverviewPanel({ project }: { project: Project }) {
  return (
    <div className="space-y-3">
      {project.description && (
        <GlassCard>
          <div className="px-4 py-3.5">
            <p className="text-[13px] text-white/60 leading-relaxed">{project.description}</p>
          </div>
        </GlassCard>
      )}

      <GlassCard>
        <InfoGrid
          items={[
            { label: "Client", value: project.client?.name ?? null },
            { label: "PM", value: project.projectManager?.name ?? null },
            { label: "Type", value: project.projectType },
            { label: "City", value: project.city },
            { label: "Start", value: fmtShortDate(project.estimatedStartDate) },
            { label: "End", value: fmtShortDate(project.estimatedEndDate) },
            {
              label: "Est. Value",
              value: project.estimatedValue
                ? fmtCurrency(project.estimatedValue, project.currency)
                : null,
            },
            {
              label: "Contracted",
              value: project.contractedValue
                ? fmtCurrency(project.contractedValue, project.currency)
                : null,
            },
          ]}
        />
      </GlassCard>

      {project.address && (
        <GlassCard>
          <Row last>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--prv-text-2)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <p className="text-[13px] text-white/60">{project.address}</p>
          </Row>
        </GlassCard>
      )}
    </div>
  )
}

function PhasesPanel({ project }: { project: Project }) {
  return (
    <GlassCard>
      {project.phases.length === 0 ? (
        <div className="py-10 text-center text-white/30 text-[14px]">No phases defined</div>
      ) : (
        project.phases.map((phase, i) => {
          const isActive = phase.status === "in_progress"
          const isDone = phase.status === "completed"
          const stateColor = isDone
            ? "rgba(48,209,88,0.95)"
            : isActive
              ? "rgba(10,132,255,0.9)"
              : "var(--prv-text-3)"
          return (
            <Row key={phase.id} last={i === project.phases.length - 1}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
                style={{
                  background: isDone
                    ? "rgba(48,209,88,0.12)"
                    : isActive
                      ? "rgba(10,132,255,0.12)"
                      : "var(--prv-g2)",
                  color: stateColor,
                }}
              >
                {PHASE_STATUS_ICON[phase.status] ?? phase.phaseNumber}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="text-[14px] font-semibold text-white/90">{phase.title}</p>
                  {phase.estimatedCost && (
                    <p className="text-[11px] text-white/35">
                      {fmtCurrency(phase.estimatedCost, project.currency)}
                    </p>
                  )}
                </div>
                {(phase.plannedStartDate || phase.plannedEndDate) && (
                  <p className="text-[11px] text-white/30 mt-0.5">
                    {fmtShortDate(phase.plannedStartDate)} – {fmtShortDate(phase.plannedEndDate)}
                  </p>
                )}
                {isActive && (
                  <div className="mt-2">
                    <GlassProgressBar
                      value={phase.completionPercentage}
                      size="sm"
                      color="blue"
                      animated
                    />
                  </div>
                )}
              </div>
              <span className="text-[13px] font-bold shrink-0" style={{ color: stateColor }}>
                {phase.completionPercentage}%
              </span>
            </Row>
          )
        })
      )}
    </GlassCard>
  )
}

function TasksPanel({ projectId }: { projectId: string }) {
  const { data, isLoading } = useRenovationTasks(projectId)
  const tasks = (data?.tasks ?? []) as Task[]

  return (
    <GlassCard>
      {isLoading ? (
        <div className="py-10 text-center text-white/30 text-[14px]">Loading tasks…</div>
      ) : tasks.length === 0 ? (
        <div className="py-10 text-center text-white/30 text-[14px]">No tasks</div>
      ) : (
        tasks.map((task, i) => (
          <Row key={task.id} last={i === tasks.length - 1}>
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: TASK_STATUS_COLOR[task.status] ?? "var(--prv-text-3)" }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-white/85 truncate">{task.title}</p>
              <div className="flex gap-2 mt-0.5">
                <span className="text-[11px] text-white/30">{task.taskType}</span>
                {task.assigneeName && (
                  <span className="text-[11px] text-white/35">{task.assigneeName}</span>
                )}
                {task.dueDate && (
                  <span className="text-[11px] text-white/30">
                    Due {fmtShortDate(task.dueDate)}
                  </span>
                )}
              </div>
            </div>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-[5px] shrink-0"
              style={{
                background: `${TASK_STATUS_COLOR[task.status] ?? "rgba(255,255,255,0.08)"}20`,
                color: TASK_STATUS_COLOR[task.status] ?? "var(--prv-text-3)",
              }}
            >
              {task.status.replace("_", " ")}
            </span>
          </Row>
        ))
      )}
    </GlassCard>
  )
}

function EstimatesPanel({ projectId, currency }: { projectId: string; currency: string }) {
  const { data, isLoading } = useRenovationEstimates(projectId)
  const estimates = (data?.estimates ?? []) as Estimate[]
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="space-y-2.5">
      {isLoading ? (
        <GlassCard>
          <div className="py-10 text-center text-white/30 text-[14px]">Loading estimates…</div>
        </GlassCard>
      ) : estimates.length === 0 ? (
        <GlassCard>
          <div className="py-10 text-center text-white/30 text-[14px]">No estimates</div>
        </GlassCard>
      ) : (
        estimates.map((est) => (
          <GlassCard key={est.id}>
            <button
              className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
              onClick={() => setExpanded(expanded === est.id ? null : est.id)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-bold text-white/90">{est.estimateNumber}</p>
                  <span className="text-[10px] text-white/30">v{est.version}</span>
                  {est.validUntil && (
                    <span className="text-[10px] text-white/25">
                      Valid {fmtShortDate(est.validUntil)}
                    </span>
                  )}
                </div>
                {est.preparedByName && (
                  <p className="text-[11px] text-white/35 mt-0.5">by {est.preparedByName}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-[15px] font-bold text-white/90">
                  {fmtCurrency(est.total, est.currency)}
                </p>
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: ESTIMATE_STATUS_COLOR[est.status] ?? "var(--prv-text-2)" }}
                >
                  {est.status.replace(/_/g, " ")}
                </span>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--prv-text-3)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transform: expanded === est.id ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {expanded === est.id && (
              <div style={{ borderTop: "1px solid var(--prv-border-subtle)" }}>
                {/* VAT summary */}
                <div className="px-4 py-3 grid grid-cols-3 gap-2">
                  {[
                    { l: "Subtotal", v: fmtCurrency(est.subtotal, est.currency) },
                    { l: `VAT ${est.vatRate}%`, v: fmtCurrency(est.vatAmount, est.currency) },
                    { l: "Total", v: fmtCurrency(est.total, est.currency) },
                  ].map(({ l, v }) => (
                    <div key={l}>
                      <p className="text-[10px] text-white/30 font-semibold uppercase tracking-widest">
                        {l}
                      </p>
                      <p className="text-[13px] font-bold text-white/80 mt-0.5">{v}</p>
                    </div>
                  ))}
                </div>
                {/* Line items */}
                {(est.lines ?? []).length > 0 && (
                  <div style={{ borderTop: "1px solid var(--prv-border-subtle)" }}>
                    {(est.lines ?? []).map((line, i) => (
                      <div
                        key={line.id}
                        className="px-4 py-2.5 flex items-center gap-2"
                        style={
                          i < (est.lines ?? []).length - 1
                            ? { borderBottom: "1px solid var(--prv-border-subtle)" }
                            : {}
                        }
                      >
                        <span className="text-[10px] font-semibold text-white/25 w-5 shrink-0">
                          {line.lineNumber}
                        </span>
                        <p className="text-[12px] text-white/70 flex-1">{line.description}</p>
                        <span className="text-[11px] text-white/30 shrink-0">
                          {line.quantity}
                          {line.unit ? ` ${line.unit}` : ""} ×{" "}
                          {fmtCurrency(line.unitPrice, currency)}
                        </span>
                        <span className="text-[12px] font-semibold text-white/70 w-24 text-right shrink-0">
                          {fmtCurrency(line.totalPrice, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </GlassCard>
        ))
      )}
    </div>
  )
}

function ContractsPanel({ projectId }: { projectId: string }) {
  const { data, isLoading } = useRenovationContracts(projectId)
  const contracts = (data?.contracts ?? []) as Contract[]

  return (
    <GlassCard>
      {isLoading ? (
        <div className="py-10 text-center text-white/30 text-[14px]">Loading contracts…</div>
      ) : contracts.length === 0 ? (
        <div className="py-10 text-center text-white/30 text-[14px]">No contracts</div>
      ) : (
        contracts.map((c, i) => (
          <Row key={c.id} last={i === contracts.length - 1}>
            <div className="flex-1">
              <p className="text-[14px] font-bold text-white/90">{c.contractNumber}</p>
              {(c.startDate || c.endDate) && (
                <p className="text-[11px] text-white/30 mt-0.5">
                  {fmtShortDate(c.startDate)} – {fmtShortDate(c.endDate)}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[14px] font-bold text-white/90">
                {fmtCurrency(c.contractValue, c.currency)}
              </p>
              <span
                className="text-[10px] font-semibold"
                style={{ color: CONTRACT_STATUS_COLOR[c.status] ?? "var(--prv-text-2)" }}
              >
                {c.status}
              </span>
            </div>
          </Row>
        ))
      )}
    </GlassCard>
  )
}

function ReportsPanel({ projectId }: { projectId: string }) {
  const { data, isLoading } = useRenovationSiteReports(projectId)
  const reports = (data?.reports ?? []) as SiteReport[]

  return (
    <GlassCard>
      {isLoading ? (
        <div className="py-10 text-center text-white/30 text-[14px]">Loading reports…</div>
      ) : reports.length === 0 ? (
        <div className="py-10 text-center text-white/30 text-[14px]">No site reports</div>
      ) : (
        reports.map((r, i) => (
          <Row key={r.id} last={i === reports.length - 1}>
            <div
              className="w-9 h-9 rounded-[10px] flex flex-col items-center justify-center shrink-0"
              style={{ background: "var(--prv-g2)" }}
            >
              <p className="text-[13px] font-bold text-white/80 leading-none">
                {new Date(r.reportDate).getDate()}
              </p>
              <p className="text-[9px] font-semibold text-white/30 uppercase">
                {new Date(r.reportDate).toLocaleString("en", { month: "short" })}
              </p>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-semibold text-white/85 capitalize">
                  {r.reportType} report
                </p>
                {r.completionDelta !== 0 && (
                  <span
                    className="text-[10px] font-bold"
                    style={{
                      color: r.completionDelta > 0 ? "rgba(48,209,88,0.9)" : "rgba(255,59,48,0.9)",
                    }}
                  >
                    {r.completionDelta > 0 ? "+" : ""}
                    {r.completionDelta}%
                  </span>
                )}
              </div>
              {r.workPerformed && (
                <p className="text-[11px] text-white/35 mt-0.5 truncate">{r.workPerformed}</p>
              )}
              <div className="flex gap-2 mt-0.5">
                {r.submittedByName && (
                  <span className="text-[10px] text-white/25">{r.submittedByName}</span>
                )}
                <span className="text-[10px] text-white/25">{r.workersOnSite} workers</span>
              </div>
            </div>
          </Row>
        ))
      )}
    </GlassCard>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function RenovationProjectDetailClient({ id }: { id: string }) {
  const [tab, setTab] = useState("overview")
  const { data, isLoading } = useRenovationProject(id)
  const project = (data as { project?: Project } | undefined)?.project

  if (isLoading) {
    return (
      <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
        <div className="py-24 text-center text-white/30 text-[14px]">Loading project…</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
        <div className="py-24 text-center">
          <p className="text-white/35 text-[15px] font-semibold mb-2">Project not found</p>
          <Link href="/renovation" className="text-[13px] text-white/45 underline">
            Back to projects
          </Link>
        </div>
      </div>
    )
  }

  const statusColor = STATUS_COLOR[project.status] ?? "var(--prv-text-2)"
  const statusBg = STATUS_BG[project.status] ?? "var(--prv-g2)"
  const statusLabel = STATUS_LABEL[project.status] ?? project.status
  const value = project.contractedValue ?? project.estimatedValue

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Back */}
      <Link
        href="/renovation"
        className="flex items-center gap-2 mb-4 text-white/45 text-[13px] font-medium"
        style={{ textDecoration: "none" }}
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
        Renovation Projects
      </Link>

      {/* Hero */}
      <div
        className="p-4 rounded-[20px] mb-3.5"
        style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
      >
        <div className="flex items-start gap-2 mb-3">
          <div className="flex-1">
            <h1 className="text-[20px] font-bold text-white/90 leading-snug">{project.title}</h1>
            {project.projectCode && (
              <p className="text-[12px] text-white/30 mt-0.5">{project.projectCode}</p>
            )}
          </div>
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-[8px] shrink-0"
            style={{ background: statusBg, color: statusColor }}
          >
            {statusLabel}
          </span>
        </div>

        <div className="flex gap-2 flex-wrap mb-3">
          {project.projectType && (
            <span
              className="text-[11px] px-2 py-0.5 rounded-[6px]"
              style={{ background: "var(--prv-g2)", color: "var(--prv-text-2)" }}
            >
              {project.projectType}
            </span>
          )}
          {project.city && (
            <span
              className="text-[11px] px-2 py-0.5 rounded-[6px]"
              style={{ background: "var(--prv-g2)", color: "var(--prv-text-2)" }}
            >
              {project.city}
            </span>
          )}
          {project.priority && (
            <span
              className="text-[11px] px-2 py-0.5 rounded-[6px]"
              style={{ background: "var(--prv-g2)", color: "var(--prv-text-2)" }}
            >
              {project.priority} priority
            </span>
          )}
        </div>

        <div className="mb-3.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-white/30">Overall Progress</span>
            <span className="text-[11px] font-bold text-white/60">
              {project.completionPercentage}%
            </span>
          </div>
          <GlassProgressBar
            value={project.completionPercentage}
            size="md"
            color={
              project.status === "completed"
                ? "green"
                : ["contracted", "in_progress"].includes(project.status)
                  ? "blue"
                  : "white"
            }
            showValue
            animated
          />
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-2">
          {[
            {
              v: value ? fmtCurrency(value, project.currency) : "—",
              l: "Value",
            },
            {
              v:
                project.phases.length > 0
                  ? `${project.phases.filter((p) => p.status === "completed").length}/${project.phases.length}`
                  : "—",
              l: "Phases",
            },
            { v: fmtShortDate(project.estimatedEndDate), l: "Deadline" },
            {
              v: project.contracts.length > 0 ? project.contracts[0]!.status : "—",
              l: "Contract",
            },
          ].map(({ v, l }) => (
            <div key={l} className="text-center">
              <p className="text-[14px] font-bold text-white/85">{v}</p>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mt-0.5">
                {l}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <GlassTabs tabs={DETAIL_TABS} value={tab} onChange={setTab} className="mb-4" />

      {/* Tab panels */}
      {tab === "overview" && <OverviewPanel project={project} />}
      {tab === "phases" && <PhasesPanel project={project} />}
      {tab === "tasks" && <TasksPanel projectId={id} />}
      {tab === "estimates" && <EstimatesPanel projectId={id} currency={project.currency} />}
      {tab === "contracts" && <ContractsPanel projectId={id} />}
      {tab === "reports" && <ReportsPanel projectId={id} />}
    </div>
  )
}
