import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { db } from "@prv/db"
import {
  users,
  userPresence,
  socialProfiles,
  attendanceRecords,
  shifts,
  shiftAssignments,
  projectMembers,
  projects,
  auditLogs,
  stores,
} from "@prv/db/schema"
import { eq, and, gte, desc, ne, isNull, inArray } from "drizzle-orm"
import type { Metadata } from "next"
import { PersonProfileClient } from "./PersonProfileClient"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const [person] = await db
    .select({ firstName: users.firstName, lastName: users.lastName, jobTitle: users.jobTitle })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)

  if (!person) return { title: "Profile" }
  return { title: `${person.firstName} ${person.lastName}` }
}

export default async function PersonProfilePage({ params }: Props) {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  let session
  try {
    session = await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  const { id } = await params

  const [person] = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
      jobTitle: users.jobTitle,
      avatarUrl: users.avatarUrl,
      bio: users.bio,
      role: users.role,
      createdAt: users.createdAt,
      teamId: users.teamId,
      departmentId: users.departmentId,
    })
    .from(users)
    .where(and(eq(users.id, id), eq(users.companyId, session.companyId)))
    .limit(1)

  if (!person) redirect("/people")

  const [presence] = await db
    .select()
    .from(userPresence)
    .where(eq(userPresence.userId, id))
    .limit(1)

  const socialRows = await db
    .select({
      id: socialProfiles.id,
      platform: socialProfiles.platform,
      url: socialProfiles.url,
      displayName: socialProfiles.displayName,
      isPublic: socialProfiles.isPublic,
    })
    .from(socialProfiles)
    .where(and(eq(socialProfiles.userId, id), eq(socialProfiles.companyId, session.companyId)))

  // ── Real profile aggregates ──────────────────────────────────────────────
  const todayStr = new Date().toISOString().slice(0, 10)
  const monthStart = `${todayStr.slice(0, 7)}-01`

  const [attRows, shiftRows, projectRows, activityRows] = await Promise.all([
    db
      .select({ status: attendanceRecords.status })
      .from(attendanceRecords)
      .where(and(eq(attendanceRecords.userId, id), gte(attendanceRecords.date, monthStart))),
    db
      .select({
        id: shifts.id,
        title: shifts.title,
        location: shifts.location,
        storeName: stores.name,
        date: shifts.date,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
      })
      .from(shiftAssignments)
      .innerJoin(shifts, eq(shiftAssignments.shiftId, shifts.id))
      .leftJoin(stores, eq(shifts.storeId, stores.id))
      .where(
        and(eq(shiftAssignments.userId, id), isNull(shifts.deletedAt), gte(shifts.date, monthStart))
      )
      .orderBy(shifts.date, shifts.startTime),
    db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .innerJoin(projects, eq(projectMembers.projectId, projects.id))
      .where(and(eq(projectMembers.userId, id), inArray(projects.status, ["active", "on_hold"]))),
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(and(eq(auditLogs.companyId, session.companyId), eq(auditLogs.actorId, id)))
      .orderBy(desc(auditLogs.createdAt))
      .limit(6),
  ])

  const presentDays = attRows.filter(
    (r) => r.status === "present" || r.status === "late" || r.status === "clocked_out"
  ).length
  const attendancePct = attRows.length > 0 ? Math.round((presentDays / attRows.length) * 100) : null

  const upcomingShifts = shiftRows
    .filter((sft) => sft.date >= todayStr)
    .slice(0, 5)
    .map((sft) => ({
      id: sft.id,
      title: sft.title,
      location: sft.location ?? sft.storeName ?? null,
      date: sft.date,
      startTime: sft.startTime,
      endTime: sft.endTime,
    }))

  // Colleagues — same team, else same department — with live presence.
  const scopeColumn = person.teamId ? users.teamId : person.departmentId ? users.departmentId : null
  const scopeValue = person.teamId ?? person.departmentId ?? null
  const colleagueRows =
    scopeColumn && scopeValue
      ? await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            avatarUrl: users.avatarUrl,
            presenceStatus: userPresence.status,
          })
          .from(users)
          .leftJoin(userPresence, eq(userPresence.userId, users.id))
          .where(
            and(
              eq(users.companyId, session.companyId),
              ne(users.id, id),
              eq(scopeColumn, scopeValue),
              isNull(users.deletedAt)
            )
          )
          .limit(6)
      : []

  return (
    <PersonProfileClient
      stats={{
        attendancePct,
        shiftsThisMonth: shiftRows.length,
        activeProjects: projectRows.length,
      }}
      upcomingShifts={upcomingShifts}
      colleagues={colleagueRows.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        initials: `${c.firstName.charAt(0)}${c.lastName.charAt(0)}`.toUpperCase(),
        avatarUrl: c.avatarUrl ?? null,
        status: c.presenceStatus ?? "offline",
      }))}
      recentActivity={activityRows.map((a) => ({
        id: a.id,
        action: a.action,
        entityType: a.entityType ?? null,
        createdAt: a.createdAt.toISOString(),
      }))}
      person={{
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        fullName: `${person.firstName} ${person.lastName}`,
        email: person.email,
        phone: person.phone ?? null,
        jobTitle: person.jobTitle ?? null,
        avatarUrl: person.avatarUrl ?? null,
        bio: person.bio ?? null,
        role: person.role,
        memberSince: person.createdAt.toISOString(),
      }}
      presence={
        presence
          ? {
              status: presence.status,
              statusMessage: presence.statusMessage ?? null,
              isManualOverride: presence.isManualOverride,
              manualOverrideExpiresAt: presence.manualOverrideExpiresAt?.toISOString() ?? null,
              lastSeenAt: presence.lastSeenAt.toISOString(),
            }
          : {
              status: "offline",
              statusMessage: null,
              isManualOverride: false,
              manualOverrideExpiresAt: null,
              lastSeenAt: null,
            }
      }
      socialProfiles={socialRows.filter((s) => s.isPublic)}
      companyId={session.companyId}
      isOwnProfile={id === session.userId}
    />
  )
}
