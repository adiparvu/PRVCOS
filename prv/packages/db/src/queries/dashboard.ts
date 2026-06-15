import { sql, eq, and, gte, lt, inArray, isNull, isNotNull, or, ne, desc, gt } from "drizzle-orm"
import { db } from "../client"
import {
  users,
  projects,
  projectMembers,
  notifications,
  invoices,
  companyMemberships,
  userPresence,
  attendanceRecords,
  tasks,
  leaveRequests,
  payrollRuns,
  stores,
  anomalyDetections,
  generatedReports,
  auditLogs,
} from "../schema"

const TZ = "Europe/Bucharest"
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

function getWorkWeekDates(todayStr: string): string[] {
  const today = new Date(todayStr)
  const dow = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dow + 6) % 7))
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

// ── Manager KPIs ─────────────────────────────────────────────────────────────

export interface ManagerKpis {
  revenue: string
  workforce: number
  activeProjects: number
  alerts: number
  pendingApprovals: number
  openTasks: number
  periodKey: string
}

export async function queryManagerKpis(companyId: string, userId: string): Promise<ManagerKpis> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  const [revenueRow, workforceRow, projectsRow, alertsRow, approvalsRow, openTasksRow] =
    await Promise.all([
      db
        .select({ total: sql<string>`COALESCE(SUM(${invoices.total}), 0)::text` })
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, companyId),
            eq(invoices.status, "paid"),
            gte(invoices.paidAt, startOfMonth),
            lt(invoices.paidAt, startOfNextMonth)
          )
        ),

      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(companyMemberships)
        .where(
          and(eq(companyMemberships.companyId, companyId), eq(companyMemberships.status, "ACTIVE"))
        ),

      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(projects)
        .where(
          and(
            eq(projects.companyId, companyId),
            eq(projects.status, "active"),
            eq(projects.isActive, true),
            isNull(projects.deletedAt)
          )
        ),

      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(notifications)
        .where(
          and(
            eq(notifications.companyId, companyId),
            eq(notifications.userId, userId),
            eq(notifications.isRead, false),
            eq(notifications.isDismissed, false),
            inArray(notifications.type, ["error", "warning"])
          )
        ),

      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(notifications)
        .where(
          and(
            eq(notifications.companyId, companyId),
            eq(notifications.userId, userId),
            eq(notifications.isRead, false),
            eq(notifications.isDismissed, false),
            eq(notifications.type, "action_required")
          )
        ),

      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(tasks)
        .where(
          and(
            eq(tasks.companyId, companyId),
            isNull(tasks.deletedAt),
            inArray(tasks.status, ["todo", "in_progress"])
          )
        ),
    ])

  return {
    revenue: revenueRow[0]?.total ?? "0",
    workforce: workforceRow[0]?.count ?? 0,
    activeProjects: projectsRow[0]?.count ?? 0,
    alerts: alertsRow[0]?.count ?? 0,
    pendingApprovals: approvalsRow[0]?.count ?? 0,
    openTasks: openTasksRow[0]?.count ?? 0,
    periodKey,
  }
}

// ── Manager Snapshot ──────────────────────────────────────────────────────────

export interface ManagerSnapshot extends ManagerKpis {
  staffPresent: number
  staffLate: number
  staffOnLeave: number
  pendingLeaveRequests: number
  pendingPayrollRuns: number
  snapshotDate: string
}

export async function queryManagerSnapshot(
  companyId: string,
  userId: string
): Promise<ManagerSnapshot> {
  const todayStr = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date())

  const [kpis, presentRow, lateRow, leaveRow, pendingLeaveRow, pendingPayrollRow] =
    await Promise.all([
      queryManagerKpis(companyId, userId),

      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.companyId, companyId),
            eq(attendanceRecords.date, todayStr),
            eq(attendanceRecords.status, "present")
          )
        ),

      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.companyId, companyId),
            eq(attendanceRecords.date, todayStr),
            eq(attendanceRecords.status, "late")
          )
        ),

      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.companyId, companyId),
            eq(attendanceRecords.date, todayStr),
            eq(attendanceRecords.status, "leave")
          )
        ),

      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(leaveRequests)
        .where(
          and(
            eq(leaveRequests.companyId, companyId),
            eq(leaveRequests.status, "pending"),
            isNull(leaveRequests.deletedAt)
          )
        ),

      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(payrollRuns)
        .where(and(eq(payrollRuns.companyId, companyId), eq(payrollRuns.status, "pending"))),
    ])

  return {
    ...kpis,
    staffPresent: presentRow[0]?.count ?? 0,
    staffLate: lateRow[0]?.count ?? 0,
    staffOnLeave: leaveRow[0]?.count ?? 0,
    pendingLeaveRequests: pendingLeaveRow[0]?.count ?? 0,
    pendingPayrollRuns: pendingPayrollRow[0]?.count ?? 0,
    snapshotDate: todayStr,
  }
}

// ── Worker context ────────────────────────────────────────────────────────────

