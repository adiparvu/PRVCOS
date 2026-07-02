import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { employeeDocuments } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const ISO = /^\d{4}-\d{2}-\d{2}$/

function id(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-1) ?? ""
}

// PATCH supports edits plus the verification workflow: verify / reject / renew.
const patchSchema = z
  .object({
    action: z.enum(["verify", "reject", "renew"]).optional(),
    title: z.string().min(1).max(160).optional(),
    reference: z.string().max(120).nullable().optional(),
    issuedDate: z.string().regex(ISO).nullable().optional(),
    expiryDate: z.string().regex(ISO).nullable().optional(),
    notes: z.string().max(5000).nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" })

export const PATCH = withGates(
  { action: "hr.compliance.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rowId = id(req)
    if (!rowId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId: actorId, sessionId } = ctx.session

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const d = parsed.data

    const patch: Record<string, unknown> = { updatedAt: new Date() }
    if (d.title !== undefined) patch.title = d.title
    if (d.reference !== undefined) patch.reference = d.reference
    if (d.issuedDate !== undefined) patch.issuedDate = d.issuedDate
    if (d.expiryDate !== undefined) patch.expiryDate = d.expiryDate
    if (d.notes !== undefined) patch.notes = d.notes

    if (d.action === "verify") {
      patch.status = "verified"
      patch.verifiedByUserId = actorId
      patch.verifiedAt = new Date()
    }
    if (d.action === "reject") {
      patch.status = "rejected"
      patch.verifiedByUserId = actorId
      patch.verifiedAt = new Date()
    }
    // A renewal resets the document to pending re-verification (a new expiry
    // date is typically supplied alongside).
    if (d.action === "renew") {
      patch.status = "pending"
      patch.verifiedByUserId = null
      patch.verifiedAt = null
    }

    const [updated] = await db
      .update(employeeDocuments)
      .set(patch)
      .where(and(eq(employeeDocuments.id, rowId), eq(employeeDocuments.companyId, companyId)))
      .returning({ id: employeeDocuments.id, status: employeeDocuments.status })

    if (!updated) return NextResponse.json({ error: "Document not found" }, { status: 404 })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: d.action ? `hr.compliance.${d.action}` : "hr.compliance.update",
      entityType: "employee_document",
      entityId: rowId,
      payload: { ...d },
      method: "PATCH",
      path: `/api/compliance/documents/${rowId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: updated.id, status: updated.status })
  }
)

export const DELETE = withGates(
  { action: "hr.compliance.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rowId = id(req)
    if (!rowId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId: actorId, sessionId } = ctx.session

    const deleted = await db
      .delete(employeeDocuments)
      .where(and(eq(employeeDocuments.id, rowId), eq(employeeDocuments.companyId, companyId)))
      .returning({ id: employeeDocuments.id })

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "hr.compliance.delete",
      entityType: "employee_document",
      entityId: rowId,
      payload: { id: rowId },
      method: "DELETE",
      path: `/api/compliance/documents/${rowId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ removed: deleted.length })
  }
)
