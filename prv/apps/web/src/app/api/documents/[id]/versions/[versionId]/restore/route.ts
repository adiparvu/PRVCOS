import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { documents, documentVersions } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import {
  canMutateVersions,
  liveFromRestore,
  snapshotFromLive,
  type LiveFile,
} from "@/lib/document-versions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// pathname: /api/documents/<id>/versions/<versionId>/restore
function parseIds(req: NextRequest): { id: string; versionId: string } {
  const parts = req.nextUrl.pathname.split("/")
  const di = parts.indexOf("documents")
  const vi = parts.indexOf("versions")
  return {
    id: di >= 0 ? (parts[di + 1] ?? "") : "",
    versionId: vi >= 0 ? (parts[vi + 1] ?? "") : "",
  }
}

// ─── POST /api/documents/[id]/versions/[versionId]/restore ─────────────────────
// Promote a historical version's file back to live under a NEW version number,
// snapshotting the current live file first. The old number is never reused.
export const POST = withGates(
  { action: "documents.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const { id, versionId } = parseIds(req)
    if (!id || !versionId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const [live] = await db
      .select({
        id: documents.id,
        title: documents.title,
        fileUrl: documents.fileUrl,
        fileName: documents.fileName,
        fileSizeBytes: documents.fileSizeBytes,
        mimeType: documents.mimeType,
        versionNumber: documents.versionNumber,
        legalHold: documents.legalHold,
      })
      .from(documents)
      .where(
        and(eq(documents.id, id), eq(documents.companyId, companyId), isNull(documents.deletedAt))
      )
      .limit(1)

    if (!live) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const [chosen] = await db
      .select({
        version: documentVersions.version,
        fileUrl: documentVersions.fileUrl,
        fileName: documentVersions.fileName,
        fileSizeBytes: documentVersions.fileSizeBytes,
        mimeType: documentVersions.mimeType,
      })
      .from(documentVersions)
      .where(
        and(
          eq(documentVersions.id, versionId),
          eq(documentVersions.documentId, id),
          eq(documentVersions.companyId, companyId)
        )
      )
      .limit(1)

    if (!chosen) return NextResponse.json({ error: "Version not found" }, { status: 404 })

    const liveFile: LiveFile = {
      versionNumber: live.versionNumber,
      fileUrl: live.fileUrl,
      fileName: live.fileName,
      fileSizeBytes: live.fileSizeBytes,
      mimeType: live.mimeType,
      legalHold: live.legalHold,
    }

    const gate = canMutateVersions(liveFile)
    if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 409 })

    // Snapshot the current live file so restoring never loses it.
    const snap = snapshotFromLive(liveFile)
    await db.insert(documentVersions).values({
      documentId: id,
      companyId,
      uploadedByUserId: userId,
      version: snap.version,
      fileUrl: snap.fileUrl,
      fileName: snap.fileName,
      fileSizeBytes: snap.fileSizeBytes,
      mimeType: snap.mimeType,
      changeNote: `Restored v${chosen.version}`,
    })

    const nextLive = liveFromRestore(liveFile, chosen)
    const [updated] = await db
      .update(documents)
      .set({
        fileUrl: nextLive.fileUrl,
        fileName: nextLive.fileName,
        fileSizeBytes: nextLive.fileSizeBytes,
        mimeType: nextLive.mimeType,
        versionNumber: nextLive.versionNumber,
        uploadedByUserId: userId,
        updatedAt: new Date(),
      })
      .where(and(eq(documents.id, id), eq(documents.companyId, companyId)))
      .returning({ id: documents.id, versionNumber: documents.versionNumber })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "documents.version.restore",
      entityType: "document",
      entityId: id,
      payload: {
        title: live.title,
        restoredFromVersion: chosen.version,
        newVersion: nextLive.versionNumber,
      },
      method: "POST",
      path: `/api/documents/${id}/versions/${versionId}/restore`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)
