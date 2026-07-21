import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { clients } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import { eq, and, isNull, desc, or, ilike } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withMobileAuth(async (req: NextRequest, ctx) => {
  const { searchParams } = req.nextUrl
  const status = searchParams.get("status") ?? undefined
  const q = searchParams.get("q")?.trim() ?? undefined

  const conditions = [eq(clients.companyId, ctx.companyId), isNull(clients.deletedAt)]
  if (status && ["active", "prospect", "inactive", "archived"].includes(status)) {
    conditions.push(eq(clients.status, status as "active" | "prospect" | "inactive" | "archived"))
  }

  const rows = await db
    .select({
      id: clients.id,
      name: clients.name,
      type: clients.type,
      status: clients.status,
      email: clients.email,
      phone: clients.phone,
      city: clients.city,
      vatNumber: clients.vatNumber,
      createdAt: clients.createdAt,
    })
    .from(clients)
    .where(
      q
        ? and(...conditions, or(ilike(clients.name, `%${q}%`), ilike(clients.email, `%${q}%`)))
        : and(...conditions)
    )
    .orderBy(desc(clients.createdAt))
    .limit(100)

  return NextResponse.json({ clients: rows })
})

const bodySchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(["business", "individual"]).default("business"),
  email: z.string().email().max(254).optional(),
  phone: z.string().max(32).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  vatNumber: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
})

export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
  const ipAddress =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { name, type, email, phone, address, city, vatNumber, notes } = parsed.data

  const [client] = await db
    .insert(clients)
    .values({
      companyId: ctx.companyId,
      assignedUserId: ctx.userId,
      type,
      status: "prospect",
      name,
      email: email ?? null,
      phone: phone ?? null,
      address: address ?? null,
      city: city ?? null,
      vatNumber: vatNumber ?? null,
      notes: notes ?? null,
      country: "RO",
    })
    .returning({ id: clients.id, name: clients.name, type: clients.type, status: clients.status })

  if (!client) {
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 })
  }

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "mobile.client.create",
    entityType: "client",
    entityId: client.id,
    method: "POST",
    path: "/api/mobile/clients",
    ipAddress,
    userAgent: req.headers.get("user-agent") ?? "",
  })

  return NextResponse.json(
    {
      id: client.id,
      name: client.name,
      type: client.type,
      status: client.status,
    },
    { status: 201 }
  )
})