export interface WorkerTeamMember {
  id: string
  firstName: string
  lastName: string
  jobTitle: string | null
  presenceStatus: string
}

export interface WorkerWeekDay {
  date: string
  label: string
  workedMinutes: number
  isClockedIn: boolean
  today: boolean
}

export interface WorkerTask {
  id: string
  title: string
  priority: string
  status: string
}

export interface WorkerContext {
  firstName: string
  lastName: string
  teamId: string | null
  storeId: string | null
  inboxCount: number
  activeProjectCount: number
  teamMembers: WorkerTeamMember[]
  weekDays: WorkerWeekDay[]
  todayTasks: WorkerTask[]
}

export async function queryWorkerContext(
  userId: string,
  companyId: string
): Promise<WorkerContext> {
  const todayStr = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date())
  const weekDates = getWorkWeekDates(todayStr)

  const [userRow, inboxRow, projectRow, teamRows, attendanceRows, taskRows] = await Promise.all([
    db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        teamId: users.teamId,
        storeId: users.storeId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),

    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.companyId, companyId),
          eq(notifications.isRead, false),
          eq(notifications.isDismissed, false)
        )
      ),

    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(projectMembers)
      .innerJoin(projects, eq(projectMembers.projectId, projects.id))
      .where(
        and(
          eq(projectMembers.userId, userId),
          eq(projects.status, "active"),
          eq(projects.isActive, true),
          isNull(projects.deletedAt)
        )
      ),

    db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        jobTitle: users.jobTitle,
        presenceStatus: userPresence.status,
      })
      .from(users)
      .leftJoin(userPresence, eq(userPresence.userId, users.id))
      .where(and(eq(users.companyId, companyId), ne(users.id, userId), eq(users.isActive, true)))
      .limit(8),

    db
      .select({
        date: attendanceRecords.date,
        clockIn: attendanceRecords.clockIn,
        clockOut: attendanceRecords.clockOut,
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.userId, userId),
          eq(attendanceRecords.companyId, companyId),
          inArray(attendanceRecords.date, weekDates)
        )
      ),

    db
      .select({
        id: tasks.id,
        title: tasks.title,
        priority: tasks.priority,
        status: tasks.status,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.companyId, companyId),
          isNull(tasks.deletedAt),
          or(eq(tasks.assigneeUserId, userId), eq(tasks.isAllStores, true))
        )
      )
      .limit(20),
  ])

  const attendanceByDate = new Map(attendanceRows.map((r) => [r.date, r]))
  const weekDays: WorkerWeekDay[] = weekDates.map((date) => {
    const rec = attendanceByDate.get(date)
    const isToday = date === todayStr
    const dow = new Date(date).getDay()
    let workedMinutes = 0
    let isClockedIn = false
    if (rec?.clockIn) {
      const end = rec.clockOut ?? (isToday ? new Date() : null)
      if (end) {
        workedMinutes = Math.round((end.getTime() - rec.clockIn.getTime()) / 60_000)
      }
      isClockedIn = !rec.clockOut
    }
    return { date, label: DAY_LABELS[dow] ?? "---", workedMinutes, isClockedIn, today: isToday }
  })

  return {
    firstName: userRow[0]?.firstName ?? "there",
    lastName: userRow[0]?.lastName ?? "",
    teamId: userRow[0]?.teamId ?? null,
    storeId: userRow[0]?.storeId ?? null,
    inboxCount: inboxRow[0]?.count ?? 0,
    activeProjectCount: projectRow[0]?.count ?? 0,
    teamMembers: teamRows.map((r) => ({
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      jobTitle: r.jobTitle,
      presenceStatus: r.presenceStatus ?? "offline",
    })),
    weekDays,
    todayTasks: taskRows.map((r) => ({
      id: r.id,
      title: r.title,
      priority: r.priority,
      status: r.status,
    })),
  }
}

// ── Specialist context ────────────────────────────────────────────────────────

export interface SpecialistContext {
  firstName: string
  inboxCount: number
  alertCount: number
}

export async function querySpecialistContext(
  userId: string,
  companyId: string
): Promise<SpecialistContext> {
  const [userRow, inboxRow, alertRow] = await Promise.all([
    db.select({ firstName: users.firstName }).from(users).where(eq(users.id, userId)).limit(1),

    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.companyId, companyId),
          eq(notifications.isRead, false),
          eq(notifications.isDismissed, false)
        )
      ),

    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.companyId, companyId),
          eq(notifications.isRead, false),
          eq(notifications.isDismissed, false),
          inArray(notifications.type, ["error", "warning", "action_required"])
        )
      ),
  ])

  return {
    firstName: userRow[0]?.firstName ?? "there",
    inboxCount: inboxRow[0]?.count ?? 0,
    alertCount: alertRow[0]?.count ?? 0,
  }
}

// ── Specialist role data ──────────────────────────────────────────────────────

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 2) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export interface SpecialistAnomalyItem {
  id: string
  severity: string
  title: string
  domain: string
  timeAgo: string
}

