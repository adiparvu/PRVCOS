import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

export interface ClientListItem {
  id: string
  name: string
  type: "business" | "individual"
  status: "active" | "prospect" | "inactive" | "archived"
  email: string | null
  phone: string | null
  city: string | null
  vatNumber: string | null
  createdAt: string
}

export function useClients(status?: string) {
  const params = status ? `?status=${status}` : ""
  return useQuery<{ clients: ClientListItem[] }>({
    queryKey: ["clients", status ?? "all"],
    queryFn: () => api.get<{ clients: ClientListItem[] }>(`/api/mobile/clients${params}`),
    staleTime: 60_000,
    retry: 2,
  })
}

export interface ClientDetail {
  client: {
    id: string
    name: string
    type: string
    status: string
    email: string | null
    phone: string | null
    website: string | null
    vatNumber: string | null
    registrationNumber: string | null
    country: string
    city: string | null
    address: string | null
    postalCode: string | null
    notes: string | null
    tags: string[]
    createdAt: string
  }
  assignedTo: { id: string; name: string } | null
  kpis: {
    totalBilled: string | null
    openInvoicesCount: number
    projectsCount: number
  }
  projects: {
    id: string
    name: string
    status: string
    statusLabel: string
    budget: string | null
    dueDate: string | null
  }[]
  invoices: {
    id: string
    invoiceNumber: string
    status: string
    total: string
    issueDate: string
  }[]
}

export function useClientDetail(clientId: string) {
  return useQuery<ClientDetail>({
    queryKey: ["client-detail", clientId],
    queryFn: () => api.get<ClientDetail>(`/api/mobile/clients/${clientId}`),
    staleTime: 60_000,
    retry: 2,
    enabled: !!clientId,
  })
}
