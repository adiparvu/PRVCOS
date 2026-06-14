import { db } from "@prv/db"
import { users, stores, shifts, shiftAssignments, attendanceRecords } from "@prv/db/schema"
import { eq, and, isNull, desc, inArray } from "drizzle-orm"
import type { MobileContext } from "./auth"
import type {
  PeopleData,
  TeamMember,
  StoreGroup,
  AttendanceRecord,
  ShiftItem,
  AttendanceItem,
} from "./types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_DISPLAY: Record<string, string> = {
  group_ceo: "Group CEO",
  ceo: "CEO",
  co_ceo: "Co-CEO",
  system_administrator: "Sysadmin",
  store_manager: "Store Manager",
  shop_director: "Shop Director",
  operations_manager: "Operations Manager",
  department_head: "Department Head",
  team_leader: "Team Leader",
  worker: "Worker",
  seller: "Seller",
  project_director: "Project Director",
  hr_payroll: "HR & Payroll",
  data_analyst: "Data Analyst",
}

const SHIFT_ROLE_DISPLAY: Record<string, string> = {
  foreman: "Foreman",
  bricklayer: "Bricklayer",
  electrician: "Electrician",
  finisher: "Finisher",
  welder: "Welder",
  general: "General",
}

export function initials(first: string, last: string): string {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase()
}

