import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { and, eq, desc } from "drizzle-orm"
import { db } from "@prv/db"
import { userFavorites } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import type { GateContext } from "@prv/auth"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface FavoriteSummary {
  id: string
  entityType: string
  entityId: string
  label: string
  href: string
  createdAt: string
}

// GET /api/favorites — the current user's favorites (device-synced), newest
// first. Scoped to (company, user); a user only ever sees their own.
export const GET = withGates(
  { action: "favorites.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = await db
      .select({
        id: userFavorites.id,
        entityType: userFavorites.entityType,
        entityId: userFavorites.entityId,
        label: userFavorites.label,
        href: userFavorites.href,
        createdAt: userFavorites.createdAt,
      })
      .from(userFavorites)
      .where(
        and(
          eq(userFavorites.companyId, ctx.session.companyId),
          eq(userFavorites.userId, ctx.session.userId)
        )
      )
      .orderBy(desc(userFavorites.createdAt))
      .limit(200)

    const favorites: FavoriteSummary[] = rows.map((r) => ({
      id: r.id,
      entityType: r.entityType,
      entityId: r.entityId,
      label: r.label,
      href: r.href,
      createdAt: r.createdAt.toISOString(),
    }))

    return NextResponse.json({ favorites })
  }
)

// POST /api/favorites — favorite an entity. Idempotent: re-favoriting an entity
// the user already has returns the existing row (200) rather than erroring.
const postSchema = z.object({
  entityType: z.string().min(1).max(48),
  entityId: z.string().min(1).max(128),
  label: z.string().min(1).max(200),
  href: z.string().min(1).max(512),
})

export const POST = withGates(
  { action: "favorites.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = postSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const { entityType, entityId, label, href } = parsed.data

    const [existing] = await db
      .select({ id: userFavorites.id })
      .from(userFavorites)
      .where(
        and(
          eq(userFavorites.userId, ctx.session.userId),
          eq(userFavorites.entityType, entityType),
          eq(userFavorites.entityId, entityId)
        )
      )
      .limit(1)

    if (existing) {
      return NextResponse.json({ favorite: { id: existing.id, alreadyFavorited: true } })
    }

    const [created] = await db
      .insert(userFavorites)
      .values({
        companyId: ctx.session.companyId,
        userId: ctx.session.userId,
        entityType,
        entityId,
        label,
        href,
      })
      .returning({ id: userFavorites.id })

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "favorites.create",
      entityType: "user_favorite",
      entityId: created?.id ?? entityId,
      payload: { entityType, entityId },
      method: "POST",
      path: "/api/favorites",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(
      { favorite: { id: created?.id, alreadyFavorited: false } },
      { status: 201 }
    )
  }
)

// DELETE /api/favorites?entityType=&entityId= — unfavorite. Only ever removes
// the caller's own row (user-scoped where clause).
export const DELETE = withGates(
  { action: "favorites.delete", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const sp = req.nextUrl.searchParams
    const entityType = sp.get("entityType")
    const entityId = sp.get("entityId")
    if (!entityType || !entityId) {
      return NextResponse.json({ error: "entityType and entityId are required" }, { status: 400 })
    }

    const deleted = await db
      .delete(userFavorites)
      .where(
        and(
          eq(userFavorites.userId, ctx.session.userId),
          eq(userFavorites.entityType, entityType),
          eq(userFavorites.entityId, entityId)
        )
      )
      .returning({ id: userFavorites.id })

    if (deleted.length > 0) {
      void writeAuditLog({
        companyId: ctx.session.companyId,
        actorId: ctx.session.userId,
        sessionId: ctx.session.sessionId,
        action: "favorites.delete",
        entityType: "user_favorite",
        entityId: deleted[0]!.id,
        payload: { entityType, entityId },
        method: "DELETE",
        path: "/api/favorites",
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      })
    }

    return NextResponse.json({ removed: deleted.length })
  }
)
