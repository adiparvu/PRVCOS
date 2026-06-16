import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { documents, documentSignatures } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function ids(req: NextRequest) {
  const parts = req.nextUrl.pathname.split("/")
  return { docId: parts.at(-3) ?? "", signatureId: parts.at(-1) ?? "" }
}

async function resolveSignature(docId: string, sigId: string, companyId: string) {
  const [doc] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(eq(documents.id, docId), eq(documents.companyId, companyId), isNull(documents.deletedAt))
    )
    .limit(1)
  if (!doc) return null

  const [sig] = await db
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
    .where(
      and(eq(documentSignatures.id, sigId), eq(documentSignatures.documentId, docId))
    )
    .limit(1)
  return sig ?? null
}

// ─── GET /api/documents/[id]/signatures/[signatureId] ────────────────────────

export const GET = withGates(
  { action: "documents.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { docId, signatureId } = ids(req)
    const sig = await resolveSignature(docId, signatureId, ctx.session.companyId)
    if (!sig) return NextResponse.json({ error: "Not found" }, { status: 404 })

    return NextResponse.json({
      signature: {
        id: sig.id,
        signerName: sig.signerName,
        signerEmail: sig.signerEmail,
        signedAt: sig.signedAt?.toISOString() ?? null,
        requestedAt: sig.requestedAt.toISOString(),
        ipAddress: sig.ipAddress ?? null,
        signatureUrl: sig.signatureUrl ?? null,
        userId: sig.userId ?? null,
        signed: sig.signedAt !== null,
      },
    })
  }
)

// ─── PATCH /api/documents/[id]/signatures/[signatureId] ──────────────────────
// Records the actual signature: sets signedAt, signatureUrl, ipAddress.

const patchSchema = z.object({
  signatureUrl: z.string().url().max(2048).optional(),
  ipAddress: z.string().max(45).optional(),
})

export const PATCH = withGates(
  { action: "documents.sign", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { docId, signatureId } = ids(req)
    const { companyId, userId: actorId, sessionId } = ctx.session

    const sig = await resolveSignature(docId, signatureId, companyId)
    if (!sig) return NextResponse.json({ error: "Not found" }, { status: 404 })

    if (sig.signedAt !== null)
      return NextResponse.json(
        { error: "Signature already recorded — cannot modify" },
        { status: 409 }
      )

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )

    const now = new Date()
    const [updated] = await db
      .update(documentSignatures)
      .set({
        signedAt: now,
        ...(parsed.data.signatureUrl !== undefined
          ? { signatureUrl: parsed.data.signatureUrl }
          : {}),
        ...(parsed.data.ipAddress !== undefined ? { ipAddress: parsed.data.ipAddress } : {}),
      })
      .where(
        and(eq(documentSignatures.id, signatureId), eq(documentSignatures.documentId, docId))
      )
      .returning({ id: documentSignatures.id })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "documents.sign",
      entityType: "document",
      entityId: docId,
      payload: {
        signatureId,
        signerEmail: sig.signerEmail,
        signedAt: now.toISOString(),
      },
      method: "PATCH",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: updated?.id, signedAt: now.toISOString() })
  }
)

// ─── DELETE /api/documents/[id]/signatures/[signatureId] ─────────────────────
// Cancels a pending signature request (not yet signed).

export const DELETE = withGates(
  { action: "documents.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { docId, signatureId } = ids(req)
    const { companyId, userId: actorId, sessionId } = ctx.session

    const sig = await resolveSignature(docId, signatureId, companyId)
    if (!sig) return NextResponse.json({ error: "Not found" }, { status: 404 })

    if (sig.signedAt !== null)
      return NextResponse.json(
        { error: "Cannot cancel a signature that has already been recorded" },
        { status: 409 }
      )

    await db
      .delete(documentSignatures)
      .where(
        and(eq(documentSignatures.id, signatureId), eq(documentSignatures.documentId, docId))
      )

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "documents.update",
      entityType: "document",
      entityId: docId,
      payload: { signatureId, signerEmail: sig.signerEmail, cancelled: true },
      method: "DELETE",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
