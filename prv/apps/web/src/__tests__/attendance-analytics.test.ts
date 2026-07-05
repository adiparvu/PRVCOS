import { describe, it, expect } from "vitest"
import { computeAttendanceAnalytics } from "@/lib/attendance-analytics"

function rec(
  userId: string,
  name: string,
  status: "present" | "late" | "absent" | "leave" | "clocked_out",
  lateMinutes: number | null = null
) {
  return { userId, name, status, lateMinutes }
}

describe("computeAttendanceAnalytics", () => {
  it("computes attendance, punctuality and absenteeism rates from the status mix", () => {
    // scheduled = present+late+absent+clocked_out = 5+2+2+1 = 10 (leave excluded)
    // showed = present+late+clocked_out = 8 → attendance 80%
    // onTime = present+clocked_out = 6 → punctuality 6/8 = 75%
    // absenteeism = 2/10 = 20%
    const a = computeAttendanceAnalytics([
      ...Array.from({ length: 5 }, (_, i) => rec(`p${i}`, `P${i}`, "present")),
      rec("l1", "L1", "late", 10),
      rec("l2", "L2", "late", 20),
      rec("a1", "A1", "absent"),
      rec("a2", "A2", "absent"),
      rec("c1", "C1", "clocked_out"),
      rec("v1", "V1", "leave"),
    ])
    expect(a.total).toBe(11)
    expect(a.scheduledDays).toBe(10)
    expect(a.attendanceRate).toBe(80)
    expect(a.punctualityRate).toBe(75)
    expect(a.absenteeismRate).toBe(20)
    expect(a.avgLateMinutes).toBe(15)
    expect(a.byStatus.leave).toBe(1)
  })

  it("bands the organization by attendance rate", () => {
    const healthy = computeAttendanceAnalytics([
      ...Array.from({ length: 19 }, (_, i) => rec(`p${i}`, `P${i}`, "present")),
      rec("a", "A", "absent"),
    ]) // 95%
    expect(healthy.band).toBe("healthy")
    const watch = computeAttendanceAnalytics([
      ...Array.from({ length: 9 }, (_, i) => rec(`p${i}`, `P${i}`, "present")),
      rec("a", "A", "absent"),
    ]) // 90%
    expect(watch.band).toBe("watch")
    const poor = computeAttendanceAnalytics([
      ...Array.from({ length: 8 }, (_, i) => rec(`p${i}`, `P${i}`, "present")),
      rec("a1", "A1", "absent"),
      rec("a2", "A2", "absent"),
      rec("a3", "A3", "absent"),
    ]) // 8/11 ≈ 72.7%
    expect(poor.band).toBe("poor")
  })

  it("builds a watchlist of sub-95% employees, worst first, excluding healthy ones", () => {
    // dumitru: 1 present of 4 scheduled = 25% (poor)
    // popescu: 9 present, 1 absent = 90% (watch)
    // ionescu: all present = 100% (healthy, excluded)
    const a = computeAttendanceAnalytics([
      rec("d", "Vlad Dumitru", "present"),
      rec("d", "Vlad Dumitru", "absent"),
      rec("d", "Vlad Dumitru", "absent"),
      rec("d", "Vlad Dumitru", "absent"),
      ...Array.from({ length: 9 }, () => rec("m", "Maria Popescu", "present")),
      rec("m", "Maria Popescu", "absent"),
      ...Array.from({ length: 5 }, () => rec("i", "Ana Ionescu", "present")),
    ])
    expect(a.watchlist.map((w) => w.userId)).toEqual(["d", "m"])
    expect(a.watchlist[0]!.band).toBe("poor")
    expect(a.watchlist[0]!.attendanceRate).toBe(25)
    expect(a.watchlist[1]!.band).toBe("watch")
  })

  it("excludes approved-leave days from the scheduled denominator", () => {
    const a = computeAttendanceAnalytics([
      rec("u", "U", "present"),
      rec("u", "U", "leave"),
      rec("u", "U", "leave"),
    ])
    // only 1 scheduled day, worked → 100%
    expect(a.scheduledDays).toBe(1)
    expect(a.attendanceRate).toBe(100)
    expect(a.watchlist).toHaveLength(0)
  })

  it("returns safe defaults for an empty record set", () => {
    const a = computeAttendanceAnalytics([])
    expect(a.total).toBe(0)
    expect(a.attendanceRate).toBe(100)
    expect(a.avgLateMinutes).toBeNull()
    expect(a.band).toBe("healthy")
    expect(a.watchlist).toHaveLength(0)
  })
})
