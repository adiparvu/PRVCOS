import { NextRequest, NextResponse } from "next/server"
import { withPortalAuth } from "@/lib/portal-middleware"
import type { PortalSessionContext } from "@/lib/portal-auth"
import { db } from "@prv/db"
import { documents, documentSignatures } from "@prv/db/schema"
import { and, asc, eq, isNull, or } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withPortalAuth(
  async (req: NextRequest, ctx: PortalSessionContext): Promise<NextResponse> => {
    if (!ctx.clientId) {
      return NextResponse.json(
        { error: "No client profile linked to this account" },
        { status: 403 }
      )
    }

    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const [docRows, sigRows] = await Promise.all([
      db
        .select({
          id: documents.id,
          type: documents.type,
          status: documents.status,
          title: documents.title,
          description: documents.description,
          fileName: documents.fileName,
          fileSizeBytes: documents.fileSizeBytes,
          mimeType: documents.mimeType,
          fileUrl: documents.fileUrl,
          isPublic: documents.isPublic,
          expiresAt: documents.expiresAt,
          tags: documents.tags,
          projectId: documents.projectId,
          clientId: documents.clientId,
          createdAt: documents.createdAt,
          updatedAt: documents.updatedAt,
        })
        .from(documents)
        .where(
          and(
            eq(documents.id, id),
            eq(documents.companyId, ctx.companyId),
            isNull(documents.deletedAt),
            or(eq(documents.clientId, ctx.clientId), eq(documents.isPublic, true))
          )
        )
        .limit(1),

      db
        .select({
          id: documentSignatures.id,
          signerName: documentSignatures.signerName,
          signerEmail: documentSignatures.signerEmail,
          signedAt: documentSignatures.signedAt,
          requestedAt: documentSignatures.requestedAt,
          signatureUrl: documentSignatures.signatureUrl,
        })
        .from(documentSignatures)
        .where(eq(documentSignatures.documentId, id))
        .orderBy(asc(documentSignatures.requestedAt)),
    ])

    const row = docRows[0]
    if (!row) return NextResponse.json({ error: "Document not found" }, { status: 404 })

    return NextResponse.json({
      document: {
        id: row.id,
        type: row.type,
        status: row.status,
        title: row.title,
        description: row.description,
        fileName: row.fileName,
        fileSizeBytes: row.fileSizeBytes,
        mimeType: row.mimeType,
        fileUrl: row.fileUrl,
        isPublic: row.isPublic,
        expiresAt: row.expiresAt?.toISOString() ?? null,
        tags: row.tags,
        projectId: row.projectId,
        clientId: row.clientId,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        signatures: sigRows.map((s) => ({
          id: s.id,
          signerName: s.signerName,
          signerEmail: s.signerEmail,
          signedAt: s.signedAt?.toISOString() ?? null,
          requestedAt: s.requestedAt.toISOString(),
          signatureUrl: s.signatureUrl,
        })),
      },
    })
  },
  { portalType: "client" }
)
