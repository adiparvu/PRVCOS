import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db } from "@prv/db"
import { companySettings } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import { cacheMemo, cacheDel, CacheTTL } from "@prv/cache"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Cache key: company_settings:<companyId>:<module>
function settingsCacheKey(companyId: string, module: string): string {
  return `${companyId}:${module}`
}

// GET /api/companies/[id]/settings?module=<module>
// Returns all settings for a given module, Redis-cached for 5 minutes.
export const GET = withGates(
  { action: "companies.settings.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url)
    const module = searchParams.get("module")

    // Extract company id from URL path
    const segments = req.nextUrl.pathname.split("/")
    const companyId = segments[segments.indexOf("companies") + 1]

    if (!companyId) {
      return NextResponse.json({ error: "Missing company id" }, { status: 400 })
    }
    if (companyId !== ctx.session.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (!module) {
      return NextResponse.json({ error: "?module is required" }, { status: 400 })
    }

    const rows = await cacheMemo(
      "company_settings",
      settingsCacheKey(companyId, module),
      () =>
        db
          .select({
            key: companySettings.key,
            value: companySettings.value,
            updatedAt: companySettings.updatedAt,
          })
          .from(companySettings)
          .where(and(eq(companySettings.companyId, companyId), eq(companySettings.module, module))),
      { ttl: CacheTTL.COMPANY_CONTEXT }
    )

    return NextResponse.json({ module, settings: rows })
  }
)

const upsertSchema = z.object({
  module: z.string().min(1).max(100),
  key: z.string().min(1).max(255),
  value: z.unknown(),
})

// PUT /api/companies/[id]/settings — upsert a single setting, invalidate cache
export const PUT = withGates(
  {
    action: "companies.settings.write",
    endpointClass: "api_write",
    requiredScope: "SCOPE_COMPANY",
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const segments = req.nextUrl.pathname.split("/")
    const companyId = segments[segments.indexOf("companies") + 1]

    if (!companyId) {
      return NextResponse.json({ error: "Missing company id" }, { status: 400 })
    }
    if (companyId !== ctx.session.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = upsertSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const now = new Date()
    const [row] = await db
      .insert(companySettings)
      .values({
        companyId,
        module: parsed.data.module,
        key: parsed.data.key,
        value: parsed.data.value as Record<string, unknown>,
        setBy: ctx.session.userId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [companySettings.companyId, companySettings.module, companySettings.key],
        set: {
          value: parsed.data.value as Record<string, unknown>,
          setBy: ctx.session.userId,
          updatedAt: now,
        },
      })
      .returning({ id: companySettings.id, key: companySettings.key })

    // Invalidate the Redis cache for this module
    await cacheDel("company_settings", settingsCacheKey(companyId, parsed.data.module))

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "companies.settings.write",
      entityType: "company_setting",
      entityId: row!.id,
      payload: { module: parsed.data.module, key: parsed.data.key },
      method: "PUT",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: row!.id, key: row!.key })
  }
)
