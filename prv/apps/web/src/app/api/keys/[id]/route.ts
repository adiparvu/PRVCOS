import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db } from "@prv/db"
import { apiKeys } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import type { GateContext } from "@prv/auth"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function makeHandler(
  config: Parameters<typeof withGates>[0],
  handler: (
    req: NextRequest,
    ctx: GateContext,
    params: Record<string, string>
  ) => Promise<NextResponse>
) {
  return (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) =>
    withGates(config, async (r, ctx) => {
      const p = await params
      return handler(r as NextRequest, ctx, p)
    })(req)
}

export const DELETE = makeHandler(
  { action: "api_keys.revoke", endpointClass: "api_write" },
  async (_req, ctx, { id }) => {
    const now = new Date()

    const result = await db
      .update(apiKeys)
      .set({ isActive: false, revokedAt: now, updatedAt: now })
      .where(
        and(eq(apiKeys.id, id!), eq(apiKeys.userId, ctx.session.userId), eq(apiKeys.isActive, true))
      )
      .returning({ id: apiKeys.id })

    if (result.length === 0) {
      return NextResponse.json({ error: "API key not found or already revoked" }, { status: 404 })
    }

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "api_keys.revoke",
      entityType: "api_key",
      entityId: id,
      method: "DELETE",
      path: `/api/keys/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ ok: true })
  }
)

// ─── PATCH /api/keys/[id] ─────────────────────────────────────────────────────

const keyPatchSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    scopes: z.array(z.string()).optional(),
    expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .refine((d) => d.name !== undefined || d.scopes !== undefined || d.expiresAt !== undefined, {
    message: "At least one field required",
  })

export const PATCH = makeHandler(
  { action: "api_keys.update", endpointClass: "api_write" },
  async (req, ctx, { id }) => {
    const raw = await (req as NextRequest).json().catch(() => ({}))
    const parsed = keyPatchSchema.safeParse(raw)
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )

    const [existing] = await db
      .select({ id: apiKeys.id })
      .from(apiKeys)
      .where(
        and(eq(apiKeys.id, id!), eq(apiKeys.userId, ctx.session.userId), eq(apiKeys.isActive, true))
      )
      .limit(1)

    if (!existing)
      return NextResponse.json({ error: "API key not found or revoked" }, { status: 404 })

    const d = parsed.data
    const [updated] = await db
      .update(apiKeys)
      .set({
        ...(d.name !== undefined && { name: d.name }),
        ...(d.scopes !== undefined && { scopes: d.scopes }),
        ...(d.expiresAt !== undefined && {
          expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
        }),
        updatedAt: new Date(),
      })
      .where(and(eq(apiKeys.id, id!), eq(apiKeys.userId, ctx.session.userId)))
      .returning({ id: apiKeys.id, name: apiKeys.name })

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "api_keys.update",
      entityType: "api_key",
      entityId: id,
      method: "PATCH",
      path: `/api/keys/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      payload: { changes: d },
    })

    return NextResponse.json(updated)
  }
)
