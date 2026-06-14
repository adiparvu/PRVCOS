// Seed: attendance records and shift assignments
import { db } from "../client"
import { attendanceRecords, shifts, shiftAssignments } from "../schema/workforce"

export interface WorkforceSeedResult {
  attendanceCount: number
  shiftIds: string[]
}

export async function seedWorkforce(opts: {
  companyId: string
  storeId: string
  managerId: string
  supervisorId: string
  workerIds: string[]
  projectId?: string
}): Promise<WorkforceSeedResult> {
  console.log("  → Seeding workforce (attendance & shifts)...")

  const { companyId, storeId, supervisorId, workerIds, projectId } = opts
  const [worker1Id, worker2Id, worker3Id] = workerIds

  const allWorkers = [supervisorId, worker1Id, worker2Id, worker3Id]

  // ── Attendance — last 10 working days ──────────────────────────────────────
  const workDates = [
    "2025-05-05",
    "2025-05-06",
    "2025-05-07",
    "2025-05-08",
    "2025-05-09",
    "2025-05-12",
    "2025-05-13",
    "2025-05-14",
    "2025-05-15",
    "2025-05-16",
  ]

  let attendanceCount = 0

  for (const date of workDates) {
    for (const userId of allWorkers) {
      // Simulate realistic attendance — occasional late / absent
      const roll = Math.random()
      let status: "present" | "late" | "absent" | "clocked_out" = "present"
      let lateMinutes: number | undefined
      let clockIn: Date | undefined
      let clockOut: Date | undefined

      if (roll < 0.05) {
        status = "absent"
      } else if (roll < 0.15) {
        status = "late"
        lateMinutes = Math.floor(Math.random() * 25) + 5
        const baseHour = 8
        const mins = lateMinutes
        clockIn = new Date(`${date}T0${baseHour}:${String(mins).padStart(2, "0")}:00.000Z`)
        clockOut = new Date(`${date}T17:00:00.000Z`)
      } else {
        status = "clocked_out"
        clockIn = new Date(`${date}T08:00:00.000Z`)
        clockOut = new Date(`${date}T17:00:00.000Z`)
      }

      await db
        .insert(attendanceRecords)
        .values({
          companyId,
          storeId,
          userId,
          date,
          status,
          scheduledStart: "08:00",
          scheduledEnd: "17:00",
          clockIn,
          clockOut,
          lateMinutes,
          gpsVerified: status !== "absent",
        })
        .onConflictDoNothing()

      attendanceCount++
    }
  }

  // ── Shifts ─────────────────────────────────────────────────────────────────
  const shiftDefs = [
    {
      role: "foreman" as const,
      title: "Supraveghere Șantier Bd. Unirii",
      location: "Bd. Unirii 12, Sector 4",
      date: "2025-05-19",
      startTime: "08:00",
      endTime: "17:00",
      durationHours: "8",
      status: "confirmed" as const,
      totalSlots: 1,
      assignees: [supervisorId],
    },
    {
      role: "electrician" as const,
      title: "Instalații electrice — Ap. 45",
      location: "Bd. Unirii 12, Sector 4",
      date: "2025-05-19",
      startTime: "08:00",
      endTime: "17:00",
      durationHours: "8",
      status: "confirmed" as const,
      totalSlots: 2,
      assignees: [worker1Id],
    },
    {
      role: "general" as const,
      title: "Lucrări sanitare — instalare obiecte",
      location: "Bd. Unirii 12, Sector 4",
      date: "2025-05-19",
      startTime: "08:00",
      endTime: "17:00",
      durationHours: "8",
      status: "confirmed" as const,
      totalSlots: 1,
      assignees: [worker3Id],
    },
    {
      role: "finisher" as const,
      title: "Zugrăveli și finisaje — salon",
      location: "Bd. Unirii 12, Sector 4",
      date: "2025-05-20",
      startTime: "08:00",
      endTime: "17:00",
      durationHours: "8",
      status: "scheduled" as const,
      totalSlots: 2,
      assignees: [worker2Id],
    },
    {
      role: "general" as const,
      title: "Pregătire șantier Hotel Royal",
      location: "Calea Victoriei 88, Sector 1",
      date: "2025-06-30",
      startTime: "07:00",
      endTime: "16:00",
      durationHours: "8",
      status: "draft" as const,
      totalSlots: 4,
      assignees: [],
    },
  ]

  const shiftIds: string[] = []

  for (const s of shiftDefs) {
    const { assignees, ...shiftData } = s

    const [shift] = await db
      .insert(shifts)
      .values({ companyId, storeId, projectId, ...shiftData })
      .returning({ id: shifts.id })

    if (!shift) continue
    shiftIds.push(shift.id)

    for (const userId of assignees) {
      await db
        .insert(shiftAssignments)
        .values({ shiftId: shift.id, userId, companyId })
        .onConflictDoNothing()
    }
  }

  console.log(`    ✓ Attendance records: ${attendanceCount}, Shifts: ${shiftIds.length}`)
  return { attendanceCount, shiftIds }
}
