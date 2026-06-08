import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

// ── Stores list ───────────────────────────────────────────────────────────────

export interface StoreListItem {
  id: string
  name: string
  code: string
  city: string | null
  region: string | null
  isActive: boolean
  revenueToday: number
  transactionsToday: number
  staffCount: number
  inventoryAlerts: number
}

export interface StoresListData {
  stores: StoreListItem[]
}

export function useStores() {
  return useQuery<StoresListData>({
    queryKey: ["stores"],
    queryFn: () => api.get<StoresListData>("/api/mobile/stores"),
    staleTime: 30_000,
    retry: 2,
  })
}

// ── Store detail ──────────────────────────────────────────────────────────────

export interface StoreDetail {
  store: {
    id: string
    name: string
    code: string
    address: string | null
    city: string | null
    phone: string | null
    isActive: boolean
  }
  kpis: {
    revenueToday: string
    transactionsToday: number
    openTasks: number
    inventoryAlerts: number
  }
  weeklyRevenue: { day: string; amount: number; isToday: boolean }[]
  staff: {
    id: string
    name: string
    role: string
    jobTitle: string | null
    avatarUrl: string | null
  }[]
  inventoryAlerts: {
    id: string
    name: string
    unit: string
    stock: number
    minimum: number
    severity: "critical" | "low"
  }[]
  tasks: {
    id: string
    title: string
    dueDate: string | null
    isOverdue: boolean
    projectName: string
  }[]
}

export function useStoreDetail(storeId: string) {
  return useQuery<StoreDetail>({
    queryKey: ["store-detail", storeId],
    queryFn: () => api.get<StoreDetail>(`/api/mobile/stores/${storeId}`),
    staleTime: 30_000,
    retry: 2,
    enabled: !!storeId,
  })
}

export function formatRevenue(amount: number): string {
  if (amount >= 1_000_000) return `€${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `€${(amount / 1_000).toFixed(1)}k`
  return `€${Math.round(amount)}`
}

export function getInitials(name: string): string {
  const parts = name.trim().split(" ")
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase()
}

export function formatDueDate(
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
