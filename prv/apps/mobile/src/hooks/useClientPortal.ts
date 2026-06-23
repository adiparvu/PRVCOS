import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

export interface ClientOverview {
  client: {
    firstName: string
    lastName: string
    email: string
    avatarUrl: string | null
    memberSince: string
  }
  kpis: {
    activeProjects: number
    pendingInvoices: number
    pendingAmount: string
    totalSpent: string
  }
  activeProjects: {
    id: string
    name: string
    status: string
    progress: number
    nextMilestone: string | null
    dueDate: string | null
  }[]
  recentActivity: {
    id: string
    type: "photo_uploaded" | "milestone_completed" | "invoice_sent" | "document_added" | "message"
    title: string
    subtitle: string
    timeAgo: string
  }[]
}

export interface ClientProject {
  id: string
  name: string
  status: "planning" | "in_progress" | "on_hold" | "completed"
  statusLabel: string
  progress: number
  startDate: string | null
  endDate: string | null
  budget: string | null
  spent: string | null
  nextMilestone: string | null
  photosCount: number
  address: string | null
}

export interface ClientInvoice {
  id: string
  invoiceNumber: string
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
  statusLabel: string
  total: string
  issueDate: string
  dueDate: string | null
  paidDate: string | null
  projectName: string | null
}

export interface ClientDocument {
  id: string
  name: string
  type: "contract" | "photo" | "report" | "invoice" | "other"
  typeLabel: string
  url: string
  sizeKb: number
  createdAt: string
  projectName: string | null
}

export function useClientOverview() {
  return useQuery<ClientOverview>({
    queryKey: ["client-portal-overview"],
    queryFn: () => api.get<ClientOverview>("/api/mobile/client-portal/overview"),
    staleTime: 60_000,
    retry: 2,
  })
}

export function useClientProjects(status?: string) {
  const params = status && status !== "all" ? `?status=${status}` : ""
  return useQuery<{ projects: ClientProject[] }>({
    queryKey: ["client-portal-projects", status ?? "all"],
    queryFn: () =>
      api.get<{ projects: ClientProject[] }>(`/api/mobile/client-portal/projects${params}`),
    staleTime: 60_000,
    retry: 2,
  })
}

export function useClientInvoices(status?: string) {
  const params = status && status !== "all" ? `?status=${status}` : ""
  return useQuery<{ invoices: ClientInvoice[]; summary: { total: string; pending: string } }>({
    queryKey: ["client-portal-invoices", status ?? "all"],
    queryFn: () =>
      api.get<{ invoices: ClientInvoice[]; summary: { total: string; pending: string } }>(
        `/api/mobile/client-portal/invoices${params}`
      ),
    staleTime: 60_000,
    retry: 2,
  })
}

export function useClientDocuments(type?: string) {
  const params = type && type !== "all" ? `?type=${type}` : ""
  return useQuery<{ documents: ClientDocument[] }>({
    queryKey: ["client-portal-documents", type ?? "all"],
    queryFn: () =>
      api.get<{ documents: ClientDocument[] }>(`/api/mobile/client-portal/documents${params}`),
    staleTime: 60_000,
    retry: 2,
  })
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
}

export function formatFileSize(kb: number): string {
  if (kb < 1024) return `${kb} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}
