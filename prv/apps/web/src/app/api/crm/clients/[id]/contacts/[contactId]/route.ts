import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { clientContacts, clients } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function ids(req: NextRequest) {
  const parts = req.nextUrl.pathname.split("/")
  return { clientId: parts.at(-3) ?? "", contactId: parts.at(-1) ?? "" }
}

async function resolveContact(clientId: string, contactId: string, companyId: string) {
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.companyId, companyId), isNull(clients.deletedAt)))
    .limit(1)
  if (!client) return null

  const [contact] = await db
    .select()
    .from(clientContacts)
    .where(
      and(
        eq(clientContacts.id, contactId),
        eq(clientContacts.clientId, clientId),
        eq(clientContacts.companyId, companyId)
      )
    )
    .limit(1)

  return contact ?? null
}

// ── GET /api/crm/clients/[id]/contacts/[contactId] ───────────────────────────

export const GET = withGates(
  { action: "crm.clients.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { clientId, contactId } = ids(req)
    const { companyId } = ctx.session
    const contact = await resolveContact(clientId, contactId, companyId)
    if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ contact })
  }
)

// ── PATCH /api/crm/clients/[id]/contacts/[contactId] ─────────────────────────

const patchSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  jobTitle: z.string().max(255).nullable().optional(),
  email: z.string().email().max(254).nullable().optional(),
  phone: z.string().max(32).nullable().optional(),
  isPrimary: z.boolean().optional(),
})

export const PATCH = withGates(
  { action: "crm.clients.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { clientId, contactId } = ids(req)
    const { companyId, userId, sessionId } = ctx.session

    const contact = await resolveContact(clientId, contactId, companyId)
    if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 422 })

    // Demote current primary if we're promoting this contact
    if (parsed.data.isPrimary && !contact.isPrimary) {
      await db
        .update(clientContacts)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(
          and(
            eq(clientContacts.clientId, clientId),
            eq(clientContacts.companyId, companyId),
            eq(clientContacts.isPrimary, true)
          )
        )
    }

    const [updated] = await db
      .update(clientContacts)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(clientContacts.id, contactId), eq(clientContacts.clientId, clientId)))
      .returning({ id: clientContacts.id, firstName: clientContacts.firstName, lastName: clientContacts.lastName, isPrimary: clientContacts.isPrimary })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "crm.contacts.update",
      entityType: "client_contact",
      entityId: contactId,
      payload: parsed.data,
      method: "PATCH",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)

// ── DELETE /api/crm/clients/[id]/contacts/[contactId] ────────────────────────
// Blocks deletion of the only remaining primary contact.

export const DELETE = withGates(
  { action: "crm.clients.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { clientId, contactId } = ids(req)
    const { companyId, userId, sessionId } = ctx.session

    const contact = await resolveContact(clientId, contactId, companyId)
    if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 })

    if (contact.isPrimary) {
      // Count remaining contacts to decide if this is the last one
      const all = await db
        .select({ id: clientContacts.id })
        .from(clientContacts)
        .where(and(eq(clientContacts.clientId, clientId), eq(clientContacts.companyId, companyId)))
      if (all.length === 1)
        return NextResponse.json(
          { error: "Cannot delete the only contact on a client" },
          { status: 409 }
        )
    }

    await db
      .delete(clientContacts)
      .where(and(eq(clientContacts.id, contactId), eq(clientContacts.clientId, clientId)))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "crm.contacts.delete",
      entityType: "client_contact",
      entityId: contactId,
      payload: { clientId, name: `${contact.firstName} ${contact.lastName}` },
      method: "DELETE",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
