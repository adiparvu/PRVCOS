import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

export interface ProjectDetail {
  project: {
    id: string
    name: string
    code: string | null
    status: string
    description: string | null
    clientName: string | null
    budget: string | null
    budgetRaw: number
    currency: string
    startDate: string | null
    dueDate: string | null
    completedAt: string | null
    isActive: boolean
  }
  kpis: {
    progress: number
    totalMilestones: number
    completedMilestones: number
    openMilestones: number
    overdueMilestones: number
    totalInvoiced: string
    totalPaid: string
    remaining: string | null
    teamCount: number
  }
  milestones: {
    id: string
    title: string
    dueDate: string | null
    isComplete: boolean
    isOverdue: boolean
    sortOrder: number
  }[]
  team: {
    id: string
    name: string
    role: string
    jobTitle: string | null
    avatarUrl: string | null
  }[]
  activity: {
    id: string
    title: string
    body: string | null
    type: string
    createdAt: string
  }[]
  invoices: {
    id: string
    invoiceNumber: string
    status: string
    total: string
    issueDate: string
    dueDate: string
    paidAt: string | null
  }[]
}

export function useProjectDetail(projectId: string) {
  return useQuery<ProjectDetail>({
    queryKey: ["project-detail", projectId],
    queryFn: () => api.get<ProjectDetail>(`/api/mobile/projects/${projectId}`),
    staleTime: 30_000,
    retry: 2,
    enabled: !!projectId,
  })
}

export function getProjectInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return (words[0]?.slice(0, 2) ?? "").toUpperCase()
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase()
}

export function formatMilestoneDue(
  dueDate: string | null,
  isOverdue: boolean
): { label: string; color: string } {
  if (!dueDate) return { label: "—", color: "rgba(255,255,255,0.35)" }
  const d = new Date(dueDate)
  const diffDays = Math.floor((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (isOverdue) return { label: `${Math.abs(diffDays)}d overdue`, color: "#ff453a" }
  if (diffDays === 0) return { label: "Today", color: "#ff9f0a" }
  if (diffDays === 1) return { label: "Tomorrow", color: "#ff9f0a" }
  if (diffDays < 7) return { label: `${diffDays}d`, color: "rgba(255,255,255,0.65)" }
  return {
    label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    color: "rgba(255,255,255,0.65)",
  }
}

export function formatActivityTime(iso: string): string {
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}
