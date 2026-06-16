import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { clientContacts, clients } from "@prv/db/schema"
import { and, asc, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function clientId(req: NextRequest) {
  const parts = req.nextUrl.pathname.split("/")
  return parts.at(-2) ?? ""
}

async function resolveClient(id: string, companyId: string) {
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(
      and(eq(clients.id, id), eq(clients.companyId, companyId), isNull(clients.deletedAt))
    )
    .limit(1)
  return client ?? null
}

// ── GET /api/crm/clients/[id]/contacts ───────────────────────────────────────

export const GET = withGates(
  { action: "crm.clients.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const cid = clientId(req)

    if (!(await resolveClient(cid, companyId)))
      return NextResponse.json({ error: "Client not found" }, { status: 404 })

    const contacts = await db
      .select()
      .from(clientContacts)
      .where(
        and(eq(clientContacts.clientId, cid), eq(clientContacts.companyId, companyId))
      )
      .orderBy(asc(clientContacts.isPrimary), asc(clientContacts.lastName))

    return NextResponse.json({ contacts })
  }
)

// ── POST /api/crm/clients/[id]/contacts ──────────────────────────────────────

const createSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  jobTitle: z.string().max(255).nullable().optional(),
  email: z.string().email().max(254).nullable().optional(),
  phone: z.string().max(32).nullable().optional(),
  isPrimary: z.boolean().optional(),
})

export const POST = withGates(
  { action: "crm.clients.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId, sessionId } = ctx.session
    const cid = clientId(req)

    if (!(await resolveClient(cid, companyId)))
      return NextResponse.json({ error: "Client not found" }, { status: 404 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = createSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )

    // If marking as primary, demote existing primary first
    if (parsed.data.isPrimary) {
      await db
        .update(clientContacts)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(
          and(
            eq(clientContacts.clientId, cid),
            eq(clientContacts.companyId, companyId),
            eq(clientContacts.isPrimary, true)
          )
        )
    }

    const [contact] = await db
      .insert(clientContacts)
      .values({ clientId: cid, companyId, ...parsed.data })
      .returning({ id: clientContacts.id, firstName: clientContacts.firstName, lastName: clientContacts.lastName })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "crm.contacts.create",
      entityType: "client_contact",
      entityId: contact!.id,
      payload: { clientId: cid, ...parsed.data },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(contact, { status: 201 })
  }
)
