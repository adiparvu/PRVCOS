import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { db } from "@prv/db"
import { BucketAllowedMimes, StorageBucket, buildStoragePath, uploadFile } from "@prv/db/storage"
import { renovationProjects, renovationSiteReports } from "@prv/db/schema"
import { and, eq, sql } from "drizzle-orm"
import { writeAuditLog } from "@prv/auth"
import { withMobileAuth } from "@/lib/mobile/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Attach a photo to a site report (multipart form, field "file"). Online-only
// by design: photos are too large for the AsyncStorage-backed offline queue,
// so the app uploads them only when connected and says so explicitly.

/** Per-photo cap — a phone JPEG, not the 50MB bucket ceiling. */
const MAX_PHOTO_BYTES = 10 * 1024 * 1024
const MAX_PHOTOS_PER_REPORT = 30

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
  const parts = req.nextUrl.pathname.split("/").filter(Boolean)
  const reportId = parts[parts.indexOf("site-reports") + 1] ?? ""
  if (!reportId) return NextResponse.json({ error: "Missing report id" }, { status: 400 })

  // The report must belong to a renovation project of THIS company — the
  // company scope comes from the join, never from client input.
  const [report] = await db
    .select({ id: renovationSiteReports.id, photos: renovationSiteReports.photos })
    .from(renovationSiteReports)
    .innerJoin(renovationProjects, eq(renovationSiteReports.projectId, renovationProjects.id))
    .where(
      and(eq(renovationSiteReports.id, reportId), eq(renovationProjects.companyId, ctx.companyId))
    )
    .limit(1)
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 })

  const existing = (Array.isArray(report.photos) ? (report.photos as unknown[]) : []).filter(
    (u): u is string => typeof u === "string"
  )
  if (existing.length >= MAX_PHOTOS_PER_REPORT) {
    return NextResponse.json(
      { error: `A report holds at most ${MAX_PHOTOS_PER_REPORT} photos` },
      { status: 422 }
    )
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 })
  }
  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 422 })
  }

  const allowed: readonly string[] = BucketAllowedMimes[StorageBucket.IMAGES]
  const ext = EXT_BY_MIME[file.type]
  if (!allowed.includes(file.type) || !ext) {
    return NextResponse.json({ error: `Unsupported image type: ${file.type}` }, { status: 422 })
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "Photo exceeds the 10MB limit" }, { status: 422 })
  }

  const path = buildStoragePath(ctx.companyId, "site-reports", reportId, `${randomUUID()}.${ext}`)
  let url: string
  try {
    url = await uploadFile(StorageBucket.IMAGES, path, await file.arrayBuffer(), file.type)
  } catch (err) {
    console.error("[mobile.site-report.photos] upload failed:", err)
    return NextResponse.json({ error: "Upload failed" }, { status: 502 })
  }

  // Atomic jsonb append — two photos uploaded in parallel must both survive.
  await db
    .update(renovationSiteReports)
    .set({
      photos: sql`${renovationSiteReports.photos} || ${JSON.stringify([url])}::jsonb`,
      updatedAt: new Date(),
    })
    .where(eq(renovationSiteReports.id, reportId))

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "mobile.renovation.site_report.photo_add",
    entityType: "renovation_site_report",
    entityId: reportId,
    method: "POST",
    path: req.nextUrl.pathname,
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
    userAgent: req.headers.get("user-agent") ?? "",
    payload: { url, size: file.size, type: file.type },
  })

  return NextResponse.json({ url }, { status: 201 })
})
