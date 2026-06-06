import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and, isNull } from "drizzle-orm"
import { db } from "@prv/db"
import { companies } from "@prv/db/schema"
import { writeAuditLog, RoleSets, hasScope } from "@prv/auth"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function getCompanyId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-1)!
}

// ─── GET /api/companies/[id] ──────────────────────────────────────────────────

export const GET = withGates(
  {
    action: "companies.read",
    endpointClass: "api_read",
    requiredRoles: RoleSets.management,
    requiredScope: "SCOPE_COMPANY",
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = getCompanyId(req)

    // Non-group-level users can only read their own company
    if (!hasScope(ctx.session.scopeLevel, "SCOPE_GROUP") && id !== ctx.session.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const [company] = await db
      .select()
      .from(companies)
      .where(and(eq(companies.id, id), eq(companies.isActive, true), isNull(companies.deletedAt)))
      .limit(1)

    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 })

    return NextResponse.json(company)
  }
)

// ─── PATCH /api/companies/[id] ────────────────────────────────────────────────

const patchCompanySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers and hyphens")
    .optional(),
  type: z.enum(["renovations", "projects", "shop", "services", "other"]).optional(),
  status: z.enum(["active", "suspended", "onboarding", "churned"]).optional(),
  country: z.string().length(2).optional(),
  region: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  address: z.string().optional(),
  postalCode: z.string().max(20).optional(),
  email: z.string().email().max(254).optional(),
  phone: z.string().max(32).optional(),
  website: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  coverUrl: z.string().url().optional(),
  vatNumber: z.string().max(50).optional(),
  registrationNumber: z.string().max(50).optional(),
  settings: z.record(z.unknown()).optional(),
})

export const PATCH = withGates(
  {
    action: "companies.update",
    endpointClass: "api_write",
    requiredRoles: RoleSets.admin,
    requiredScope: "SCOPE_COMPANY",
    requireMfa: true,
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = getCompanyId(req)

    // Only the company itself (or group-level admins) can update
    if (!hasScope(ctx.session.scopeLevel, "SCOPE_GROUP") && id !== ctx.session.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const [existing] = await db
      .select({ id: companies.id, slug: companies.slug })
      .from(companies)
      .where(and(eq(companies.id, id), eq(companies.isActive, true), isNull(companies.deletedAt)))
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Company not found" }, { status: 404 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchCompanySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const { slug, ...rest } = parsed.data

    // Slug change: verify uniqueness
    if (slug && slug !== existing.slug) {
      const [conflict] = await db
        .select({ id: companies.id })
        .from(companies)
        .where(eq(companies.slug, slug))
        .limit(1)

      if (conflict) {
        return NextResponse.json(
          { error: "Slug already taken", code: "SLUG_CONFLICT" },
          { status: 409 }
        )
      }
    }

    const [updated] = await db
      .update(companies)
      .set({ ...rest, ...(slug ? { slug } : {}), updatedAt: new Date() })
      .where(eq(companies.id, id))
      .returning({ id: companies.id, name: companies.name, slug: companies.slug })

    void writeAuditLog({
      companyId: id,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "companies.update",
      entityType: "company",
      entityId: id,
      payload: parsed.data,
      method: "PATCH",
      path: `/api/companies/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)

// ─── DELETE /api/companies/[id] ───────────────────────────────────────────────
// Soft-delete: sets isActive=false, deletedAt=now. Requires re-auth.

export const DELETE = withGates(
  {
    action: "companies.suspend",
    endpointClass: "api_write",
    requiredRoles: RoleSets.admin,
    requiredScope: "SCOPE_PLATFORM",
    requireMfa: true,
    requireReauth: true,
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = getCompanyId(req)

    const [existing] = await db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(and(eq(companies.id, id), eq(companies.isActive, true), isNull(companies.deletedAt)))
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Company not found" }, { status: 404 })

    await db
      .update(companies)
      .set({ isActive: false, deletedAt: new Date(), status: "churned", updatedAt: new Date() })
      .where(eq(companies.id, id))

    void writeAuditLog({
      companyId: id,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "companies.suspend",
      entityType: "company",
      entityId: id,
      payload: { name: existing.name },
      method: "DELETE",
      path: `/api/companies/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
