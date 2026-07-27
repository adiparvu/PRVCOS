import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { db } from "@prv/db"
import { documents } from "@prv/db/schema"
import { BucketAllowedMimes, StorageBucket, buildStoragePath, uploadFile } from "@prv/db/storage"
import type { PortalSessionContext } from "@/lib/portal-auth"

// Client-initiated document upload (preview approved 2026-07). Real multipart
// into the documents bucket — NOT the staff URL-paste flow. The row lands with
// clientId from the session (that is what surfaces it in the portal list),
// status under_review so staff validate it, uploadedByUserId stays null (the
// uploader is not an internal user) and provenance lives in metadata.

/** Client uploads are business paperwork, not the 500MB bucket ceiling. */
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/plain": "txt",
}

const CLIENT_DOC_TYPES = new Set(["contract", "specification", "other"])

export async function handlePortalDocumentUpload(
  form: FormData,
  ctx: PortalSessionContext
): Promise<NextResponse> {
  if (!ctx.clientId) {
    return NextResponse.json({ error: "No client profile linked to this account" }, { status: 403 })
  }

  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 422 })
  }

  const allowed: readonly string[] = BucketAllowedMimes[StorageBucket.DOCUMENTS]
  const ext = EXT_BY_MIME[file.type]
  if (!allowed.includes(file.type) || !ext) {
    return NextResponse.json(
      { error: "Only PDF, Word, Excel or plain-text files are accepted" },
      { status: 422 }
    )
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File exceeds the 25MB limit" }, { status: 422 })
  }

  const rawType = String(form.get("type") ?? "other")
  const docType = CLIENT_DOC_TYPES.has(rawType) ? rawType : "other"
  const title = (String(form.get("title") ?? "").trim() || file.name).slice(0, 255)

  const path = buildStoragePath(
    ctx.companyId,
    "client-uploads",
    ctx.clientId,
    `${randomUUID()}.${ext}`
  )
  let url: string
  try {
    url = await uploadFile(StorageBucket.DOCUMENTS, path, await file.arrayBuffer(), file.type)
  } catch (err) {
    console.error("[portal.documents.upload] storage failed:", err)
    return NextResponse.json({ error: "Upload failed" }, { status: 502 })
  }

  const [row] = await db
    .insert(documents)
    .values({
      companyId: ctx.companyId,
      clientId: ctx.clientId,
      uploadedByUserId: null,
      title,
      fileUrl: url,
      fileName: file.name.slice(0, 255),
      fileSizeBytes: String(file.size),
      mimeType: file.type,
      type: docType as "contract" | "specification" | "other",
      status: "under_review",
      isPublic: false,
      metadata: {
        uploadedVia: "client_portal",
        portalAccountId: ctx.accountId,
        uploadedByName: ctx.name,
        storagePath: path,
      },
    })
    .returning({ id: documents.id, title: documents.title })

  if (!row) return NextResponse.json({ error: "Insert failed" }, { status: 500 })
  return NextResponse.json({ id: row.id, title: row.title, url }, { status: 201 })
}
