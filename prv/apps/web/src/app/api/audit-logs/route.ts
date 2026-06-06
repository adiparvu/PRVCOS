import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and, desc, lt, ilike, or } from "drizzle-orm"
import { db } from "@prv/db"
import { auditLogs } from "@prv/db/schema"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const PAGE_SIZE = 50

const querySchema = z.object({
  actorId: z.string().uuid().optional(),
  action: z.string().max(100).optional(),
  entityType: z.string().max(100).optional(),
  entityId: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  cursor: z.string().optional(),
})

// GET /api/audit-logs — paginated, scoped audit feed (company-wide or filtered)
export const GET = withGates(
  {
    action: "audit_logs.read",
    endpointClass: "api_read",
    requiredScope: "SCOPE_COMPANY",
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = req.nextUrl
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams))
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query params" }, { status: 400 })
    }

    const { actorId, action, entityType, entityId, search, cursor } = parsed.data

    const filters = [eq(auditLogs.companyId, ctx.session.companyId)]
    if (actorId) filters.push(eq(auditLogs.actorId, actorId))
    if (action) filters.push(eq(auditLogs.action, action))
    if (entityType) filters.push(eq(auditLogs.entityType, entityType))
    if (entityId) filters.push(eq(auditLogs.entityId, entityId))
    if (search) {
      filters.push(
        or(ilike(auditLogs.action, `%${search}%`), ilike(auditLogs.entityType, `%${search}%`))!
      )
    }
    if (cursor) filters.push(lt(auditLogs.createdAt, new Date(cursor)))

    const rows = await db
      .select({
        id: auditLogs.id,
        actorId: auditLogs.actorId,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        method: auditLogs.method,
        path: auditLogs.path,
        gateFailed: auditLogs.gateFailed,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        payload: auditLogs.payload,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(and(...filters))
      .orderBy(desc(auditLogs.createdAt))
      .limit(PAGE_SIZE + 1)

    const hasMore = rows.length > PAGE_SIZE
    const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows
    const nextCursor =
      hasMore && items.length > 0 ? items[items.length - 1]!.createdAt.toISOString() : null

    return NextResponse.json({ items, nextCursor, hasMore })
  }
)