export function lastActiveLabel(d: Date | null): string | null {
  if (!d) return null
  const secs = Math.floor((Date.now() - d.getTime()) / 1000)
  if (secs < 120) return "Active now"
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function todayString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

// ─── Main assembly ────────────────────────────────────────────────────────────

export async function assemblePeople(ctx: MobileContext): Promise<PeopleData> {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayStr = todayString()

  const [userRows, storeRows, todayShiftRows, todayAttRows] = await Promise.all([
    db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        jobTitle: users.jobTitle,
        storeId: users.storeId,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(
        and(eq(users.companyId, ctx.companyId), eq(users.isActive, true), isNull(users.deletedAt))
      )
      .orderBy(desc(users.lastLoginAt)),

    db
      .select({ id: stores.id, name: stores.name })
      .from(stores)
      .where(and(eq(stores.companyId, ctx.companyId), eq(stores.isActive, true)))
      .orderBy(stores.name),

    db
      .select({
        id: shifts.id,
        title: shifts.title,
        location: shifts.location,
        role: shifts.role,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        date: shifts.date,
        status: shifts.status,
        totalSlots: shifts.totalSlots,
      })
      .from(shifts)
      .where(
        and(
          eq(shifts.companyId, ctx.companyId),
          eq(shifts.date, todayStr),
          isNull(shifts.deletedAt)
        )
      )
      .orderBy(shifts.startTime),

    db
      .select({
        id: attendanceRecords.id,
        userId: attendanceRecords.userId,
        status: attendanceRecords.status,
        clockIn: attendanceRecords.clockIn,
        clockOut: attendanceRecords.clockOut,
        lateMinutes: attendanceRecords.lateMinutes,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        jobTitle: users.jobTitle,
      })
      .from(attendanceRecords)
      .innerJoin(users, eq(attendanceRecords.userId, users.id))
      .where(
        and(eq(attendanceRecords.companyId, ctx.companyId), eq(attendanceRecords.date, todayStr))
      )
      .orderBy(attendanceRecords.status),
  ])

  // ── Shift assignments ──────────────────────────────────────────────────────

  const shiftIdList = todayShiftRows.map((s) => s.id)
  const assignmentRows =
    shiftIdList.length > 0
      ? await db
          .select({
            shiftId: shiftAssignments.shiftId,
            userId: shiftAssignments.userId,
            firstName: users.firstName,
            lastName: users.lastName,
          })
          .from(shiftAssignments)
          .innerJoin(users, eq(shiftAssignments.userId, users.id))
          .where(inArray(shiftAssignments.shiftId, shiftIdList))
      : []

  const assignmentsByShift = new Map<string, typeof assignmentRows>()
  for (const a of assignmentRows) {
    if (!assignmentsByShift.has(a.shiftId)) assignmentsByShift.set(a.shiftId, [])
    assignmentsByShift.get(a.shiftId)!.push(a)
  }

  // ── Build shift items ──────────────────────────────────────────────────────

  const shiftItems: ShiftItem[] = todayShiftRows.map((s) => {
    const assignees = assignmentsByShift.get(s.id) ?? []
    return {
      id: s.id,
      title: s.title,
      location: s.location ?? null,
      role: SHIFT_ROLE_DISPLAY[s.role] ?? s.role,
      startTime: s.startTime,
      endTime: s.endTime,
      date: s.date,
      status: s.status as ShiftItem["status"],
      totalSlots: s.totalSlots,
      filledSlots: assignees.length,
      assignees: assignees.map((a) => ({
        id: a.userId,
        initials: initials(a.firstName, a.lastName),
      })),
    }
  })

  // ── Build attendance items ─────────────────────────────────────────────────

  const todayAttendance: AttendanceItem[] = todayAttRows.map((a) => ({
    id: a.id,
    userId: a.userId,
    firstName: a.firstName,
    lastName: a.lastName,
    initials: initials(a.firstName, a.lastName),
    role: ROLE_DISPLAY[a.role] ?? a.role,
    jobTitle: a.jobTitle ?? null,
    status: a.status as AttendanceItem["status"],
    clockIn: a.clockIn ? a.clockIn.toISOString() : null,
    clockOut: a.clockOut ? a.clockOut.toISOString() : null,
    lateMinutes: a.lateMinutes ?? null,
  }))

  // ── Derive member list ─────────────────────────────────────────────────────

  const storeNameMap = new Map(storeRows.map((s) => [s.id, s.name]))

  const members: TeamMember[] = userRows.map((u) => {
    const isOnline = !!u.lastLoginAt && u.lastLoginAt >= oneHourAgo
    const isActiveToday = !!u.lastLoginAt && u.lastLoginAt >= todayStart
    return {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      initials: initials(u.firstName, u.lastName),
      role: ROLE_DISPLAY[u.role] ?? u.role,
      jobTitle: u.jobTitle ?? null,
      lastActiveAt: lastActiveLabel(u.lastLoginAt),
      isOnline,
      isActiveToday,
      storeId: u.storeId ?? null,
    }
  })

  // ── KPIs ────────────────────────────────────────────────────────────────────

  const onlineCount = members.filter((m) => m.isOnline).length
  const uniqueRoles = new Set(userRows.map((u) => u.role)).size

  // ── Schedule: group members by store ──────────────────────────────────────

  const storeGroupMap = new Map<string | null, TeamMember[]>()
  storeGroupMap.set(null, [])
  for (const s of storeRows) storeGroupMap.set(s.id, [])
  for (const m of members) {
    const key = m.storeId
    if (!storeGroupMap.has(key)) storeGroupMap.set(key, [])
    storeGroupMap.get(key)!.push(m)
  }

  const storeGroups: StoreGroup[] = []
  for (const [storeId, groupMembers] of storeGroupMap) {
    if (groupMembers.length === 0) continue
    storeGroups.push({
      storeId,
      storeName: storeId ? (storeNameMap.get(storeId) ?? "Unknown") : "Unassigned",
      memberCount: groupMembers.length,
      onlineCount: groupMembers.filter((m) => m.isOnline).length,
      previews: groupMembers.slice(0, 4).map((m) => ({
        id: m.id,
        initials: m.initials,
        isOnline: m.isOnline,
      })),
    })
  }

  const assignedCount = members.filter((m) => m.storeId !== null).length
  const unassignedCount = members.length - assignedCount
  const coveredShifts = shiftItems.filter((s) => s.filledSlots >= s.totalSlots).length

  // ── Attendance: activity-based legacy + real records ──────────────────────

  const attendance: AttendanceRecord[] = members.map((m) => ({
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    initials: m.initials,
    role: m.role,
    jobTitle: m.jobTitle,
    lastActiveAt: m.lastActiveAt,
    isActiveToday: m.isActiveToday,
  }))

  const activeTodayCount = attendance.filter((a) => a.isActiveToday).length

  const presentCount = todayAttRows.filter(
    (a) => a.status === "present" || a.status === "clocked_out"
  ).length
  const lateCount = todayAttRows.filter((a) => a.status === "late").length
  const absentCount = todayAttRows.filter((a) => a.status === "absent").length

  return {
    teamKpi: {
      total: members.length,
      online: onlineCount,
      uniqueRoles,
    },
    members,
    scheduleKpi: {
      todayShifts: shiftItems.length,
      covered: coveredShifts,
      locations: storeGroups.filter((g) => g.storeId !== null).length,
      assigned: assignedCount,
      unassigned: unassignedCount,
    },
    storeGroups,
    shifts: shiftItems,
    attendanceKpi: {
      present: presentCount,
      late: lateCount,
      absent: absentCount,
      activeToday: activeTodayCount,
      inactiveToday: members.length - activeTodayCount,
      total: members.length,
    },
    attendance,
    todayAttendance,
  }
}
