import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

export interface SearchResultProject {
  id: string
  title: string
  subtitle: string
  meta: string | null
  status: string
}

export interface SearchResultPerson {
  id: string
  title: string
  subtitle: string | null
}

export interface SearchResultClient {
  id: string
  title: string
  subtitle: string
  status: string
}

export interface SearchResultInvoice {
  id: string
  title: string
  total: string
  status: string
}

export interface SearchResultOrder {
  id: string
  title: string
  total: string
  status: string
}

export interface SearchResults {
  query: string
  scope: string
  results: {
    projects: SearchResultProject[]
    people: SearchResultPerson[]
    clients: SearchResultClient[]
    invoices: SearchResultInvoice[]
    orders: SearchResultOrder[]
  }
}

export function useSearch(query: string, scope: string) {
  return useQuery<SearchResults>({
    queryKey: ["search", query, scope],
    queryFn: () =>
      api.get<SearchResults>(`/api/mobile/search?q=${encodeURIComponent(query)}&scope=${scope}`),
    enabled: query.length >= 2,
    staleTime: 0,
    gcTime: 60_000,
  })
}
