import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import {
  users,
  departments,
  teams,
  stores,
  projects,
  projectMembers,
  notifications,
} from "@prv/db/schema"
import { eq, and, isNull, desc, notInArray } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withMobileAuth(async (req: NextRequest, ctx) => {
  const employeeId = req.nextUrl.pathname.split("/").pop() ?? ""
  if (!employeeId) {
    return NextResponse.json({ error: "Missing employee ID" }, { status: 400 })
  }

  const [userRow] = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
      avatarUrl: users.avatarUrl,
      bio: users.bio,
      employeeId: users.employeeId,
      jobTitle: users.jobTitle,
      role: users.role,
      scopeLevel: users.scopeLevel,
      status: users.status,
      securityLevel: users.securityLevel,
      mfaEnabled: users.mfaEnabled,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      departmentId: users.departmentId,
      teamId: users.teamId,
      storeId: users.storeId,
      managerId: users.managerId,
    })
    .from(users)
    .where(
      and(eq(users.id, employeeId), eq(users.companyId, ctx.companyId), isNull(users.deletedAt))
    )
    .limit(1)

  if (!userRow) {
    return NextResponse.json({ error: "Employee not found", code: "NOT_FOUND" }, { status: 404 })
  }

  const [deptRow, teamRow, storeRow, managerRow, directReports, memberProjects, activityRows] =
    await Promise.all([
      userRow.departmentId
        ? db
            .select({ name: departments.name })
            .from(departments)
            .where(eq(departments.id, userRow.departmentId))
            .limit(1)
        : Promise.resolve([]),

      userRow.teamId
        ? db.select({ name: teams.name }).from(teams).where(eq(teams.id, userRow.teamId)).limit(1)
        : Promise.resolve([]),

      userRow.storeId
        ? db
            .select({ name: stores.name, city: stores.city })
            .from(stores)
            .where(eq(stores.id, userRow.storeId))
            .limit(1)
        : Promise.resolve([]),

      userRow.managerId
        ? db
            .select({
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              jobTitle: users.jobTitle,
            })
            .from(users)
            .where(and(eq(users.id, userRow.managerId), isNull(users.deletedAt)))
            .limit(1)
        : Promise.resolve([]),

      db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          jobTitle: users.jobTitle,
          role: users.role,
          lastLoginAt: users.lastLoginAt,
        })
        .from(users)
        .where(
          and(
            eq(users.managerId, employeeId),
            eq(users.companyId, ctx.companyId),
            isNull(users.deletedAt),
            eq(users.isActive, true)
          )
        )
        .orderBy(users.firstName)
        .limit(10),

      db
        .select({
          projectId: projects.id,
          projectName: projects.name,
          projectStatus: projects.status,
          memberRole: projectMembers.role,
          progress: projects.metadata,
          dueDate: projects.dueDate,
        })
        .from(projectMembers)
        .innerJoin(projects, eq(projectMembers.projectId, projects.id))
        .where(
          and(
            eq(projectMembers.userId, employeeId),
            eq(projects.companyId, ctx.companyId),
            isNull(projects.deletedAt),
            notInArray(projects.status, ["completed", "cancelled", "archived"])
          )
        )
        .orderBy(projects.name)
        .limit(8),

      db
        .select({
          id: notifications.id,
          title: notifications.title,
          body: notifications.body,
          type: notifications.type,
          entityType: notifications.entityType,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .where(
          and(eq(notifications.userId, employeeId), eq(notifications.companyId, ctx.companyId))
        )
        .orderBy(desc(notifications.createdAt))
        .limit(8),
    ])

  const now = new Date()

  return NextResponse.json({
    employee: {
      id: userRow.id,
      firstName: userRow.firstName,
      lastName: userRow.lastName,
      fullName: `${userRow.firstName} ${userRow.lastName}`,
      email: userRow.email,
      phone: userRow.phone ?? null,
      avatarUrl: userRow.avatarUrl ?? null,
      bio: userRow.bio ?? null,
      employeeId: userRow.employeeId ?? null,
      jobTitle: userRow.jobTitle ?? null,
      role: userRow.role,
      scopeLevel: userRow.scopeLevel,
      status: userRow.status,
      securityLevel: userRow.securityLevel,
      mfaEnabled: userRow.mfaEnabled,
      isActive: userRow.isActive,
      lastLoginAt: userRow.lastLoginAt ?? null,
      joinedAt: userRow.createdAt,
      isOnline: userRow.lastLoginAt
        ? now.getTime() - new Date(userRow.lastLoginAt).getTime() < 15 * 60 * 1000
        : false,
    },
    employment: {
      departmentName: deptRow[0]?.name ?? null,
      teamName: teamRow[0]?.name ?? null,
      storeId: userRow.storeId ?? null,
      storeName: storeRow[0]
        ? storeRow[0].city
          ? `${storeRow[0].name} — ${storeRow[0].city}`
          : storeRow[0].name
        : null,
      manager: managerRow[0]
        ? {
            id: userRow.managerId!,
            name: `${managerRow[0].firstName} ${managerRow[0].lastName}`,
            jobTitle: managerRow[0].jobTitle ?? null,
          }
        : null,
    },
    directReports: directReports.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      jobTitle: u.jobTitle ?? null,
      role: u.role,
      isOnline: u.lastLoginAt
        ? now.getTime() - new Date(u.lastLoginAt).getTime() < 15 * 60 * 1000
        : false,
    })),
    projects: memberProjects.map((p) => ({
      id: p.projectId,
      name: p.projectName,
      status: p.projectStatus,
      role: p.memberRole,
      dueDate: p.dueDate ?? null,
    })),
    activity: activityRows.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body ?? null,
      type: n.type,
      entityType: n.entityType ?? null,
      createdAt: n.createdAt,
    })),
  })
})

