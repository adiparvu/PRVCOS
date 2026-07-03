import { NextRequest, NextResponse } from "next/server"
import { db } from "@prv/db"
import { documentShares, documentShareAccessLog, documents } from "@prv/db/schema"
import { eq, sql } from "drizzle-orm"
import { isShareUsable, type SharePermission } from "@/lib/document-share"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function token(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-1) ?? ""
}

// GET /api/share/[token] — PUBLIC resolver for an external share link. The
// unguessable token is the credential; a revoked or expired link returns 410.
// Each successful resolution records an access-log entry (no session required).
export async function GET(req: NextRequest): Promise<NextResponse> {
  const t = token(req)
  if (!t) return NextResponse.json({ error: "Missing token" }, { status: 400 })

  const [row] = await db
    .select({
      id: documentShares.id,
      scope: documentShares.scope,
      permission: documentShares.permission,
      passwordProtected: documentShares.passwordProtected,
      expiresAt: documentShares.expiresAt,
      revokedAt: documentShares.revokedAt,
      title: documents.title,
      fileName: documents.fileName,
      mimeType: documents.mimeType,
      fileUrl: documents.fileUrl,
    })
    .from(documentShares)
    .innerJoin(documents, eq(documentShares.documentId, documents.id))
    .where(eq(documentShares.token, t))
    .limit(1)

  if (!row || row.scope !== "external") {
    return NextResponse.json({ error: "Link not found" }, { status: 404 })
  }

  const usable = isShareUsable(
    {
      revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    },
    Date.now()
  )
  if (!usable) {
    return NextResponse.json(
      { error: "This link is no longer active", code: "LINK_INACTIVE" },
      { status: 410 }
    )
  }

  // Record the access (fire-and-forget) and bump counters.
  const ip = req.headers.get("x-forwarded-for") ?? null
  const ua = req.headers.get("user-agent") ?? null
  void db.insert(documentShareAccessLog).values({ shareId: row.id, ipAddress: ip, userAgent: ua })
  void db
    .update(documentShares)
    .set({ accessCount: sql`${documentShares.accessCount} + 1`, lastAccessedAt: new Date() })
    .where(eq(documentShares.id, row.id))

  const permission = row.permission as SharePermission
  const canDownload = permission !== "view"

  return NextResponse.json({
    title: row.title,
    fileName: row.fileName,
    mimeType: row.mimeType,
    permission,
    passwordProtected: row.passwordProtected,
    fileUrl: canDownload ? row.fileUrl : null,
  })
}
