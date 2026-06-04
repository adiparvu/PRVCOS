import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@prv/db"
import { userPreferences, DEFAULT_APPEARANCE } from "@prv/db/schema"
import { getSession } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const updateSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  glassStyle: z.enum(["translucid", "tinted", "adaptive"]).optional(),
  syncEnabled: z.boolean().optional(),
})

function extractSessionId(req: NextRequest): string | null {
  const cookie = req.cookies.get("prv_session")?.value
  if (cookie) return cookie
  const auth = req.headers.get("authorization")
  if (auth?.startsWith("Bearer ")) return auth.slice(7)
  return null
}

// GET /api/preferences — return current user's appearance preferences
export async function GET(req: NextRequest) {
  const sid = extractSessionId(req)
  if (!sid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let session
  try {
    session = await getSession(sid)
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rows = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.userId))
    .limit(1)

  if (rows.length === 0) {
    return NextResponse.json(DEFAULT_APPEARANCE)
  }

  const { theme, glassStyle, syncEnabled } = rows[0]!
  return NextResponse.json({ theme, glassStyle, syncEnabled })
}

// PATCH /api/preferences — update current user's appearance preferences
export async function PATCH(req: NextRequest) {
  const sid = extractSessionId(req)
  if (!sid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let session
  try {
    session = await getSession(sid)
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 422 }
    )
  }

  const patch = parsed.data
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 })
  }

  await db
    .insert(userPreferences)
    .values({
      userId: session.userId,
      theme: patch.theme ?? DEFAULT_APPEARANCE.theme,
      glassStyle: patch.glassStyle ?? DEFAULT_APPEARANCE.glassStyle,
      syncEnabled: patch.syncEnabled ?? DEFAULT_APPEARANCE.syncEnabled,
      syncedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: {
        ...(patch.theme !== undefined ? { theme: patch.theme } : {}),
        ...(patch.glassStyle !== undefined ? { glassStyle: patch.glassStyle } : {}),
        ...(patch.syncEnabled !== undefined ? { syncEnabled: patch.syncEnabled } : {}),
        updatedAt: new Date(),
        syncedAt: new Date(),
      },
    })

  // fire-and-forget audit
  void writeAuditLog({
    companyId: session.companyId,
    actorId: session.userId,
    sessionId: session.sessionId,
    action: "user.preferences.update",
    entityType: "user_preferences",
    entityId: session.userId,
    payload: patch,
    method: "PATCH",
    path: "/api/preferences",
    ipAddress:
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  })

  return NextResponse.json({ ok: true })
}