// ─── PATCH /api/mobile/employees/[id] ────────────────────────────────────────

const employeePatchSchema = z
  .object({
    status: z.enum(["active", "inactive", "suspended", "onboarding", "offboarded"]).optional(),
    jobTitle: z.string().max(255).optional(),
    departmentId: z.string().uuid().nullable().optional(),
    teamId: z.string().uuid().nullable().optional(),
    storeId: z.string().uuid().nullable().optional(),
    phone: z.string().max(32).optional(),
  })
  .refine(
    (d) =>
      d.status !== undefined ||
      d.jobTitle !== undefined ||
      d.departmentId !== undefined ||
      d.teamId !== undefined ||
      d.storeId !== undefined ||
      d.phone !== undefined,
    { message: "At least one field required" }
  )

export const PATCH = withMobileAuth(async (req: NextRequest, ctx) => {
  const ipAddress =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"

  const employeeId = req.nextUrl.pathname.split("/").pop() ?? ""
  if (!employeeId) return NextResponse.json({ error: "Missing employee ID" }, { status: 400 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = employeePatchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const [existing] = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(and(eq(users.id, employeeId), eq(users.companyId, ctx.companyId)))
    .limit(1)
  if (!existing) return NextResponse.json({ error: "Employee not found" }, { status: 404 })

  const d = parsed.data
  const [updated] = await db
    .update(users)
    .set({
      ...(d.status !== undefined && { status: d.status }),
      ...(d.jobTitle !== undefined && { jobTitle: d.jobTitle }),
      ...(d.departmentId !== undefined && { departmentId: d.departmentId }),
      ...(d.teamId !== undefined && { teamId: d.teamId }),
      ...(d.storeId !== undefined && { storeId: d.storeId }),
      ...(d.phone !== undefined && { phone: d.phone }),
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, employeeId), eq(users.companyId, ctx.companyId)))
    .returning({ id: users.id, status: users.status })

  if (!updated) return NextResponse.json({ error: "Failed to update employee" }, { status: 500 })

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "people.update",
    entityType: "user",
    entityId: employeeId,
    payload: { name: `${existing.firstName} ${existing.lastName}`, changes: d },
    method: "PATCH",
    path: `/api/mobile/employees/${employeeId}`,
    ipAddress,
    userAgent: req.headers.get("user-agent") ?? undefined,
  })

  return NextResponse.json(updated)
})
