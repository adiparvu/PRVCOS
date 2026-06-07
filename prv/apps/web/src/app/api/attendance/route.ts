import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type AttendanceStatus = "present" | "late" | "absent" | "leave" | "clocked_out"

export interface AttendanceRecord {
  id: string
  employeeId: string
  initials: string
  name: string
  role: string
  site: string
  status: AttendanceStatus
  clockIn: string | null
  clockOut: string | null
  activeMinutes: number | null
  lateMinutes: number | null
  scheduledStart: string
  scheduledEnd: string
  leaveLabel: string | null
  gpsVerified: boolean
  barPct: number
}

export interface AttendanceMeta {
  present: number
  late: number
  absent: number
  onLeave: number
  dateLabel: string
}

const MOCK_ATTENDANCE: AttendanceRecord[] = [
  {
    id: "at1",
    employeeId: "e1",
    initials: "IC",
    name: "Ion Crișan",
    role: "Maistru Construcții",
    site: "A4 Brașov",
    status: "present",
    clockIn: "06:58",
    clockOut: null,
    activeMinutes: 542,
    lateMinutes: null,
    scheduledStart: "07:00",
    scheduledEnd: "16:00",
    leaveLabel: null,
    gpsVerified: true,
    barPct: 72,
  },
  {
    id: "at2",
    employeeId: "e3",
    initials: "SF",
    name: "Sorin Florea",
    role: "Maistru Construcții",
    site: "A4 Brașov",
    status: "present",
    clockIn: "07:03",
    clockOut: null,
    activeMinutes: 537,
    lateMinutes: null,
    scheduledStart: "07:00",
    scheduledEnd: "16:00",
    leaveLabel: null,
    gpsVerified: true,
    barPct: 69,
  },
  {
    id: "at3",
    employeeId: "e4",
    initials: "EM",
    name: "Elena Marin",
    role: "Manager Proiect",
    site: "A4 Brașov",
    status: "late",
    clockIn: "09:24",
    clockOut: null,
    activeMinutes: 276,
    lateMinutes: 84,
    scheduledStart: "08:00",
    scheduledEnd: "17:00",
    leaveLabel: null,
    gpsVerified: true,
    barPct: 55,
  },
  {
    id: "at4",
    employeeId: "e2",
    initials: "RD",
    name: "Radu Dima",
    role: "Zidar Calificat",
    site: "A4 Brașov",
    status: "late",
    clockIn: "08:32",
    clockOut: null,
    activeMinutes: 388,
    lateMinutes: 32,
    scheduledStart: "08:00",
    scheduledEnd: "17:00",
    leaveLabel: null,
    gpsVerified: false,
    barPct: 42,
  },
  {
    id: "at5",
    employeeId: "e5",
    initials: "LT",
    name: "Liviu Toma",
    role: "Electrician",
    site: "Cluj Mănăștur",
    status: "absent",
    clockIn: null,
    clockOut: null,
    activeMinutes: null,
    lateMinutes: null,
    scheduledStart: "08:00",
    scheduledEnd: "17:00",
    leaveLabel: null,
    gpsVerified: false,
    barPct: 0,
  },
  {
    id: "at6",
    employeeId: "e7",
    initials: "VB",
    name: "Vasile Bota",
    role: "Muncitor General",
    site: "Depozit Cluj",
    status: "absent",
    clockIn: null,
    clockOut: null,
    activeMinutes: null,
    lateMinutes: null,
    scheduledStart: "08:00",
    scheduledEnd: "16:00",
    leaveLabel: null,
    gpsVerified: false,
    barPct: 0,
  },
  {
    id: "at7",
    employeeId: "e6",
    initials: "AS",
    name: "Ana Stoica",
    role: "Contabilitate",
    site: "Birou",
    status: "leave",
    clockIn: null,
    clockOut: null,
    activeMinutes: null,
    lateMinutes: null,
    scheduledStart: "09:00",
    scheduledEnd: "17:00",
    leaveLabel: "1–5 Iul · Concediu anual",
    gpsVerified: false,
    barPct: 0,
  },
  {
    id: "at8",
    employeeId: "e8",
    initials: "MP",
    name: "Mihai Popa",
    role: "Instalator Sanitar",
    site: "Cluj Mănăștur",
    status: "clocked_out",
    clockIn: "07:45",
    clockOut: "16:30",
    activeMinutes: 465,
    lateMinutes: null,
    scheduledStart: "08:00",
    scheduledEnd: "16:30",
    leaveLabel: null,
    gpsVerified: true,
    barPct: 58,
  },
  {
    id: "at9",
    employeeId: "e9",
    initials: "DN",
    name: "Dorel Nistor",
    role: "Zugrav",
    site: "Cluj Mănăștur",
    status: "present",
    clockIn: "08:02",
    clockOut: null,
    activeMinutes: 498,
    lateMinutes: null,
    scheduledStart: "08:00",
    scheduledEnd: "16:00",
    leaveLabel: null,
    gpsVerified: true,
    barPct: 62,
  },
]

function computeMeta(records: AttendanceRecord[]): AttendanceMeta {
  return {
    present: records.filter((r) => r.status === "present" || r.status === "clocked_out").length,
    late: records.filter((r) => r.status === "late").length,
    absent: records.filter((r) => r.status === "absent").length,
    onLeave: records.filter((r) => r.status === "leave").length,
    dateLabel: "Mie 9 Iun",
  }
}

export const GET = withGates(
  { action: "attendance.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const status = req.nextUrl.searchParams.get("status")
    const results = status ? MOCK_ATTENDANCE.filter((r) => r.status === status) : MOCK_ATTENDANCE
    const meta = computeMeta(MOCK_ATTENDANCE)
    return NextResponse.json({ records: results, count: results.length, meta })
  }
)
