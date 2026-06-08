import { db } from "@prv/db"
import { users, stores } from "@prv/db/schema"
import { eq, and, isNull, desc } from "drizzle-orm"
import type { MobileContext } from "./auth"
import type { PeopleData, TeamMember, StoreGroup, AttendanceRecord } from "./types"

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

function initials(first: string, last: string): string {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase()
}

function lastActiveLabel(d: Date | null): string | null {
  if (!d) return null
  const secs = Math.floor((Date.now() - d.getTime()) / 1000)
  if (secs < 120) return "Active now"
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

// ─── Main assembly ────────────────────────────────────────────────────────────

export async function assemblePeople(ctx: MobileContext): Promise<PeopleData> {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [userRows, storeRows] = await Promise.all([
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
  ])

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

  // ── Attendance: activity-based ─────────────────────────────────────────────

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

  return {
    teamKpi: {
      total: members.length,
      online: onlineCount,
      uniqueRoles,
    },
    members,
    scheduleKpi: {
      locations: storeGroups.filter((g) => g.storeId !== null).length,
      assigned: assignedCount,
      unassigned: unassignedCount,
    },
    storeGroups,
    attendanceKpi: {
      activeToday: activeTodayCount,
      inactiveToday: members.length - activeTodayCount,
      total: members.length,
    },
    attendance,
  }
}
