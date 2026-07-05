// Attendance analytics — workforce domain (Phase 15 KPI domain). Pure +
// unit-tested.
//
// Aggregates the attendance record log into workforce KPIs: attendance,
// punctuality and absenteeism rates, average lateness, a status mix, and a
// per-employee watchlist so a manager can see both the shape of the workforce
// and exactly who needs attention.

export type AttendanceStatus = "present" | "late" | "absent" | "leave" | "clocked_out"

export interface AttendanceRecordInput {
  userId: string
  name: string
  status: AttendanceStatus
  lateMinutes: number | null
}

export type AttendanceBand = "healthy" | "watch" | "poor"

// Attendance-rate thresholds (% of scheduled days actually worked).
const HEALTHY_MIN = 95
const WATCH_MIN = 85

export interface EmployeeAttendance {
  userId: string
  name: string
  scheduledDays: number // days expected (excludes approved leave)
  present: number // showed up (present + late + clocked_out)
  late: number
  absent: number
  attendanceRate: number
  band: AttendanceBand
}

export interface AttendanceAnalytics {
  total: number
  byStatus: Record<AttendanceStatus, number>
  scheduledDays: number
  presentCount: number
  attendanceRate: number // showed / scheduled
  punctualityRate: number // on-time / showed
  absenteeismRate: number // absent / scheduled
  avgLateMinutes: number | null
  band: AttendanceBand
  watchlist: EmployeeAttendance[] // watch/poor employees, worst first
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function bandFor(attendanceRate: number, scheduledDays: number): AttendanceBand {
  if (scheduledDays === 0) return "healthy"
  if (attendanceRate >= HEALTHY_MIN) return "healthy"
  if (attendanceRate >= WATCH_MIN) return "watch"
  return "poor"
}

interface Tally {
  present: number
  late: number
  absent: number
  leave: number
  clockedOut: number
  lateMinutesSum: number
  lateMinutesCount: number
}

function emptyTally(): Tally {
  return {
    present: 0,
    late: 0,
    absent: 0,
    leave: 0,
    clockedOut: 0,
    lateMinutesSum: 0,
    lateMinutesCount: 0,
  }
}

function add(t: Tally, r: AttendanceRecordInput): void {
  switch (r.status) {
    case "present":
      t.present += 1
      break
    case "clocked_out":
      t.clockedOut += 1
      break
    case "late":
      t.late += 1
      break
    case "absent":
      t.absent += 1
      break
    case "leave":
      t.leave += 1
      break
  }
  if (r.status === "late" && typeof r.lateMinutes === "number" && r.lateMinutes > 0) {
    t.lateMinutesSum += r.lateMinutes
    t.lateMinutesCount += 1
  }
}

// Days the person was expected to work — everything except approved leave.
function scheduled(t: Tally): number {
  return t.present + t.late + t.absent + t.clockedOut
}
// Days they showed up at all (on time, late, or clocked out).
function showed(t: Tally): number {
  return t.present + t.late + t.clockedOut
}

function rate(part: number, whole: number): number {
  return whole > 0 ? round1((part / whole) * 100) : 0
}

/** Aggregate attendance records into workforce KPIs + a per-employee watchlist. */
export function computeAttendanceAnalytics(records: AttendanceRecordInput[]): AttendanceAnalytics {
  const org = emptyTally()
  const perUser = new Map<string, { name: string; tally: Tally }>()

  for (const r of records) {
    add(org, r)
    let entry = perUser.get(r.userId)
    if (!entry) {
      entry = { name: r.name, tally: emptyTally() }
      perUser.set(r.userId, entry)
    }
    add(entry.tally, r)
  }

  const scheduledDays = scheduled(org)
  const showedDays = showed(org)
  const presentCount = showedDays
  const onTime = org.present + org.clockedOut
  const attendanceRate = scheduledDays > 0 ? round1((showedDays / scheduledDays) * 100) : 100

  const watchlist: EmployeeAttendance[] = [...perUser.entries()]
    .map(([userId, { name, tally }]) => {
      const sched = scheduled(tally)
      const empRate = sched > 0 ? round1((showed(tally) / sched) * 100) : 100
      return {
        userId,
        name,
        scheduledDays: sched,
        present: showed(tally),
        late: tally.late,
        absent: tally.absent,
        attendanceRate: empRate,
        band: bandFor(empRate, sched),
      }
    })
    .filter((e) => e.band !== "healthy")
    .sort((a, b) => a.attendanceRate - b.attendanceRate || b.absent - a.absent)

  return {
    total: records.length,
    byStatus: {
      present: org.present,
      late: org.late,
      absent: org.absent,
      leave: org.leave,
      clocked_out: org.clockedOut,
    },
    scheduledDays,
    presentCount,
    attendanceRate,
    punctualityRate: rate(onTime, showedDays),
    absenteeismRate: rate(org.absent, scheduledDays),
    avgLateMinutes:
      org.lateMinutesCount > 0 ? round1(org.lateMinutesSum / org.lateMinutesCount) : null,
    band: bandFor(attendanceRate, scheduledDays),
    watchlist,
  }
}
