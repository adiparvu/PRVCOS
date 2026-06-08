import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

export interface TeamMember {
  id: string
  firstName: string
  lastName: string
  initials: string
  role: string
  jobTitle: string | null
  lastActiveAt: string | null
  isOnline: boolean
  isActiveToday: boolean
  storeId: string | null
}

export interface StoreGroup {
  storeId: string | null
  storeName: string
  memberCount: number
  onlineCount: number
  previews: { id: string; initials: string; isOnline: boolean }[]
}

export interface AttendanceRecord {
  id: string
  firstName: string
  lastName: string
  initials: string
  role: string
  jobTitle: string | null
  lastActiveAt: string | null
  isActiveToday: boolean
}

export interface PeopleData {
  teamKpi: {
    total: number
    online: number
    uniqueRoles: number
  }
  members: TeamMember[]
  scheduleKpi: {
    locations: number
    assigned: number
    unassigned: number
  }
  storeGroups: StoreGroup[]
  attendanceKpi: {
    activeToday: number
    inactiveToday: number
    total: number
  }
  attendance: AttendanceRecord[]
}

export function usePeople() {
  return useQuery<PeopleData>({
    queryKey: ["people"],
    queryFn: () => api.get<PeopleData>("/api/mobile/people"),
    staleTime: 60_000,
    retry: 2,
  })
}
