import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and, ilike, or, asc, gt } from "drizzle-orm"
import { db } from "@prv/db"
import { users, userPresence } from "@prv/db/schema"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAX_PAGE_SIZE = 100

// GET /api/people — paginated company member directory
// Query: ?limit=50&cursor=uuid&search=jane&status=online
export const GET = withGates(
  { action: "presence.view_team", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = req.nextUrl
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? "100", 10) || MAX_PAGE_SIZE,
      MAX_PAGE_SIZE
    )
    const cursor = searchParams.get("cursor")
    const search = searchParams.get("search")?.trim()
    const statusFilter = searchParams.get("status")

    const conditions = [eq(users.companyId, ctx.session.companyId), eq(users.isActive, true)]

    if (search) {
      conditions.push(
        or(
          ilike(users.firstName, `%${search}%`),
          ilike(users.lastName, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(users.jobTitle, `%${search}%`)
        ) as ReturnType<typeof eq>
      )
    }

    if (cursor) {
      conditions.push(gt(users.id, cursor))
    }

    const rows = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        jobTitle: users.jobTitle,
        avatarUrl: users.avatarUrl,
        role: users.role,
        departmentId: users.departmentId,
        teamId: users.teamId,
        managerId: users.managerId,
        // Presence (left join — may be null)
        presenceStatus: userPresence.status,
        presenceMessage: userPresence.statusMessage,
        presenceLastSeen: userPresence.lastSeenAt,
      })
      .from(users)
      .leftJoin(userPresence, eq(users.id, userPresence.userId))
      .where(and(...conditions))
      .orderBy(asc(users.firstName), asc(users.lastName))
      .limit(limit + 1) // fetch one extra to detect next page

    const hasMore = rows.length > limit
    const members = rows.slice(0, limit)

    // Filter by status after join (simpler than adding join condition)
    const filtered = statusFilter
      ? members.filter((m) => (m.presenceStatus ?? "offline") === statusFilter)
      : members

    const nextCursor = hasMore ? (members[members.length - 1]?.id ?? null) : null

    return NextResponse.json({
      members: filtered.map((m) => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        fullName: `${m.firstName} ${m.lastName}`,
        email: m.email,
        phone: m.phone,
        jobTitle: m.jobTitle,
        avatarUrl: m.avatarUrl,
        role: m.role,
        managerId: m.managerId ?? null,
        presence: {
          status: m.presenceStatus ?? "offline",
          statusMessage: m.presenceMessage ?? null,
          lastSeenAt: m.presenceLastSeen?.toISOString() ?? null,
        },
      })),
      count: filtered.length,
      nextCursor,
    })
  }
)
