import { NextRequest, NextResponse } from "next/server"
import { db } from "@prv/db"
import { companies, clients } from "@prv/db/schema"
import { eq } from "drizzle-orm"
import { checkRateLimit } from "@prv/cache"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Public quote-request / contact form (Phase 23.1). Unauthenticated: a visitor
// on a company's public site submits their details, which land as a new lead
// (a prospect client) in that company's CRM. The company is addressed by its
// public slug; at least one contact channel is required.
const bodySchema = z
  .object({
    companySlug: z.string().min(1).max(100),
    name: z.string().min(1).max(255),
    email: z.string().email().max(254).optional(),
    phone: z.string().max(32).optional(),
    message: z.string().max(2000).optional(),
    source: z.string().max(60).optional(),
  })
  .refine((d) => !!d.email || !!d.phone, {
    message: "Provide an email or a phone number",
  })

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const rl = await checkRateLimit("public", `public_lead:${ip}`)
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    )
  }

  const raw = await req.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid submission", issues: parsed.error.issues },
      { status: 422 }
    )
  }
  const { companySlug, name, email, phone, message, source } = parsed.data

  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.slug, companySlug))
    .limit(1)
  if (!company) return NextResponse.json({ error: "Unknown company" }, { status: 404 })

  const [inserted] = await db
    .insert(clients)
    .values({
      companyId: company.id,
      name,
      email: email ?? null,
      phone: phone ?? null,
      notes: message ?? null,
      status: "prospect",
      metadata: {
        stage: "new",
        score: 0,
        source: source ?? "website",
        ...(message ? { message } : {}),
        capturedVia: "public_form",
      },
    })
    .returning({ id: clients.id })

  if (!inserted) return NextResponse.json({ error: "Could not submit" }, { status: 500 })

  // Deliberately do not echo the created lead id to an unauthenticated caller.
  return NextResponse.json({ ok: true }, { status: 201 })
}
