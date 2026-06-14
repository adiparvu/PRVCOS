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

export interface ShiftItem {
  id: string
  title: string
  location: string | null
  role: string
  startTime: string
  endTime: string
  date: string
  status: "confirmed" | "open" | "draft" | "scheduled"
  totalSlots: number
  filledSlots: number
  assignees: { id: string; initials: string }[]
}

export interface AttendanceItem {
  id: string
  userId: string
  firstName: string
  lastName: string
  initials: string
  role: string
  jobTitle: string | null
  status: "present" | "late" | "absent" | "leave" | "clocked_out"
  clockIn: string | null
  clockOut: string | null
  lateMinutes: number | null
}

export interface PeopleData {
  teamKpi: {
    total: number
    online: number
    uniqueRoles: number
  }
  members: TeamMember[]
  scheduleKpi: {
    todayShifts: number
    covered: number
    locations: number
    assigned: number
    unassigned: number
  }
  storeGroups: StoreGroup[]
  shifts: ShiftItem[]
  attendanceKpi: {
    present: number
    late: number
    absent: number
    activeToday: number
    inactiveToday: number
    total: number
  }
  attendance: AttendanceRecord[]
  todayAttendance: AttendanceItem[]
}

export function usePeople() {
  return useQuery<PeopleData>({
    queryKey: ["people"],
    queryFn: () => api.get<PeopleData>("/api/mobile/people"),
    staleTime: 60_000,
    retry: 2,
  })
}
