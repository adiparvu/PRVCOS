import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type TimeOffStatus = "pending" | "approved" | "declined"
export type TimeOffType = "annual" | "sick" | "personal" | "maternity" | "paternity" | "unpaid"

export interface TimeOffRequest {
  id: string
  employeeId: string
  employeeName: string
  employeeInitials: string
  employeeRole: string
  employeeLocation: string
  leaveBalance: number
  type: TimeOffType
  typeLabel: string
  startDate: string
  endDate: string | null
  workingDays: number
  note: string | null
  hasCertificate: boolean
  coverNeeded: boolean
  status: TimeOffStatus
  submittedAt: string
}

const MOCK_REQUESTS: TimeOffRequest[] = [
  {
    id: "tof-1",
    employeeId: "e3",
    employeeName: "Mihai Popescu",
    employeeInitials: "MP",
    employeeRole: "Field Technician",
    employeeLocation: "Timișoara",
    leaveBalance: 14,
    type: "annual",
    typeLabel: "Annual Leave",
    startDate: "2026-06-16",
    endDate: "2026-06-20",
    workingDays: 5,
    note: "Family holiday — booked in advance, cover can be arranged with George Stoica.",
    hasCertificate: false,
    coverNeeded: true,
    status: "pending",
    submittedAt: "2026-06-04T09:12:00Z",
  },
  {
    id: "tof-2",
    employeeId: "e5",
    employeeName: "Elena Badea",
    employeeInitials: "EB",
    employeeRole: "Sales Associate",
    employeeLocation: "București",
    leaveBalance: 8,
    type: "sick",
    typeLabel: "Sick Leave",
    startDate: "2026-06-09",
    endDate: "2026-06-10",
    workingDays: 2,
    note: "Medical appointment (certificate attached).",
    hasCertificate: true,
    coverNeeded: false,
    status: "pending",
    submittedAt: "2026-06-06T07:30:00Z",
  },
  {
    id: "tof-3",
    employeeId: "e7",
    employeeName: "George Stoica",
    employeeInitials: "GS",
    employeeRole: "Store Associate",
    employeeLocation: "Floreasca",
    leaveBalance: 21,
    type: "personal",
    typeLabel: "Personal Day",
    startDate: "2026-06-12",
    endDate: null,
    workingDays: 1,
    note: null,
    hasCertificate: false,
    coverNeeded: false,
    status: "pending",
    submittedAt: "2026-06-05T16:45:00Z",
  },
]

export const GET = withGates(
  { action: "hr.time_off.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") ?? "pending"

    const results = MOCK_REQUESTS.filter((r) => r.status === status)
    return NextResponse.json({ requests: results, count: results.length })
  }
)
