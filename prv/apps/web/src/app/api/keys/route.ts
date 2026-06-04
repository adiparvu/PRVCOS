import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and, isNull } from "drizzle-orm"
import { randomBytes, createHash } from "crypto"
import { db } from "@prv/db"
import { apiKeys } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const createSchema = z.object({
  name: z.string().min(1).max(255),
  scopes: z.array(z.string()).min(1, "At least one scope is required"),
  expiresAt: z.string().datetime().optional(),
})

// POST /api/keys — create a new API key (raw key shown exactly once)
export const POST = withGates(
  { action: "api_keys.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    // prv_ prefix + 32 random bytes as base64url ≈ 47 chars total
    const rawKey = "prv_" + randomBytes(32).toString("base64url")
    const keyHash = createHash("sha256").update(rawKey).digest("hex")
    const keyPrefix = rawKey.slice(0, 12)

    const [key] = await db
      .insert(apiKeys)
      .values({
        userId: ctx.session.userId,
        companyId: ctx.session.companyId,
        name: parsed.data.name,
        keyHash,
        keyPrefix,
        scopes: parsed.data.scopes,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
      })
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        scopes: apiKeys.scopes,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
      })

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "api_keys.create",
      entityType: "api_key",
      entityId: key!.id,
      payload: { name: parsed.data.name, scopes: parsed.data.scopes },
      method: "POST",
      path: "/api/keys",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    // key (raw) returned exactly once — not stored, cannot be recovered
    return NextResponse.json({ ...key, key: rawKey }, { status: 201 })
  }
)

// GET /api/keys — list the authenticated user's API keys (prefix only, no hash)
export const GET = withGates(
  { action: "api_keys.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        scopes: apiKeys.scopes,
        isActive: apiKeys.isActive,
        expiresAt: apiKeys.expiresAt,
        lastUsedAt: apiKeys.lastUsedAt,
        revokedAt: apiKeys.revokedAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.userId, ctx.session.userId),
          eq(apiKeys.isActive, true),
          isNull(apiKeys.revokedAt)
        )
      )
      .orderBy(apiKeys.createdAt)

    return NextResponse.json({ keys: rows })
  }
)
