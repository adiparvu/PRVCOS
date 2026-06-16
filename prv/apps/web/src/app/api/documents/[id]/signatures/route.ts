import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { documents, documentSignatures } from "@prv/db/schema"
import { and, asc, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function docId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-2) ?? ""
}

async function verifyDocument(id: string, companyId: string) {
  const [doc] = await db
    .select({ id: documents.id, status: documents.status, title: documents.title })
    .from(documents)
    .where(
      and(eq(documents.id, id), eq(documents.companyId, companyId), isNull(documents.deletedAt))
    )
    .limit(1)
  return doc ?? null
}

// ─── GET /api/documents/[id]/signatures ──────────────────────────────────────

export const GET = withGates(
  { action: "documents.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = docId(req)
    const { companyId } = ctx.session

    if (!(await verifyDocument(id, companyId)))
      return NextResponse.json({ error: "Document not found" }, { status: 404 })

    const rows = await db
      .select({
        id: documentSignatures.id,
        signerName: documentSignatures.signerName,
        signerEmail: documentSignatures.signerEmail,
        signedAt: documentSignatures.signedAt,
        requestedAt: documentSignatures.requestedAt,
        ipAddress: documentSignatures.ipAddress,
        signatureUrl: documentSignatures.signatureUrl,
        userId: documentSignatures.userId,
      })
      .from(documentSignatures)
      .where(eq(documentSignatures.documentId, id))
      .orderBy(asc(documentSignatures.requestedAt))

    return NextResponse.json({
      signatures: rows.map((r) => ({
        id: r.id,
        signerName: r.signerName,
        signerEmail: r.signerEmail,
        signedAt: r.signedAt?.toISOString() ?? null,
        requestedAt: r.requestedAt.toISOString(),
        ipAddress: r.ipAddress ?? null,
        signatureUrl: r.signatureUrl ?? null,
        userId: r.userId ?? null,
        signed: r.signedAt !== null,
      })),
    })
  }
)

// ─── POST /api/documents/[id]/signatures ─────────────────────────────────────
// Requests a signature from an external or internal signer.

const postSchema = z.object({
  signerName: z.string().min(1).max(255),
  signerEmail: z.string().email().max(254),
  userId: z.string().uuid().optional(),
})

export const POST = withGates(
  { action: "documents.sign", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = docId(req)
    const { companyId, userId: actorId, sessionId } = ctx.session

    const doc = await verifyDocument(id, companyId)
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 })

    if (doc.status === "archived")
      return NextResponse.json(
        { error: "Cannot request signatures on an archived document" },
        { status: 409 }
      )

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = postSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )

    const [sig] = await db
      .insert(documentSignatures)
      .values({
        documentId: id,
        companyId,
        signerName: parsed.data.signerName,
        signerEmail: parsed.data.signerEmail,
        userId: parsed.data.userId ?? null,
        requestedAt: new Date(),
      })
      .returning({ id: documentSignatures.id })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "documents.sign",
      entityType: "document",
      entityId: id,
      payload: {
        signatureId: sig.id,
        signerEmail: parsed.data.signerEmail,
        documentTitle: doc.title,
      },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: sig.id }, { status: 201 })
  }
)
