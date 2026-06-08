import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

export interface EmployeeDetail {
  employee: {
    id: string
    firstName: string
    lastName: string
    fullName: string
    email: string
    phone: string | null
    avatarUrl: string | null
    bio: string | null
    employeeId: string | null
    jobTitle: string | null
    role: string
    scopeLevel: string
    status: string
    securityLevel: string
    mfaEnabled: boolean
    isActive: boolean
    lastLoginAt: string | null
    joinedAt: string
    isOnline: boolean
  }
  employment: {
    departmentName: string | null
    teamName: string | null
    storeName: string | null
    manager: { id: string; name: string; jobTitle: string | null } | null
  }
  directReports: {
    id: string
    name: string
    jobTitle: string | null
    role: string
    isOnline: boolean
  }[]
  projects: {
    id: string
    name: string
    status: string
    role: string
    dueDate: string | null
  }[]
  activity: {
    id: string
    title: string
    body: string | null
    type: string
    entityType: string | null
    createdAt: string
  }[]
}

export function useEmployeeDetail(employeeId: string) {
  return useQuery<EmployeeDetail>({
    queryKey: ["employee-detail", employeeId],
    queryFn: () => api.get<EmployeeDetail>(`/api/mobile/employees/${employeeId}`),
    staleTime: 60_000,
    retry: 2,
    enabled: !!employeeId,
  })
}

export function getEmployeeInitials(firstName: string, lastName: string): string {
  return ((firstName[0] ?? "") + (lastName[0] ?? "")).toUpperCase()
}

export function formatActivityTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}
