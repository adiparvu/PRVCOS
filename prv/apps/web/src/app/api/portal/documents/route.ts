import { NextRequest, NextResponse } from "next/server"
import { withPortalAuth } from "@/lib/portal-middleware"
import type { PortalSessionContext } from "@/lib/portal-auth"
import { db } from "@prv/db"
import { documents } from "@prv/db/schema"
import { and, desc, eq, isNull, lt, or } from "drizzle-orm"

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

    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type")
    const cursor = searchParams.get("cursor")
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100)

    // Portal clients can see: documents directly linked to them OR public docs for this company
    const conditions = [
      eq(documents.companyId, ctx.companyId),
      isNull(documents.deletedAt),
      or(eq(documents.clientId, ctx.clientId), eq(documents.isPublic, true)),
    ]

    if (type) {
      conditions.push(eq(documents.type, type as typeof documents.type._.data))
    }
    if (cursor) conditions.push(lt(documents.createdAt, new Date(cursor)))

    const rows = await db
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
        projectId: documents.projectId,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .where(and(...conditions))
      .orderBy(desc(documents.createdAt))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const items = hasMore ? rows.slice(0, limit) : rows
    const nextCursor =
      hasMore && items.length > 0 ? items[items.length - 1]!.createdAt.toISOString() : null

    const data = items.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      title: r.title,
      description: r.description,
      fileName: r.fileName,
      fileSizeBytes: r.fileSizeBytes,
      mimeType: r.mimeType,
      fileUrl: r.fileUrl,
      isPublic: r.isPublic,
      expiresAt: r.expiresAt?.toISOString() ?? null,
      projectId: r.projectId,
    }))

    return NextResponse.json({ documents: data, count: data.length, nextCursor })
  },
  { portalType: "client" }
)
