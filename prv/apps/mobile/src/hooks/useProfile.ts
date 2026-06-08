import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

export interface ProfileData {
  userId: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  jobTitle: string | null
  role: string
  avatarUrl: string | null
  locale: string
  timezone: string
  memberSince: string
  mfaEnabled: boolean
  company: {
    id: string
    name: string
  }
}

export function useProfile() {
  return useQuery<ProfileData>({
    queryKey: ["profile"],
    queryFn: () => api.get<ProfileData>("/api/mobile/profile"),
    staleTime: 60_000,
    retry: 2,
  })
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
}

export function formatRole(role: string): string {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export function formatMemberSince(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
}
