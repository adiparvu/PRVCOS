import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { documents, documentVersions, users } from "@prv/db/schema"
import { and, desc, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import {
  canMutateVersions,
  liveFromUpload,
  snapshotFromLive,
  type LiveFile,
} from "@/lib/document-versions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface DocumentVersionEntry {
  id: string | null // null for the live row (it lives on the documents table)
  version: number
  current: boolean
  fileName: string
  fileUrl: string
  sizeLabel: string
  mimeType: string | null
  changeNote: string | null
  uploadedBy: string | null
  createdAt: string
}

function fmtSize(bytes: string | null): string {
  if (!bytes) return "—"
  const n = Number(bytes)
  if (isNaN(n)) return bytes
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(1)} MB`
  if (n >= 1_024) return `${(n / 1_024).toFixed(0)} KB`
  return `${n} B`
}

function versionsPathId(req: NextRequest): string {
  const parts = req.nextUrl.pathname.split("/")
  const i = parts.indexOf("documents")
  return i >= 0 ? (parts[i + 1] ?? "") : ""
}

async function loadLiveDoc(id: string, companyId: string) {
  const [row] = await db
    .select({
      id: documents.id,
      title: documents.title,
      fileUrl: documents.fileUrl,
      fileName: documents.fileName,
      fileSizeBytes: documents.fileSizeBytes,
      mimeType: documents.mimeType,
      versionNumber: documents.versionNumber,
      legalHold: documents.legalHold,
      uploadedByUserId: documents.uploadedByUserId,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .where(
      and(eq(documents.id, id), eq(documents.companyId, companyId), isNull(documents.deletedAt))
    )
    .limit(1)
  return row ?? null
}

// ─── GET /api/documents/[id]/versions ─────────────────────────────────────────
// Full version history: the live file (from the documents row) plus every prior
// file snapshotted in document_versions, newest first.
export const GET = withGates(
  { action: "documents.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const id = versionsPathId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const live = await loadLiveDoc(id, companyId)
    if (!live) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const [liveAuthor] = live.uploadedByUserId
      ? await db
          .select({ firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(eq(users.id, live.uploadedByUserId))
          .limit(1)
      : []

    const history = await db
      .select({
        id: documentVersions.id,
        version: documentVersions.version,
        fileName: documentVersions.fileName,
        fileUrl: documentVersions.fileUrl,
        fileSizeBytes: documentVersions.fileSizeBytes,
        mimeType: documentVersions.mimeType,
        changeNote: documentVersions.changeNote,
        createdAt: documentVersions.createdAt,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(documentVersions)
      .leftJoin(users, eq(documentVersions.uploadedByUserId, users.id))
      .where(and(eq(documentVersions.documentId, id), eq(documentVersions.companyId, companyId)))
      .orderBy(desc(documentVersions.version))

    const liveName =
      liveAuthor?.firstName && liveAuthor?.lastName
        ? `${liveAuthor.firstName} ${liveAuthor.lastName}`
        : null

    const entries: DocumentVersionEntry[] = [
      {
        id: null,
        version: live.versionNumber,
        current: true,
        fileName: live.fileName,
        fileUrl: live.fileUrl,
        sizeLabel: fmtSize(live.fileSizeBytes),
        mimeType: live.mimeType,
        changeNote: null,
        uploadedBy: liveName,
        createdAt: live.updatedAt.toISOString(),
      },
      ...history.map((h) => ({
        id: h.id,
        version: h.version,
        current: false,
        fileName: h.fileName,
        fileUrl: h.fileUrl,
        sizeLabel: fmtSize(h.fileSizeBytes),
        mimeType: h.mimeType,
        changeNote: h.changeNote,
        uploadedBy: h.firstName && h.lastName ? `${h.firstName} ${h.lastName}` : null,
        createdAt: h.createdAt.toISOString(),
      })),
    ]

    return NextResponse.json({ versions: entries })
  }
)

// ─── POST /api/documents/[id]/versions ────────────────────────────────────────
// Replace the live file with a new upload, snapshotting the current file into
// history first so nothing is lost.
const uploadSchema = z.object({
  fileUrl: z.string().min(1),
  fileName: z.string().min(1).max(500),
  fileSizeBytes: z.string().max(20).nullable().optional(),
  mimeType: z.string().max(100).nullable().optional(),
  changeNote: z.string().max(2000).nullable().optional(),
})

export const POST = withGates(
  { action: "documents.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = versionsPathId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
    const parsed = uploadSchema.safeParse(raw)
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )

    const live = await loadLiveDoc(id, companyId)
    if (!live) return NextResponse.json({ error: "Not found" }, { status: 404 })

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
      changeNote: parsed.data.changeNote ?? null,
    })

    const nextLive = liveFromUpload(liveFile, {
      fileUrl: parsed.data.fileUrl,
      fileName: parsed.data.fileName,
      fileSizeBytes: parsed.data.fileSizeBytes ?? null,
      mimeType: parsed.data.mimeType ?? null,
    })

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
      action: "documents.version.create",
      entityType: "document",
      entityId: id,
      payload: {
        title: live.title,
        supersededVersion: snap.version,
        newVersion: nextLive.versionNumber,
        fileName: nextLive.fileName,
      },
      method: "POST",
      path: `/api/documents/${id}/versions`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated, { status: 201 })
  }
)
