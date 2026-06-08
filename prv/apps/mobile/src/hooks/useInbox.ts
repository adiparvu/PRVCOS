import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export type InboxFilter =
  | "all"
  | "unread"
  | "alerts"
  | "approvals"
  | "messages"
  | "tasks"
  | "system"

export interface InboxItem {
  id: string
  type: "info" | "warning" | "error" | "success" | "action_required"
  title: string
  body: string
  entityType: string
  entityId: string | null
  isRead: boolean
  metadata: Record<string, unknown>
  createdAt: string
}

export interface InboxData {
  items: InboxItem[]
  hasMore: boolean
  nextCursor: string | null
  unreadCount: number
}

export function useInbox(filter: InboxFilter = "all") {
  return useQuery<InboxData>({
    queryKey: ["inbox", filter],
    queryFn: () => api.get<InboxData>(`/api/mobile/inbox?filter=${filter}`),
    staleTime: 15_000,
    retry: 2,
  })
}

export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch("/api/mobile/inbox", { action: "markRead", id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inbox"] }),
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.patch("/api/mobile/inbox", { action: "markAllRead" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inbox"] }),
  })
}

export function useDismissItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch("/api/mobile/inbox", { action: "dismiss", id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inbox"] }),
  })
}

export function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return "Just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d === 1) return "Yesterday"
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

export function getItemIcon(item: InboxItem): string | null {
  if (item.type === "error") return "●"
  if (item.type === "warning") return "⚠"
  if (item.type === "action_required") return "↗"
  if (item.entityType === "task") return "⬡"
  if (item.entityType === "system") return "⚙"
  return null // messages use initials from metadata
}

export function getRowTint(item: InboxItem): string | null {
  if (item.type === "error") return "rgba(255,50,50,0.07)"
  if (item.type === "warning") return "rgba(255,180,50,0.05)"
  return null
}

export interface BadgeInfo {
  label: string
  variant: "alert" | "approval" | "task" | "system"
}

export function getBadge(item: InboxItem): BadgeInfo | null {
  if (item.type === "error") return { label: "CRITICAL", variant: "alert" }
  if (item.type === "warning") return { label: "ATTENTION", variant: "approval" }
  if (item.type === "action_required") {
    const sub = item.metadata?.subtype as string | undefined
    if (sub === "signature") return { label: "SIGN REQUIRED", variant: "approval" }
    return { label: "APPROVAL NEEDED", variant: "approval" }
  }
  if (item.entityType === "task") {
    const due = item.metadata?.dueLabel as string | undefined
    return { label: due ?? "TASK", variant: "task" }
  }
  if (item.entityType === "system") return { label: "SYSTEM", variant: "system" }
  return null
}

export function getSectionKey(
  item: InboxItem
): "critical" | "approvals" | "messages" | "tasks" | "system" | "other" {
  if (item.type === "error" || item.type === "warning") return "critical"
  if (item.type === "action_required") return "approvals"
  if (item.entityType === "message") return "messages"
  if (item.entityType === "task") return "tasks"
  if (item.entityType === "system") return "system"
  return "other"
}

export function groupBySections(
  items: InboxItem[]
): { key: string; label: string; data: InboxItem[] }[] {
  const order = ["critical", "approvals", "messages", "tasks", "system", "other"] as const
  const labels: Record<string, string> = {
    critical: "Critical",
    approvals: "Approvals",
    messages: "Messages",
    tasks: "Tasks",
    system: "System",
    other: "Other",
  }
  const map: Record<string, InboxItem[]> = {}
  for (const item of items) {
    const k = getSectionKey(item)
    ;(map[k] ??= []).push(item)
  }
  return order
    .filter((k) => (map[k]?.length ?? 0) > 0)
    .map((k) => ({
      key: k,
      label:
        k === "approvals" && (map[k]?.length ?? 0) > 0
          ? `Approvals · ${map[k]!.length}`
          : labels[k]!,
      data: map[k]!,
    }))
}
