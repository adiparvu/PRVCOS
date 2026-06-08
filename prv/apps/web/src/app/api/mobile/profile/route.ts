import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { users, companies } from "@prv/db/schema"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// GET /api/mobile/profile — authenticated user's profile + company.
export const GET = withMobileAuth(async (_req: NextRequest, ctx) => {
  const [userRow] = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
      jobTitle: users.jobTitle,
      role: users.role,
      avatarUrl: users.avatarUrl,
      locale: users.locale,
      timezone: users.timezone,
      createdAt: users.createdAt,
      mfaEnabled: users.mfaEnabled,
      companyId: users.companyId,
      companyName: companies.name,
    })
    .from(users)
    .innerJoin(companies, eq(companies.id, users.companyId))
    .where(eq(users.id, ctx.userId))
    .limit(1)

  if (!userRow) {
    return NextResponse.json({ error: "User not found.", code: "NOT_FOUND" }, { status: 404 })
  }

  return NextResponse.json({
    userId: userRow.id,
    firstName: userRow.firstName,
    lastName: userRow.lastName,
    email: userRow.email,
    phone: userRow.phone ?? null,
    jobTitle: userRow.jobTitle ?? null,
    role: userRow.role,
    avatarUrl: userRow.avatarUrl ?? null,
    locale: userRow.locale,
    timezone: userRow.timezone,
    memberSince: userRow.createdAt.toISOString(),
    mfaEnabled: userRow.mfaEnabled,
    company: {
      id: userRow.companyId,
      name: userRow.companyName,
    },
  })
})