export interface SpecialistReportItem {
  id: string
  title: string
  status: string
  timeAgo: string
}

export interface SpecialistTicketItem {
  id: string
  title: string
  priority: "P1" | "P2" | "P3"
  timeAgo: string
}

export interface SpecialistAuditErrorItem {
  id: string
  action: string
  path: string | null
  timeAgo: string
}

export interface SpecialistHealthItem {
  label: string
  status: string
  ok: boolean
}

export interface SpecialistRoleData {
  anomalies: SpecialistAnomalyItem[]
  reports: SpecialistReportItem[]
  supportTickets: SpecialistTicketItem[]
  auditErrors: SpecialistAuditErrorItem[]
  systemHealth: SpecialistHealthItem[]
  stats: {
    memberCount: number
    activePresence: number
    auditCountToday: number
    openAnomalies: number
  }
}

export async function querySpecialistRoleData(
  role: string,
  companyId: string,
  _userId: string
): Promise<SpecialistRoleData> {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const needsReports = role === "data_analyst" || role === "system_administrator"
  const needsTickets = role === "app_support_specialist"
  const needsAuditErrors = role === "qa_tester" || role === "system_administrator"

  const [
    memberRow,
    presenceRow,
    auditTodayRow,
    anomalyRows,
    reportRows,
    ticketRows,
    auditErrorRows,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(companyMemberships)
      .where(
        and(eq(companyMemberships.companyId, companyId), eq(companyMemberships.status, "ACTIVE"))
      ),

    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(userPresence)
      .where(and(eq(userPresence.companyId, companyId), eq(userPresence.status, "online"))),

    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(auditLogs)
      .where(and(eq(auditLogs.companyId, companyId), gte(auditLogs.createdAt, todayStart))),

    db
      .select({
        id: anomalyDetections.id,
        severity: anomalyDetections.severity,
        title: anomalyDetections.title,
        domain: anomalyDetections.domain,
        createdAt: anomalyDetections.createdAt,
      })
      .from(anomalyDetections)
      .where(
        and(eq(anomalyDetections.companyId, companyId), isNull(anomalyDetections.resolvedAt))
      )
      .orderBy(desc(anomalyDetections.createdAt))
      .limit(5),

    needsReports
      ? db
          .select({
            id: generatedReports.id,
            title: generatedReports.title,
            status: generatedReports.status,
            createdAt: generatedReports.createdAt,
          })
          .from(generatedReports)
          .where(eq(generatedReports.companyId, companyId))
          .orderBy(desc(generatedReports.createdAt))
          .limit(5)
      : Promise.resolve([]),

    needsTickets
      ? db
          .select({
            id: notifications.id,
            title: notifications.title,
            type: notifications.type,
            createdAt: notifications.createdAt,
          })
          .from(notifications)
          .where(
            and(
              eq(notifications.companyId, companyId),
              eq(notifications.isDismissed, false),
              inArray(notifications.type, ["error", "action_required", "warning"])
            )
          )
          .orderBy(desc(notifications.createdAt))
          .limit(5)
      : Promise.resolve([]),

    needsAuditErrors
      ? db
          .select({
            id: auditLogs.id,
            action: auditLogs.action,
            path: auditLogs.path,
            createdAt: auditLogs.createdAt,
          })
          .from(auditLogs)
          .where(and(eq(auditLogs.companyId, companyId), gt(auditLogs.gateFailed, 0)))
          .orderBy(desc(auditLogs.createdAt))
          .limit(5)
      : Promise.resolve([]),
  ])

  const memberCount = memberRow[0]?.count ?? 0
  const activePresence = presenceRow[0]?.count ?? 0
  const auditCountToday = auditTodayRow[0]?.count ?? 0
  const openAnomalies = anomalyRows.length

  return {
    anomalies: anomalyRows.map((r) => ({
      id: r.id,
      severity: r.severity,
      title: r.title,
      domain: r.domain,
      timeAgo: timeAgo(r.createdAt),
    })),
    reports: reportRows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      timeAgo: timeAgo(r.createdAt),
    })),
    supportTickets: ticketRows.map((r, i) => ({
      id: r.id,
      title: r.title,
      priority: (["P1", "P2", "P3"] as const)[Math.min(i, 2)] ?? "P3",
      timeAgo: timeAgo(r.createdAt),
    })),
    auditErrors: auditErrorRows.map((r) => ({
      id: r.id,
      action: r.action,
      path: r.path ?? null,
      timeAgo: timeAgo(r.createdAt),
    })),
    systemHealth: [
      { label: "Database", status: "Connected", ok: true },
      {
        label: "Active sessions",
        status: `${activePresence} online`,
        ok: activePresence >= 0,
      },
      {
        label: "Open anomalies",
        status: openAnomalies > 0 ? `${openAnomalies} active` : "None",
        ok: openAnomalies === 0,
      },
      { label: "Audit log", status: `${auditCountToday} events today`, ok: true },
    ],
    stats: { memberCount, activePresence, auditCountToday, openAnomalies },
  }
}
