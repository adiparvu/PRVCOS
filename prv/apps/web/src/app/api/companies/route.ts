import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@prv/db"
import { companies, companyMemberships } from "@prv/db/schema"
import { writeAuditLog, RoleSets } from "@prv/auth"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const createCompanySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers and hyphens"),
  type: z.enum(["renovations", "projects", "shop", "services", "other"]).default("other"),
  country: z.string().length(2).default("RO"),
  adminRole: z.string().min(1).max(100).default("ceo"),
})

// POST /api/companies — create a company and establish the caller as first admin
export const POST = withGates(
  {
    action: "companies.create",
    endpointClass: "api_write",
    requiredRoles: RoleSets.admin,
    requireMfa: true,
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = createCompanySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    // Guard: slug must be globally unique
    const [existing] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.slug, parsed.data.slug))
      .limit(1)

    if (existing) {
      return NextResponse.json(
        { error: "Slug already taken", code: "SLUG_CONFLICT" },
        { status: 409 }
      )
    }

    const now = new Date()

    const [company] = await db
      .insert(companies)
      .values({
        name: parsed.data.name,
        slug: parsed.data.slug,
        type: parsed.data.type,
        country: parsed.data.country,
      })
      .returning({ id: companies.id, slug: companies.slug, name: companies.name })

    // Create the first-admin membership for the requesting user
    await db.insert(companyMemberships).values({
      companyId: company!.id,
      userId: ctx.session.userId,
      primaryRole: parsed.data.adminRole,
      status: "ACTIVE",
      activatedAt: now,
    })

    void writeAuditLog({
      companyId: company!.id,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "companies.create",
      entityType: "company",
      entityId: company!.id,
      payload: { slug: company!.slug, adminRole: parsed.data.adminRole },
      method: "POST",
      path: "/api/companies",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(company, { status: 201 })
  }
)
